const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { PerformanceObserver, performance } = require('perf_hooks');
const { io } = require('socket.io-client');
require('dotenv').config();

// const { sendRandomMessage } = require('../server1.js');

const Message = require('../models/Message');

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

function getRandomMessage() {
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
}

const SERVER_URL = 'http://localhost:3000';

let clients = [];

async function createUsers(numUsers) {
    try {
        const response = await fetch(`${SERVER_URL}/api/create-users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ numUsers })
        });

        if (!response.ok) {
            throw new Error(`Failed to create users: ${response.statusText}`);
        }

        const { users, generalRoom } = await response.json();

        console.log(`${users.length} users created`);

        // Connect users to the chatroom
        for (const user of users) {
            const socket = io(SERVER_URL, {
                transports: ['websocket'],
                reconnection: false
            });

            socket.on('connect', () => {
                socket.emit('join', user.username);
                clients.push(socket);
            });

            socket.on('connect_error', (err) => {
                assert.fail(`Client ${user.username} connection error: ${err.message}`);
            });

        }

        return { users, generalRoom };

    } catch (error) {
        console.error('Error in createUsers:', error);
    }
}

async function sendRandomMessage(users, currentRoomId) {
    try {
        if (!users.length || !currentRoomId) {
            return res.status(400).json({ message: 'No users or chat room found' });
        }

        for (let i = 0; i < users.length; i++) {
            // Call the new save-message endpoint
            const response = await fetch(`${SERVER_URL}/api/save-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatRoomId: currentRoomId,
                    senderId: users[i]._id,
                    messageType: 'text',
                    text: getRandomMessage()
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to save message: ${response.statusText}`);
            }

            const { message } = await response.json();

            // console.log('Message sent:', message);

            // Format message for client
            const messageData = {
                _id: message._id,
                username: users[i].username,
                text: message.text,
                timestamp: new Date().toLocaleTimeString()
            };

            clients[i].emit('chatMessage', messageData.text);
        }

    } catch (error) {
        console.error('Error in sendRandomMessage endpoint:', error);
    }
}

async function main() {
    try {
        const numUsers = 10; // Adjust the number of users as needed
        const { users, generalRoom } = await createUsers(numUsers);
        const resultsDir = path.join(__dirname, '../perf_results');

        // Measure CPU execution time for specific durations
        const duration = 5000; // Total duration in milliseconds (e.g., 10 seconds)
        const intervals = [0.05, 0.10, 0.25, 0.50, 0.75, 1.00];
        const times = [];
        let messagesSent = 0;
        let cpuUsageAt25 = 0;
        let cpuUsageAt50 = 0;
        let cpuUsageAt75 = 0;
        let cpuUsageAt100 = 0;
        const TEST_DURATION = duration / 1000; // In seconds
        const startTime = performance.now();

        const currentRoomId = generalRoom._id;
        console.log('Broadcasting message to room: ', currentRoomId);

        // for (let i = 0; i < 2; i++) {
        //     sendRandomMessage(users, currentRoomId);
        //     messagesSent++;
        // }

        // process.exit(-1);

        for (const interval of intervals) {
            const intervalTime = interval * duration;
            const intervalStartTime = performance.now();

            const endTime = intervalStartTime + intervalTime;
            while (performance.now() < endTime) {
                sendRandomMessage(users, currentRoomId);
                messagesSent++;
            }

            const cpuTime = performance.now() - intervalStartTime;
            times.push({ percentage: interval * 100, cpuTime });

            if (interval === 0.25) cpuUsageAt25 = cpuTime;
            if (interval === 0.50) cpuUsageAt50 = cpuTime;
            if (interval === 0.75) cpuUsageAt75 = cpuTime;
            if (interval === 1.00) cpuUsageAt100 = cpuTime;
        }

        const elapsed = (performance.now() - startTime) / 1000; // In seconds

        console.log(`Test completed! Sent ${messagesSent} messages in ${elapsed} seconds`);
        console.log(`Average messages per second: ${(messagesSent / TEST_DURATION).toFixed(2)}`);
        console.log(`Number of Clients Connected: ${Array.from(users).length}`);
        console.log(`CPU Usage at 25%: ${cpuUsageAt25}`);
        console.log(`CPU Usage at 50%: ${cpuUsageAt50}`);
        console.log(`CPU Usage at 75%: ${cpuUsageAt75}`);
        console.log(`CPU Usage at 100%: ${cpuUsageAt100}`);

        // Store CPU times inside cpu_times.json
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir);
        }

        const cpuTimesFile = path.join(resultsDir, 'cpu_times.json');
        const testDetails = {
            messagesSent,
            elapsed,
            averageMessagesPerSecond: (messagesSent / TEST_DURATION).toFixed(2),
            clientsConnected: Array.from(users).length,
            cpuUsageAt25,
            cpuUsageAt50,
            cpuUsageAt75,
            cpuUsageAt100
        };
        const dataToStore = {
            testDetails,
            times
        };
        fs.writeFileSync(cpuTimesFile, JSON.stringify(dataToStore, null, 2));
    }
    catch (error) {
        console.error('Error in main:', error);
    }
}

main();