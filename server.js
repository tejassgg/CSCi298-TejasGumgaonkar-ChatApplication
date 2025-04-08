// Modified server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');

// Import models
const User = require('./models/User');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');

// Import file upload utility
const upload = require('./utils/fileUpload');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000, // Increase the timeout to 30 seconds
      socketTimeoutMS: 45000, // Increase the socket timeout to 45 seconds
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(-1);
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
let users = [];
let generalRoom = null;

// Create default chat room if it doesn't exist
const createDefaultRoom = async () => {
  try {
    generalRoom = await ChatRoom.findOne({ name: 'General' });
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
      generalRoom = new ChatRoom({
        name: 'General',
        description: 'Public Chat Room For Everyone',
        isPrivate: false,
        createdBy: systemUser._id
      });
      await generalRoom.save();
      console.log('Default chat room created');
    }
  } catch (error) {
    console.error('Error creating default room:', error);
  }
};

createDefaultRoom();

// Simple file upload endpoint for media
app.post('/api/upload', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract necessary data from the request
    const filePath = `/uploads/${req.file.filename}`;
    // Save the file inside the uploads folder
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const fileDest = path.join(uploadDir, req.file.filename);
    fs.rename(req.file.path, fileDest, (err) => {
      if (err) {
        console.error('Error saving file:', err);
        return res.status(500).json({ message: 'Error saving file' });
      }
    });

    res.json({
      success: true,
      filePath,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
    });

    // Asynchronously write details to a log file
    const logData = `File uploaded: ${req.file.originalname} at ${new Date().toLocaleString()}\n`;
    fs.writeFile('upload_log.txt', logData, { flag: 'a' }, (err) => {
      if (err) {
        console.error('Error writing to log file:', err);
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// New API endpoint to create n users
app.post('/api/create-users', async (req, res) => {
  try {
    const { numUsers } = req.body;

    if (!numUsers) {
      return res.status(400).json({ message: 'numUsers is required' });
    }

    if (!generalRoom) {
      return res.status(500).json({ message: 'General chat room not found' });
    }

    // Delete all users except 'tejassgg', 'admin', and 'system'
    await User.deleteMany({
      username: { $nin: ['tejassgg', 'admin', 'system'] }
    });
    console.log('All Users deleted');

    console.log('Creating users...');

    // Create users
    for (let i = 0; i < numUsers; i++) {
      const username = `testuser${i}`;
      let user = await User.findOne({ username });

      if (!user) {
        user = new User({
          username,
          status: 'online'
        });
        await user.save();
      } else {
        user.status = 'online';
        user.lastActive = Date.now();
        await user.save();
      }

      users.push(user);
    }

    res.json({ success: true, message: `${numUsers} users created`, users, generalRoom });

  } catch (error) {
    console.error('Error in create-users endpoint:', error);
    res.status(500).json({ message: 'Error in create-users endpoint' });
  }
});

// New API endpoint to save messages
app.post('/api/save-message', async (req, res) => {
  try {
    const { chatRoomId, senderId, messageType, text, mediaUrl, fileName, fileSize } = req.body;

    const newMessage = new Message({
      chatRoom: chatRoomId,
      sender: senderId,
      messageType,
      text,
      mediaUrl,
      fileName,
      fileSize
    });

    const msg = await newMessage.save();

    if (msg) {
      const retrMsg = await Message.findByPk(msg.id);
      if (retrMsg) {
        res.json({
          success: true,
          message: newMessage
        });
      }
    }
    else {
      res.json({
        success: false,
        message: newMessage
      });
    }

  } catch (error) {
    console.error('Error in save-message endpoint:', error);
    res.status(500).json({ message: 'Error saving message' });
  }
});

// New API endpoint to get the number of messages in the collection
app.get('/api/message-count', async (req, res) => {
  try {
    const messageCount = await Message.countDocuments({});
    res.json({ success: true, count: messageCount });
  } catch (error) {
    console.error('Error fetching message count:', error);
    res.status(500).json({ message: 'Error fetching message count' });
  }
});

// New API endpoint to get a list of users based on the number of users passed
app.get('/api/get-users', async (req, res) => {
  try {
    let { numUsers } = req.query;

    if (!numUsers) {
      return res.status(400).json({ message: 'numUsers query parameter is required' });
    }

    await Message.deleteMany({});
    console.log('All messages deleted');

    numUsers = parseInt(numUsers);

    const users = await User.find({});
    if (users.length < numUsers) {

      const data = { numUsers: numUsers }; // Data to send in the request body

      axios.post('http://localhost:3000/api/create-users', data, { // Replace with your actual endpoint
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => {
          if (response.data.success) {
            res.json({ success: true, users: response.data.users, generalRoom });
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
    }
    else {
      const usersList = await User.find().limit(parseInt(numUsers));
      res.json({ success: true, users: usersList, generalRoom });
    }

  } catch (error) {
    console.error('Error in get-users endpoint:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  let currentUser = null;
  let currentRoom = null;

  // Handle user joining
  socket.on('join', async (username) => {
    try {
      process.nextTick(async () => {
        let user = await User.findOne({ username });

        if (!user) {
          user = new User({
            username,
            status: 'online'
          });
          await user.save();
        } else {
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

        // console.log(`${username} user connected`);
      });
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

      const msg = await newMessage.save();

      if (msg) {
        const retrMsg = await Message.findById(msg._id);
        if (retrMsg) {
          // Format message for client
          const messageData = {
            _id: newMessage._id,
            username: currentUser.username,
            text: message,
            timestamp: new Date().toLocaleTimeString()
          };

          // Broadcast message to room
          io.to(currentRoom.toString()).emit('message', messageData);
        }
      }
      else {
       console.log('Message not saved in database');
      }

      // // Format message for client
      // const messageData = {
      //   _id: newMessage._id,
      //   username: currentUser.username,
      //   text: message,
      //   timestamp: new Date().toLocaleTimeString()
      // };

      // // Broadcast message to room
      // io.to(currentRoom.toString()).emit('message', messageData);
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
        mediaUrl: mediaUrl,
        fileName: fileName,
        fileSize: fileSize
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

  // Handle user logout
  socket.on('logout', async (username) => {
    try {
      // Find the user in the database
      const user = await User.findOne({ username });
      if (!user) return;

      // Delete all messages sent by the user
      await Message.deleteMany({ sender: user._id });

      // Delete the user from the database
      await User.deleteOne({ _id: user._id });

      // Remove from active users
      activeUsers.delete(socket.id);

      // Notify all clients
      io.emit('userLeft', username);

      // Update user list
      const userList = Array.from(activeUsers.values()).map(u => u.username);
      io.emit('userList', userList);

      // Notify the user about successful logout
      socket.emit('logoutSuccess');

      console.log(`${username} user logged out and deleted`);
    } catch (error) {
      console.error('Error in logout event:', error);
    }
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

        // console.log(`${currentUser.username} user disconnected`);
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