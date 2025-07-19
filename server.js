const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { storage } = require('./server/storage.js');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://replit.app', 'https://*.replit.app']
      : true,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Store socket ID to user mapping
const socketToUser = new Map();
const userToSocket = new Map();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Socket.IO
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
    },
  },
}));

// CORS configuration for security
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://replit.app', 'https://*.replit.app']
    : true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user authentication
  socket.on('authenticate', async (authData) => {
    try {
      if (!authData || !authData.email || !authData.password) {
        socket.emit('auth_error', 'Email and password are required');
        return;
      }
      
      const sanitizedEmail = authData.email.trim().toLowerCase();
      
      // Authenticate user
      const user = await storage.authenticateUser(sanitizedEmail, authData.password);
      if (!user) {
        socket.emit('auth_error', 'Invalid email or password');
        return;
      }
      
      // Update user online status
      await storage.updateUserOnlineStatus(user.id, true);
      
      // Store mappings
      socketToUser.set(socket.id, user);
      userToSocket.set(user.id, socket.id);

      // Send authentication success
      socket.emit('auth_success', {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        status: user.status || 'online',
        avatarColor: user.avatarColor
      });

      // Send recent messages to authenticated user
      const recentMessages = await storage.getRecentMessages(50);
      const formattedMessages = recentMessages.map(msg => ({
        id: msg.id,
        username: msg.user.displayName || msg.user.username,
        message: msg.message,
        timestamp: msg.timestamp.toISOString(),
        userId: msg.user.id
      }));
      
      socket.emit('message_history', formattedMessages);
      
      // Broadcast user joined
      socket.broadcast.emit('user_joined', user.displayName || user.username);
      
      // Send updated user list
      await broadcastUserList();
    } catch (error) {
      console.error('Error in authenticate handler:', error);
      socket.emit('auth_error', 'Authentication failed');
    }
  });

  // Handle user registration
  socket.on('register', async (userData) => {
    try {
      if (!userData || !userData.username || !userData.email || !userData.password) {
        socket.emit('auth_error', 'Username, email, and password are required');
        return;
      }
      
      if (userData.password.length < 6) {
        socket.emit('auth_error', 'Password must be at least 6 characters long');
        return;
      }
      
      const sanitizedUsername = userData.username.trim().substring(0, 50);
      const sanitizedEmail = userData.email.trim().toLowerCase();
      const sanitizedDisplayName = userData.displayName ? userData.displayName.trim().substring(0, 100) : sanitizedUsername;
      
      // Check if user already exists
      const existingCheck = await storage.checkUserExists(sanitizedUsername, sanitizedEmail);
      
      if (existingCheck.usernameExists) {
        socket.emit('auth_error', 'Username already taken. Please choose a different one.');
        return;
      }
      
      if (existingCheck.emailExists) {
        socket.emit('auth_error', 'Email already registered. Please use a different email.');
        return;
      }
      
      // Create new user
      const user = await storage.createUser({
        username: sanitizedUsername,
        email: sanitizedEmail,
        password: userData.password,
        displayName: sanitizedDisplayName,
        isOnline: true
      });

      // Store mappings
      socketToUser.set(socket.id, user);
      userToSocket.set(user.id, socket.id);

      // Send registration success
      socket.emit('auth_success', {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        status: user.status || 'online',
        avatarColor: user.avatarColor
      });

      // Send welcome message
      socket.emit('message_history', []);
      
      // Broadcast user joined
      socket.broadcast.emit('user_joined', user.displayName || user.username);
      
      // Send updated user list
      await broadcastUserList();
    } catch (error) {
      console.error('Error in register handler:', error);
      socket.emit('auth_error', 'Registration failed');
    }
  });

  // Handle new messages
  socket.on('send_message', async (data) => {
    try {
      const user = socketToUser.get(socket.id);
      if (!user || !data.message || data.message.trim() === '') return;

      const trimmedMessage = data.message.trim().substring(0, 500);
      
      // Save message to database
      const savedMessage = await storage.createMessage({
        userId: user.id,
        message: trimmedMessage
      });

      // Update user's last seen
      await storage.updateUserLastSeen(user.id);

      // Format message for broadcast
      const message = {
        id: savedMessage.id,
        username: user.displayName || user.username,
        message: savedMessage.message,
        timestamp: savedMessage.timestamp.toISOString(),
        userId: user.id
      };

      // Broadcast message to all users
      io.emit('new_message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Handle user typing
  socket.on('typing', (isTyping) => {
    const user = socketToUser.get(socket.id);
    if (!user) return;

    socket.broadcast.emit('user_typing', {
      username: user.displayName || user.username,
      isTyping: isTyping
    });
  });

  // Handle profile updates
  socket.on('update_profile', async (profileData) => {
    try {
      const user = socketToUser.get(socket.id);
      if (!user) return;

      const updatedUser = await storage.updateUserProfile(user.id, {
        displayName: profileData.displayName?.trim().substring(0, 100),
        bio: profileData.bio?.trim().substring(0, 200),
        status: profileData.status || 'online',
        avatarColor: profileData.avatarColor
      });

      // Update the stored user data
      socketToUser.set(socket.id, updatedUser);
      userToSocket.set(user.id, socket.id);

      // Add to profile history
      const historyItem = await storage.addProfileHistory(user.id, 'Profile updated', 'Display name, bio, status, or avatar color changed');
      
      // Confirm update to the user
      socket.emit('profile_updated', {
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        status: updatedUser.status,
        avatarColor: updatedUser.avatarColor,
        historyItem: historyItem
      });

      // Broadcast updated user list
      await broadcastUserList();
    } catch (error) {
      console.error('Error updating profile:', error);
      socket.emit('error', 'Failed to update profile');
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      const user = socketToUser.get(socket.id);
      if (user) {
        // Update user offline status
        await storage.updateUserOnlineStatus(user.id, false);
        
        // Clean up mappings
        socketToUser.delete(socket.id);
        userToSocket.delete(user.id);
        
        // Broadcast user left
        socket.broadcast.emit('user_left', user.displayName || user.username);
        
        // Send updated user list
        await broadcastUserList();
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to broadcast user list
async function broadcastUserList() {
  try {
    const onlineUsers = Array.from(socketToUser.values()).map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      status: user.status || 'online',
      avatarColor: user.avatarColor,
      isOnline: true
    }));
    io.emit('users_update', onlineUsers);
  } catch (error) {
    console.error('Error broadcasting user list:', error);
  }
}

// API routes
app.get('/api/health', async (req, res) => {
  try {
    const messageCount = await storage.getMessageCount();
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      activeUsers: socketToUser.size,
      totalMessages: messageCount,
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      activeUsers: socketToUser.size,
      database: 'error',
      error: error.message
    });
  }
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Messenger server running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };