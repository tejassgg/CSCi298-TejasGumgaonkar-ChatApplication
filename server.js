// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
const cors = require('cors');
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    // Handle user joining
    socket.on('join', (username) => {
        console.log(username +  ' user connected');
        users.set(socket.id, username);
        io.emit('userJoined', username);
        io.emit('userList', Array.from(users.values()));
    });

    // Handle chat messages
    socket.on('chatMessage', (message) => {
        const username = users.get(socket.id);
        io.emit('message', {
            username: username,
            text: message,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    // Handle typing indicator
    socket.on('typing', () => {
        const username = users.get(socket.id);
        socket.broadcast.emit('userTyping', username);
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        users.delete(socket.id);
        io.emit('userLeft', username);
        io.emit('userList', Array.from(users.values()));
        console.log(username + ' user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});