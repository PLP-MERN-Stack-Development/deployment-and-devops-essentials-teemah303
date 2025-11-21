const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Allow all origins in production, specific in development
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://realtimecommunication.netlify.app",  // Netlify URL
      "https://real-time-communication-with-socket-io-3can.onrender.com"  // Render URL
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
// Store online users and message history
const onlineUsers = new Map();
const messageHistory = [];

// Add welcome messages
messageHistory.push(
  {
    username: 'System',
    message: 'Welcome to the chat! 👋',
    time: new Date().toLocaleTimeString(),
    system: true,
    messageId: Date.now() - 2000
  }
);

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Handle user joining
  socket.on('user_join', (username) => {
    onlineUsers.set(socket.id, username);
    console.log(`👋 ${username} joined the chat`);
    
    // Send message history to the newly connected user
    socket.emit('message_history', messageHistory);
    
    // Broadcast to all users that someone joined
    io.emit('user_joined', username);
    
    // Send updated online users list
    io.emit('online_users', Array.from(onlineUsers.values()));
  });

  // Handle incoming messages
  socket.on('send_message', (data) => {
    console.log('📨 Message received:', data);
    
    const messageData = {
      ...data,
      id: socket.id,
      time: new Date().toLocaleTimeString(),
      messageId: Date.now(),
      system: false
    };
    
    // Save message to history
    messageHistory.push(messageData);
    
    // Keep only last 200 messages
    if (messageHistory.length > 200) {
      messageHistory.shift();
    }
    
    // Broadcast to all connected clients
    io.emit('receive_message', messageData);
  });

  // Handle typing indicators
  socket.on('typing_start', (username) => {
    socket.broadcast.emit('user_typing', username);
  });

  socket.on('typing_stop', (username) => {
    socket.broadcast.emit('user_stopped_typing', username);
  });

  // Handle request for message history
  socket.on('request_message_history', () => {
    socket.emit('message_history', messageHistory);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = onlineUsers.get(socket.id);
    if (username) {
      onlineUsers.delete(socket.id);
      console.log(`👋 ${username} left the chat`);
      
      io.emit('user_left', username);
      io.emit('online_users', Array.from(onlineUsers.values()));
    }
    console.log('❌ User disconnected:', socket.id);
  });
});

// Render uses process.env.PORT, so we need to use that
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💾 Message persistence enabled`);
});
