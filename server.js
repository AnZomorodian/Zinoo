const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

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

// Store active users and messages
const activeUsers = new Map();
const messages = [];

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

  // Handle user joining
  socket.on('join', (username) => {
    if (!username || username.trim() === '') return;
    
    const sanitizedUsername = username.trim().substring(0, 50);
    activeUsers.set(socket.id, {
      id: socket.id,
      username: sanitizedUsername,
      joinedAt: new Date().toISOString()
    });

    // Send recent messages to new user
    socket.emit('message_history', messages.slice(-50));
    
    // Broadcast user joined
    socket.broadcast.emit('user_joined', sanitizedUsername);
    
    // Send updated user list
    io.emit('users_update', Array.from(activeUsers.values()));
  });

  // Handle new messages
  socket.on('send_message', (data) => {
    const user = activeUsers.get(socket.id);
    if (!user || !data.message || data.message.trim() === '') return;

    const message = {
      id: uuidv4(),
      username: user.username,
      message: data.message.trim().substring(0, 500),
      timestamp: new Date().toISOString(),
      userId: socket.id
    };

    messages.push(message);
    
    // Keep only last 100 messages
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }

    // Broadcast message to all users
    io.emit('new_message', message);
  });

  // Handle user typing
  socket.on('typing', (isTyping) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    socket.broadcast.emit('user_typing', {
      username: user.username,
      isTyping: isTyping
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      socket.broadcast.emit('user_left', user.username);
      io.emit('users_update', Array.from(activeUsers.values()));
    }
    console.log('User disconnected:', socket.id);
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    activeUsers: activeUsers.size,
    totalMessages: messages.length
  });
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