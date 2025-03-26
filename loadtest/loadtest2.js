const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { PerformanceObserver, performance } = require('perf_hooks');
const { io } = require('socket.io-client');
require('dotenv').config();

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

            socket.emit('join', user.username);

            // socket.on('connect', () => {
            //     console.log(`${user.username} connected to chatroom`);
            // });

            // socket.on('disconnect', () => {
            //     console.log(`${user.username} disconnected from chatroom`);
            // });
        }

        return { users, generalRoom };

    } catch (error) {
        console.error('Error in createUsers:', error);
    }
}

async function sendRandomMessage(users, generalRoom) {
    try {
        if (!users.length || !generalRoom) {
            return res.status(400).json({ message: 'No users or chat room found' });
        }

        const randomUser = users[Math.floor(Math.random() * users.length)];

        const newMessage = new Message({
            chatRoom: generalRoom._id,
            sender: randomUser._id,
            messageType: 'text',
            text: getRandomMessage()
        });

        await newMessage.save();

        // Emit the message to the General chat room
        const messageData = {
            _id: newMessage._id,
            username: randomUser.username,
            text: newMessage.text,
            timestamp: new Date().toLocaleTimeString()
        };

        io.to(generalRoom._id.toString()).emit('message', messageData);

    } catch (error) {
        console.error('Error in sendRandomMessage endpoint:', error);
    }
}

async function main() {
    try {
        const numUsers = 100; // Adjust the number of users as needed
        const { users, generalRoom } = await createUsers(numUsers);
        const resultsDir = path.join(__dirname, '../perf_results');

        // Measure CPU execution time for specific durations
        const duration = 10000; // Total duration in milliseconds (e.g., 10 seconds)
        const intervals = [0.05, 0.10, 0.25, 0.50, 0.75, 1.00];
        const times = [];
        var counter =0;

        for (const interval of intervals) {
            const intervalTime = interval * duration;
            const startTime = performance.now();

            const endTime = startTime + intervalTime;
            while (performance.now() < endTime) {
                await sendRandomMessage(users, generalRoom);
                counter++;
            }

            const cpuTime = performance.now() - startTime;
            times.push({ percentage: interval * 100, cpuTime });
        }
        console.log(counter);
        const cpuTimesFile = path.join(resultsDir, 'cpu_times.json');
        fs.writeFileSync(cpuTimesFile, JSON.stringify(times, null, 2));
    }
    catch (error) {
        console.error('Error in main:', error);
    }
}

main();