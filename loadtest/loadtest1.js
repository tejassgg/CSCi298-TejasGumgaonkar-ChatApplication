const { MongoClient } = require('mongodb');
const { io } = require('socket.io-client');
const autocannon = require('autocannon');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const CONNECTIONS = parseInt(process.argv[2], 10) || 1000;
const TEST_DURATION = parseInt(process.argv[3], 10) || 10; // seconds
const SERVER_URL = 'http://localhost:3000';
const MONGO_URL = process.env.MONGODB_URI;
const DB_NAME = 'test';
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
  'This is a message with a 🤖 emoji'
];

let clients = [];
let db;

async function setup() {
  // Connect to MongoDB
  const client = new MongoClient(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  db = client.db(DB_NAME);

  // Delete all users where username is not 'tejassgg', 'system', or 'admin'
  await db.collection('users').deleteMany({
    username: { $nin: ['tejassgg', 'system', 'admin'] }
  });
  console.log('Deleted users where username is not "tejassgg", "system", or "admin"');

  await db.collection('messages').deleteMany({});
  console.log('Database cleaned up before starting the test');

  let connectedClients = 0;

  for (let i = 0; i < CONNECTIONS; i++) {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: false
    });

    socket.on('connect', () => {
      socket.emit('join', `TestUser${i}`);
      clients.push(socket);

      if (++connectedClients === CONNECTIONS) {
        startMessageBombardment();
      }
    });

    socket.on('connect_error', (err) => {
      assert.fail(`Client ${i} connection error: ${err.message}`);
    });
  }
}

function startMessageBombardment() {
  let messagesSent = 0;
  let startTime = Date.now();

  clients.forEach((socket, index) => {
    socket.on('chatMessage', (msg) => {
      messagesSent++;
    });
  });

  const interval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;

    if (elapsed >= TEST_DURATION) {
      clearInterval(interval);
      console.log(`Test completed! Sent ${messagesSent} messages in ${elapsed} seconds`);
      runAutocannon();
      return;
    }

    clients.forEach((socket) => {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      if (socket.connected) {
        socket.emit('chatMessage', randomMessage);
      }
    });
  }, 5);
}

function runAutocannon() {
  const resultFilePath = path.join(__dirname, 'perf_results', `autocannon_results.json`);
  autocannon({
    url: SERVER_URL,
    connections: CONNECTIONS,
    duration: TEST_DURATION,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    setupClient: (client) => {
      client.on('body', (body) => {
        console.log(`Received body: ${body}`);
      });
    }
  }, (err, result) => {
    if (err) {
      console.error('Autocannon encountered an error:', err);
    } else {
      console.log('Autocannon results:', result);
      fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2));
      console.log(`Results saved to ${resultFilePath}`);
      cleanup();
    }
  });
}

async function cleanup() {
  clients.forEach((socket) => socket.disconnect());
  clients = [];
}

setup().catch(console.error);