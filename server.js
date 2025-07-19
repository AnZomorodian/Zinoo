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

// Socket.IO connection handling with better error handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Add error handler for this socket
  socket.on('error', (error) => {
    console.error('Socket error for', socket.id, ':', error);
  });

  // Handle session verification for refresh
  socket.on('verify_session', async (data) => {
    try {
      const { token, userData } = data;
      
      if (userData && userData.username) {
        const user = await storage.getUserByUsername(userData.username);
        
        if (user) {
          // Update user online status
          await storage.updateUserOnlineStatus(user.id, true);
          
          // Store mappings
          socketToUser.set(socket.id, user);
          userToSocket.set(user.id, socket.id);

          // Send session verification success
          socket.emit('session_verified', {
            id: user.id,
            userId: user.userId,
            lyCode: user.lyCode,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            bio: user.bio,
            status: user.status || 'online',
            avatarColor: user.avatarColor,
            profilePicture: user.profilePicture || 'default'
          });

          // Send recent messages
          const recentMessages = await storage.getRecentMessages(50);
          const formattedMessages = recentMessages.map(msg => ({
            id: msg.id,
            username: msg.user.displayName || msg.user.username,
            message: msg.message,
            timestamp: msg.timestamp.toISOString(),
            userId: msg.user.id,
            displayName: msg.user.displayName,
            avatarColor: msg.user.avatarColor
          }));
          
          socket.emit('message_history', formattedMessages);
          
          // Send updated user list
          await broadcastUserList();
          
          console.log(`Session verified for: ${user.username}`);
        } else {
          socket.emit('session_invalid');
        }
      } else {
        socket.emit('session_invalid');
      }
    } catch (error) {
      console.error('Session verification error:', error);
      socket.emit('session_invalid');
    }
  });

  // Handle user authentication
  socket.on('authenticate', async (authData) => {
    try {
      if (!authData || !authData.emailOrUsername || !authData.password) {
        socket.emit('auth_error', 'Email/username and password are required');
        return;
      }
      
      const sanitizedEmailOrUsername = authData.emailOrUsername.trim().toLowerCase();
      
      // Authenticate user
      const user = await storage.authenticateUser(sanitizedEmailOrUsername, authData.password);
      if (!user) {
        socket.emit('auth_error', 'Invalid email/username or password');
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
        userId: user.userId,
        lyCode: user.lyCode,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        status: user.status || 'online',
        avatarColor: user.avatarColor,
        profilePicture: user.profilePicture || 'default'
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
      
      if (existingCheck.usernameExists && existingCheck.emailExists) {
        socket.emit('auth_error', 'Both username and email are already taken. Please choose different ones.');
        return;
      }
      
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
        userId: user.userId,
        lyCode: user.lyCode,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        status: user.status || 'online',
        avatarColor: user.avatarColor,
        profilePicture: user.profilePicture || 'default'
      });

      // Send welcome message
      socket.emit('message_history', []);
      
      // Broadcast user joined
      socket.broadcast.emit('user_joined', user.displayName || user.username);
      
      // Send updated user list
      await broadcastUserList();
    } catch (error) {
      console.error('Error in register handler:', error);
      socket.emit('auth_error', 'Registration failed. Please try again.');
    }
  });

  // Handle user search
  socket.on('search_user', async (data) => {
    try {
      const user = socketToUser.get(socket.id);
      if (!user || !data.userId) return;

      const foundUser = await storage.findUserByUserId(data.userId);
      
      if (foundUser && foundUser.status !== 'invisible') {
        socket.emit('user_search_result', {
          found: true,
          user: {
            userId: foundUser.userId,
            username: foundUser.username,
            displayName: foundUser.displayName,
            avatarColor: foundUser.avatarColor
          }
        });
      } else {
        socket.emit('user_search_result', { found: false });
      }
    } catch (error) {
      console.error('Error in search_user handler:', error);
      socket.emit('user_search_result', { found: false });
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

      // Add reply information if present
      if (data.replyTo) {
        message.replyTo = {
          id: data.replyTo.id,
          username: data.replyTo.username,
          message: data.replyTo.message
        };
      }

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

  // Handle get users request
  socket.on('get_users', async () => {
    await broadcastUserList();
  });

  // Handle profile updates
  socket.on('update_profile', async (profileData) => {
    try {
      const user = socketToUser.get(socket.id);
      if (!user) return;

      const updateData = {
        displayName: profileData.displayName?.trim()?.substring(0, 100),
        bio: profileData.bio?.trim()?.substring(0, 300),
        status: profileData.status || 'online',
        avatarColor: profileData.avatarColor,
        profilePicture: profileData.profilePicture || 'default'
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      const updatedUser = await storage.updateUserProfile(user.id, updateData);

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
        profilePicture: updatedUser.profilePicture,
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
        // Don't update user offline status immediately - keep them online for a short period
        // This helps with page refreshes and quick reconnections
        setTimeout(async () => {
          // Check if user has reconnected in another socket
          const isUserStillConnected = Array.from(socketToUser.values()).some(u => u.id === user.id);
          if (!isUserStillConnected) {
            // Update user offline status only if they haven't reconnected
            await storage.updateUserOnlineStatus(user.id, false);
            // Broadcast user left
            io.emit('user_left', user.displayName || user.username);
            // Send updated user list
            await broadcastUserList();
          }
        }, 5000); // 5 second grace period for reconnection
        
        // Clean up mappings immediately
        socketToUser.delete(socket.id);
        userToSocket.delete(user.id);
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
    // Get users from socket connections and recent database users
    const socketUsers = Array.from(socketToUser.values())
      .filter(user => user.status !== 'invisible')
      .reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

    // Also get recently active users from database (within last 30 seconds)
    const recentUsers = await storage.getRecentlyActiveUsers(30);
    
    // Combine socket users with recently active users
    const allOnlineUsers = [];
    const processedUserIds = new Set();
    
    // Add socket-connected users first
    for (const user of Object.values(socketUsers)) {
      allOnlineUsers.push({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        status: user.status || 'online',
        avatarColor: user.avatarColor,
        profilePicture: user.profilePicture || 'default',
        userId: user.userId,
        isOnline: true
      });
      processedUserIds.add(user.id);
    }
    
    // Add recently active users who aren't already in the list
    for (const user of recentUsers) {
      if (!processedUserIds.has(user.id) && user.status !== 'invisible') {
        allOnlineUsers.push({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          bio: user.bio,
          status: user.status || 'online',
          avatarColor: user.avatarColor,
          profilePicture: user.profilePicture || 'default',
          userId: user.userId,
          isOnline: true
        });
      }
    }
    
    io.emit('users_update', allOnlineUsers);
    console.log(`Broadcasting ${allOnlineUsers.length} online users`);
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