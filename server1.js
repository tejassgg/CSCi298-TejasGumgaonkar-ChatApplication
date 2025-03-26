
const Message = require('./models/Message');

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

async function sendRandomMessage(users, currentRoomId) {
    try {
        if (!users.length || !currentRoomId) {
            return res.status(400).json({ message: 'No users or chat room found' });
        }

        const randomUser = users[Math.floor(Math.random() * users.length)];

        const newMessage = new Message({
            chatRoom: currentRoomId,
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

        io.to(currentRoomId.toString()).emit('message', messageData);
    } catch (error) {
        console.error('Error in sendRandomMessage endpoint:', error);
    }
}

module.exports = { sendRandomMessage };