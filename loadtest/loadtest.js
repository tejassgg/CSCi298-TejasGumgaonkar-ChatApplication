const autocannon = require('autocannon');
const { io } = require('socket.io-client');
const os = require('os-utils'); // Library to get CPU usage

// Configure test parameters
const TEST_DURATION = 10; // seconds
const CONNECTIONS = 100;
const SERVER_URL = 'http://localhost:3000';

// Message templates to simulate real chat messages
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

// Track connected clients
const clients = new Set();
let startTime = Date.now();

// Variables to store CPU usage
let cpuUsageAt20 = 0;
let cpuUsageAt50 = 0;
let cpuUsageAt75 = 0;
let cpuUsageAt100 = 0;

// Function to get CPU usage at specific intervals
function getCpuUsageInterval(interval) {
  os.cpuUsage((v) => {
    switch (interval) {
      case 20:
        cpuUsageAt20 = v;
        break;
      case 50:
        cpuUsageAt50 = v;
        break;
      case 75:
        cpuUsageAt75 = v;
        break;
      case 100:
        cpuUsageAt100 = v;
        break;
      default:
        break;
    }
  });
}

// Create WebSocket clients and connect them
function createClients() {
  console.log(`Creating ${CONNECTIONS} socket connections...`);

  for (let i = 0; i < CONNECTIONS; i++) {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: false
    });

    socket.on('connect', () => {
      // Join chat with a username
      socket.emit('join', `TestUser${i}`);
      clients.add(socket);

      if (clients.size === CONNECTIONS) { 
        console.log('All clients connected! Starting message bombardment...');
        startTime = Date.now();
        startMessageBombardment();
      }

    });

    socket.on('connect_error', (err) => {
      console.error(`Client ${i} connection error:`, err);
    });
  }
}

// Send messages from random clients at random intervals
function startMessageBombardment() {
  let messagesSent = 0;

  const interval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const percentageElapsed = (elapsed / TEST_DURATION) * 100;

    if (percentageElapsed >= 20 && cpuUsageAt20 === 0) {
      getCpuUsageInterval(20);
    } else if (percentageElapsed >= 50 && cpuUsageAt50 === 0) {
      getCpuUsageInterval(50);
    } else if (percentageElapsed >= 75 && cpuUsageAt75 === 0) {
      getCpuUsageInterval(75);
    }

    if (elapsed >= TEST_DURATION) {
      clearInterval(interval);
      getCpuUsageInterval(100);
      console.log(`Test completed! Sent ${messagesSent} messages in ${elapsed} seconds`);
      console.log(`Average messages per second: ${(messagesSent / TEST_DURATION).toFixed(2)}`);
      console.log(`Number of Clients Connected: ${Array.from(clients).length}`)
      console.log(`CPU Usage at 20%: ${cpuUsageAt20}`);
      console.log(`CPU Usage at 50%: ${cpuUsageAt50}`);
      console.log(`CPU Usage at 75%: ${cpuUsageAt75}`);
      console.log(`CPU Usage at 100%: ${cpuUsageAt100}`);
      disconnectClients();
      return;
    }

    // Select random clients to send messages
    const activeClients = Array.from(clients);
    const numMessagesThisBatch = Math.floor(Math.random() * 50) + 1; // 1-50 messages per batch

    for (let i = 0; i < numMessagesThisBatch; i++) {
      const randomClient = activeClients[Math.floor(Math.random() * activeClients.length)];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      if (randomClient && randomClient.connected) {
        randomClient.emit('chatMessage', randomMessage);
        messagesSent++;
      }
    }

  }, 5); // Send batch of messages every 5ms
}

// Disconnect all clients
function disconnectClients() {
  console.log('Disconnecting clients...');
  clients.forEach(socket => socket.disconnect());
  clients.clear();
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  disconnectClients();
});

// Start the load test
console.log(`Starting load test with ${CONNECTIONS} connections for ${TEST_DURATION} seconds`);
createClients();