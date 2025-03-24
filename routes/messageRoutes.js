// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../utils/fileUpload');
const Message = require('../models/Message');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');

// GET messages for a specific chat room
router.get('/chatroom/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    
    // Query parameters
    const query = { chatRoom: roomId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    // Get messages with pagination
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('sender', 'username avatar')
      .lean();
    
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST a new text message
router.post('/text', async (req, res) => {
  try {
    const { chatRoomId, senderId, text } = req.body;
    
    if (!chatRoomId || !senderId || !text) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Verify that user and chat room exist
    const [user, chatRoom] = await Promise.all([
      User.findById(senderId),
      ChatRoom.findById(chatRoomId)
    ]);
    
    if (!user || !chatRoom) {
      return res.status(404).json({ message: 'User or chat room not found' });
    }
    
    // Create and save new message
    const newMessage = new Message({
      chatRoom: chatRoomId,
      sender: senderId,
      messageType: 'text',
      text: text
    });
    
    await newMessage.save();
    
    // Populate sender information
    await newMessage.populate('sender', 'username avatar');
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST a new media message (image, video, file)
router.post('/media', upload.single('media'), async (req, res) => {
  try {
    const { chatRoomId, senderId, messageType } = req.body;
    const file = req.file;
    
    if (!file || !chatRoomId || !senderId || !messageType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Verify that user and chat room exist
    const [user, chatRoom] = await Promise.all([
      User.findById(senderId),
      ChatRoom.findById(chatRoomId)
    ]);
    
    if (!user || !chatRoom) {
      return res.status(404).json({ message: 'User or chat room not found' });
    }
    
    // Calculate file path for storage
    const mediaUrl = `/${file.path.replace(/\\/g, '/')}`;
    
    // Create and save new message
    const newMessage = new Message({
      chatRoom: chatRoomId,
      sender: senderId,
      messageType,
      mediaUrl,
      fileName: file.originalname,
      fileSize: file.size
    });
    
    await newMessage.save();
    
    // Populate sender information
    await newMessage.populate('sender', 'username avatar');
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating media message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body; // For verification

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user is the sender (basic permission check)
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    // If message has media, delete the file
    if (['image', 'video', 'file'].includes(message.messageType) && message.mediaUrl) {
      const filePath = path.join(__dirname, '..', message.mediaUrl.substring(1));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await Message.findByIdAndDelete(messageId);
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;