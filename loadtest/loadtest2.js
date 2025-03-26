const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { PerformanceObserver, performance } = require('perf_hooks');
const { io } = require('socket.io-client');
const axios = require('axios');
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
        const response = await axios.post(`${SERVER_URL}/api/create-users`, {
            numUsers
        });

        if (response.status !== 200) {
            throw new Error(`Failed to create users: ${response.statusText}`);
        }

        const { users, generalRoom } = response.data;

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
            // Call the new save-message endpoint using axios
            const response = await axios.post(`${SERVER_URL}/api/save-message`, {
                chatRoomId: currentRoomId,
                senderId: users[i]._id,
                messageType: 'text',
                text: getRandomMessage()
            });

            if (response.status !== 200) {
                throw new Error(`Failed to save message: ${response.statusText}`);
            }

            const message = response.data.message;

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

        const numUsers = 20; // Adjust the number of users as needed
        const { users, generalRoom } = await createUsers(numUsers);
        const currentRoomId = generalRoom._id;
        console.log('Broadcasting message to room: ', currentRoomId);

        const n = 5; // Duration in seconds
        const interval = 5; // Interval in milliseconds

        const intervalId = setInterval(() => {
            sendRandomMessage(users, currentRoomId);
        }, interval);

        setTimeout(async () => {
            clearInterval(intervalId);
            console.log(`Test completed! Sent messages for ${n} seconds`);
            console.log(`Number of Clients Connected: ${Array.from(users).length}`);
            // Query the database to count total messages sent
        }, n * 1000);

        setTimeout(async () => {
            try {
                const totalMessagesInDb = await Message.countDocuments({});
                console.log(`Broadcasting Completed to room: ${currentRoomId} with ${totalMessagesInDb} messages`);
            } catch (dbError) {
                console.error('Error querying total messages from database:', dbError);
            }
            process.exit(0);
        }, 60000); // Exit after 15 seconds

    } catch (error) {
        console.error('Error in main:', error);
    }
}

main();

