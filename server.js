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
const crypto = require('crypto'); // For generating unique file names
const mime = require('mime-types');

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

const messages = [
  'Hello from user!',
  'How is everyone doing?',
  'Testing the chat system',
  'This is a test message',
  'Load testing in progress',
  'I am getting a response',
  'I am doing good. How about you?',
  'This is a long message that should be split into multiple packets',
  'This is a message with a 🚀 emoji',
  'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa nisl malesuada lacinia integer nunc posuere ut hendrerit semper vel class aptent taciti sociosqu ad litora torquent per conubia nostra inceptos himenaeos orci varius natoque penatibus et magnis dis parturient montes nascetur ridiculus mus donec rhoncus eros lobortis nulla molestie mattis scelerisque maximus eget fermentum odio phasellus non purus est efficitur laoreet mauris pharetra vestibulum fusce dictum risus blandit quis suspendisse aliquet nisi sodales consequat magna ante condimentum neque at luctus nibh finibus facilisis dapibus etiam interdum tortor ligula congue sollicitudin erat viverra ac tincidunt nam porta elementum a enim euismod quam justo lectus commodo augue arcu dignissim velit aliquam imperdiet mollis nullam volutpat porttitor ullamcorper rutrum gravida cras eleifend turpis fames primis vulputate ornare sagittis vehicula praesent dui felis venenatis ultrices proin libero feugiat tristique accumsan maecenas potenti ultricies habitant morbi senectus netus suscipit auctor curabitur facilisi cubilia curae hac habitasse platea dictumst lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa nisl malesuada lacinia integer nunc posuere ut hendrerit semper vel class aptent taciti sociosqu ad litora torquent per conubia nostra inceptos himenaeos orci varius natoque penatibus et magnis dis parturient montes nascetur ridiculus mus donec rhoncus eros lobortis nulla molestie mattis scelerisque maximus eget fermentum odio phasellus non purus est efficitur laoreet mauris pharetra vestibulum fusce dictum risus blandit quis suspendisse aliquet nisi sodales consequat magna ante condimentum neque at luctus nibh.',
  `Chocolate gingerbread sesame snaps cheesecake marshmallow. Gingerbread halvah lollipop cake bear claw pastry. Pie tiramisu jelly caramels caramels bear claw brownie.
  Lemon drops fruitcake fruitcake dessert jujubes pastry chocolate sweet roll. Gummi bears fruitcake chocolate donut lemon drops soufflé jelly beans. Marshmallow marzipan jujubes icing cotton candy.
  Cotton candy cupcake lemon drops bonbon jelly topping sugar plum. Bonbon cotton candy brownie lollipop tootsie roll biscuit sweet sesame snaps marshmallow. Powder chocolate bar dragée muffin wafer dessert.
  Carrot cake cookie pastry chupa chups liquorice cookie halvah gummi bears oat cake. Biscuit brownie ice cream pie wafer oat cake lemon drops. Bear claw sweet roll jelly beans lemon drops gummi bears marshmallow dragée powder. Donut sugar plum sweet roll caramels jelly-o.
  Tootsie roll macaroon icing cheesecake marzipan. Tart sesame snaps bonbon halvah cake marzipan shortbread jujubes. Candy canes dessert biscuit icing dessert tootsie roll cupcake cupcake.`,
  `Carrot cake chocolate cake shortbread macaroon marzipan pastry cupcake dragée bear claw. Gingerbread dessert shortbread topping toffee. Wafer cookie sweet roll tootsie roll cheesecake pie cake jelly beans. Chocolate bar ice cream cupcake croissant macaroon marzipan chocolate. Pudding dessert lemon drops dragée tootsie roll. Soufflé soufflé cotton candy muffin soufflé bear claw. Tootsie roll chocolate cake gingerbread topping wafer pudding sweet sugar plum. Topping chocolate cake pudding chocolate cake candy canes dessert. Jujubes chocolate bar powder candy canes biscuit soufflé cheesecake biscuit. Croissant halvah candy liquorice wafer soufflé cheesecake.
  Jujubes sweet roll danish oat cake carrot cake. Brownie soufflé tart tiramisu soufflé chocolate bar wafer tart. Cheesecake bonbon bonbon ice cream soufflé caramels shortbread sweet. Jelly-o sesame snaps sweet sweet roll danish sweet chupa chups. Jelly-o caramels tootsie roll bear claw ice cream. Cheesecake pudding cake jelly beans cookie dragée chocolate. Soufflé macaroon sugar plum fruitcake chocolate biscuit cheesecake. Sugar plum jujubes gummi bears marshmallow cheesecake. Cheesecake topping macaroon candy liquorice oat cake. Powder powder chupa chups jelly pastry marshmallow.
  Gummi bears gummi bears jelly beans chocolate jujubes cake pastry. Gingerbread marshmallow marshmallow soufflé dragée pastry shortbread. Topping cake tootsie roll cake dessert lollipop. Jelly-o cotton candy topping cake jelly brownie biscuit. Pudding marzipan marshmallow muffin candy candy. Sugar plum danish marzipan cookie jelly chocolate cake chocolate. Muffin pastry candy pie jelly beans jelly apple pie cake. Cotton candy apple pie biscuit jelly beans jelly beans gingerbread sesame snaps candy canes.
  Cotton candy macaroon cheesecake chocolate cake bear claw wafer donut. Sesame snaps bear claw gingerbread chupa chups dragée liquorice brownie lemon drops. Sweet marshmallow powder muffin chupa chups jelly-o jelly pie jelly. Biscuit tootsie roll wafer caramels cheesecake. Gingerbread jelly-o gummies liquorice topping bear claw. Oat cake jelly-o candy canes powder halvah marshmallow. Lemon drops toffee candy cotton candy gummi bears. Gummi bears bonbon cookie halvah tiramisu chocolate bar biscuit chupa chups.
  Chocolate bar shortbread fruitcake chocolate jujubes cake pastry macaroon gummies. Gummies cake fruitcake croissant croissant marshmallow lemon drops sweet roll liquorice. Shortbread gingerbread cupcake gummies jujubes candy jelly dragée. Marshmallow donut pie cotton candy powder tootsie roll bear claw. Brownie cake cookie pudding chupa chups. Sesame snaps gummies cookie ice cream tiramisu gingerbread powder biscuit jelly.`
];

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

const usersFromDB = [];
async function loadUsersFromDB() {
  try {
    const users = await User.find({});
    usersFromDB.push(...users);
  } catch (error) {
    console.error('Error loading users from DB:', error);
  }
}
loadUsersFromDB();

const SERVER_URL = 'http://localhost:3000';

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

    // Asynchronously write details to a log file
    const logData = `File uploaded: ${req.file.originalname} at ${new Date().toLocaleString()}\n`;
    fs.writeFile('upload_log.txt', logData, { flag: 'a' }, (err) => {
      if (err) {
        console.error('Error writing to log file:', err);
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ message: 'Error uploading file' });
  }

  return res.json({
    success: true,
    filePath,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileType: req.file.mimetype,
  });

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
        totalCounter++;
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

// New API endpoint to select a random user and send a random file
let messageCounter = 0;

// Path to the images and uploads folders
const imagesFolder = './images';
const uploadsFolder = './uploads';

// Ensure the uploads folder exists
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}

// Cached file list
let fileList = [];

// Load files from the ./images folder at server start
const loadFilesFromFolder = (folderPath) => {
  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        return reject(err);
      }
      resolve(files.map(file => path.join(folderPath, file)));
    });
  });
};

// Preload files from the images folder
loadFilesFromFolder(imagesFolder)
  .then(files => {
    fileList = files;
    console.log('Files loaded successfully.');
  })
  .catch(err => {
    console.error('Error loading files from folder:', err);
  });

// Function to determine file type
const getFileType = (fileExtension) => {
  // const fileTypeHeader = `application/${fileExtension}`; // Simulated MIME type
  const fileTypeHeader = fileExtension;
  if (fileTypeHeader.startsWith('image/')) {
    return 'image';
  } else if (fileTypeHeader.startsWith('video/')) {
    return 'video';
  } else if (fileTypeHeader.startsWith('audio/')) {
    return 'audio';
  } else if (fileTypeHeader.startsWith('application/')) {
    return 'file';
  } else {
    return 'other';
  }
};

// Endpoint to send a random file
app.post('/api/send-random-file', async (req, res) => {
  if (fileList.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No files available in the images folder',
    });
  }

  // Select a random file
  const randomFile = fileList[Math.floor(Math.random() * fileList.length)];
  const originalFilePath = randomFile;

  try {
    // Get file stats
    const stats = fs.statSync(originalFilePath);

    // Determine the file type
    const fileType = getFileType(mime.lookup(originalFilePath));

    // Generate a unique file name and move the file to the uploads folder
    const uniqueFileName = `media_${Date.now()}${path.extname(randomFile)}`;
    const newFilePath = path.join(uploadsFolder, uniqueFileName);

    fs.copyFileSync(originalFilePath, newFilePath); // Copy the file to the uploads folder
    // fs.unlinkSync(originalFilePath); // Optionally, delete the original file (comment this line if you don't want to delete it)

    const fileSize = stats.size;

    return res.json({
      success: true,
      message: {
        mediaUrl: newFilePath, // New file path in the uploads folder
        mediaType: fileType,
        fileName: uniqueFileName,
        fileSize: fileSize,
      },
      type: 'upload',
    });
  } catch (error) {
    console.error('Error processing the file:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing the file',
    });
  }
});

// New API endpoint to select a random user and send a random message
app.get('/api/send-random-message', async (req, res) => {
  try {
    if (usersFromDB.length === 0) {
      return res.status(400).json({ message: 'No users found' });
    }
    // const randomUser = usersFromDB[Math.floor(Math.random() * usersFromDB.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    messageCounter++;
    return res.json({ success: true, message: randomMessage, type: 'text' });

  } catch (error) {
    console.error('Error in send-random-message endpoint:', error);
    res.status(500).json({ message: 'Error sending random message' });
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

      // currentUser = usersFromDB[Math.floor(Math.random() * usersFromDB.length)];

      // console.log('User Name: ', currentUser.username);

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

      // currentUser = usersFromDB[Math.floor(Math.random() * usersFromDB.length)];

      // console.log('User Name: ', currentUser.username);

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
