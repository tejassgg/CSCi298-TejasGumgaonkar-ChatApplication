// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import models
const User = require('./models/User');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');

// Import file upload utility
const upload = require('./utils/fileUpload');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-application';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In-memory storage for active users
const activeUsers = new Map();

// Create default chat room if it doesn't exist
const createDefaultRoom = async () => {
  try {
    const generalRoom = await ChatRoom.findOne({ name: 'General' });
    if (!generalRoom) {
      // Create a system user if not exists
      let systemUser = await User.findOne({ username: 'System' });
      if (!systemUser) {
        systemUser = new User({
          username: 'System',
          status: 'online'
        });
        await systemUser.save();
      }
      
      // Create general room
      const newRoom = new ChatRoom({
        name: 'General',
        description: 'Public chat room for everyone',
        isPrivate: false,
        createdBy: systemUser._id
      });
      await newRoom.save();
      console.log('Default chat room created');
    }
  } catch (error) {
    console.error('Error creating default room:', error);
  }
};

createDefaultRoom();

// Simple file upload endpoint for media
app.post('/api/upload', upload.single('media'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Return the file path
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      filePath, 
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype 
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  let currentUser = null;
  let currentRoom = null;
  
  // Handle user joining
  socket.on('join', async (username) => {
    try {
      // Find or create user - simplified with no password
      let user = await User.findOne({ username });
      
      if (!user) {
        user = new User({
          username,
          status: 'online'
        });
        await user.save();
      } else {
        // Update user status
        user.status = 'online';
        user.lastActive = Date.now();
        await user.save();
      }
      
      currentUser = user;
      
      // Find default room
      const defaultRoom = await ChatRoom.findOne({ name: 'General' });
      currentRoom = defaultRoom._id;
      
      // Join socket room
      socket.join(defaultRoom._id.toString());
      
      // Store user in active users map
      activeUsers.set(socket.id, {
        userId: user._id,
        username: user.username,
        roomId: defaultRoom._id
      });
      
      // Notify all clients about the new user
      io.emit('userJoined', user.username);
      
      // Send current user list to all clients
      const userList = Array.from(activeUsers.values()).map(u => u.username);
      io.emit('userList', userList);
      
      // Send last 50 messages to the new user
      const messages = await Message.find({ chatRoom: defaultRoom._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('sender', 'username')
        .lean();
        
      socket.emit('previousMessages', messages.reverse());
      
      console.log(`${username} user connected`);
    } catch (error) {
      console.error('Error in join event:', error);
    }
  });

  // Handle chat messages
  socket.on('chatMessage', async (message) => {
    try {
      if (!currentUser || !currentRoom) return;
      
      // Create new message in database
      const newMessage = new Message({
        chatRoom: currentRoom,
        sender: currentUser._id,
        messageType: 'text',
        text: message
      });
      
      await newMessage.save();
      
      // Format message for client
      const messageData = {
        _id: newMessage._id,
        username: currentUser.username,
        text: message,
        timestamp: new Date().toLocaleTimeString()
      };
      
      // Broadcast message to room
      io.to(currentRoom.toString()).emit('message', messageData);
    } catch (error) {
      console.error('Error in chatMessage event:', error);
    }
  });

  // Handle media message
  socket.on('mediaMessage', async (data) => {
    try {
      if (!currentUser || !currentRoom) return;
      
      const { mediaUrl, mediaType, fileName, fileSize } = data;
      
      // Create new media message in database
      const newMessage = new Message({
        chatRoom: currentRoom,
        sender: currentUser._id,
        messageType: mediaType,
        mediaUrl,
        fileName,
        fileSize
      });
      
      await newMessage.save();
      
      // Format message for client
      const messageData = {
        _id: newMessage._id,
        username: currentUser.username,
        mediaUrl,
        mediaType,
        fileName,
        fileSize,
        timestamp: new Date().toLocaleTimeString()
      };
      
      // Broadcast message to room
      io.to(currentRoom.toString()).emit('mediaMessage', messageData);
    } catch (error) {
      console.error('Error in mediaMessage event:', error);
    }
  });

  // Handle typing indicator
  socket.on('typing', () => {
    if (!currentUser) return;
    
    socket.broadcast.to(currentRoom.toString()).emit('userTyping', currentUser.username);
  });

  // Handle user disconnect
  socket.on('disconnect', async () => {
    try {
      if (currentUser) {
        // Update user status
        currentUser.status = 'offline';
        currentUser.lastActive = Date.now();
        await currentUser.save();
        
        // Remove from active users
        activeUsers.delete(socket.id);
        
        // Notify all clients
        io.emit('userLeft', currentUser.username);
        
        // Update user list
        const userList = Array.from(activeUsers.values()).map(u => u.username);
        io.emit('userList', userList);
        
        console.log(`${currentUser.username} user disconnected`);
      }
    } catch (error) {
      console.error('Error in disconnect event:', error);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});