const express = require('express');
const { MongoClient } = require('mongodb');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const MONGO_URL = 'mongodb+srv://tejassgg1:XjJ1Sn4ioNMnXOvZ@chat-application.cno8l.mongodb.net/?retryWrites=true&w=majority&appName=Chat-Application';
const DB_NAME = 'chatapp';

let db;

app.use(express.json());

MongoClient.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');
  })
  .catch(error => console.error(error));

// Setup Socket.IO
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
  socket.on('chatMessage', (msg) => {
    console.log('message: ' + msg);
  });
});

// API endpoint for load testing
app.post('/loadtest', async (req, res) => {
  const { numUsers, duration } = req.body;

  // Delete all users where username is not 'tejassgg', 'system', or 'admin'
  await db.collection('users').deleteMany({
    username: { $nin: ['tejassgg', 'system', 'admin'] }
  });
  console.log('Deleted users where username is not "tejassgg", "system", or "admin"');

  // Generate users
  for (let i = 0; i < numUsers; i++) {
    const username = `TestUser${i}`;
    await db.collection('users').insertOne({ username });
  }
  console.log(`Generated ${numUsers} users`);

  // Simulate message sending
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;

    if (elapsed >= duration) {
      clearInterval(interval);
      console.log('Load test completed');
      res.send('Load test completed');
      return;
    }

    for (let i = 0; i < numUsers; i++) {
      const randomMessage = `Message from TestUser${i}`;
      io.emit('chatMessage', randomMessage);
    }
  }, 1000);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});