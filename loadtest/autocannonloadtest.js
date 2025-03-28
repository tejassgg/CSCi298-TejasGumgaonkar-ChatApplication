const autocannon = require('autocannon');
const { io } = require('socket.io-client');
const axios = require('axios');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { duplexPair } = require('stream');

const SERVER_URL = 'http://localhost:3000';

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
// Function to get a random message
function getRandomMessage() {

    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
}

// Function to create users
async function createUsers(numUsers) {
    try {
        // const response = await axios.post(`${SERVER_URL}/api/create-users`, {
        //     numUsers
        // });

        // if (response.status !== 200) {
        //     throw new Error(`Failed to create users: ${response.statusText}`);
        // }

        // return response.data.users;

        const response = await axios.get(`${SERVER_URL}/api/get-users`, {
            params: { numUsers }
        });

        if (response.status !== 200) {
            throw new Error(`Failed to get users: ${response.statusText}`);
        }

        const { users, generalRoom } = response.data;
        return users;

    } catch (error) {
        console.error('Error in createUsers:', error);
    }
}

// Function to get a random user
function getRandomUser(users) {
    const randomIndex = Math.floor(Math.random() * users.length);
    return users[randomIndex];
}

// Function to load files from a folder
const loadFilesFromFolder = (folderPath) => {
    return new Promise((resolve, reject) => {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                return reject(err);
            }
            const filePaths = files.map(file => path.join(folderPath, file));
            resolve(filePaths);
        });
    });
};

const getRandomFilePath = (files) => {
    const randomIndex = Math.floor(Math.random() * files.length);
    return files[randomIndex];
};

const uploadFile = async (filePath) => {
    const formData = new FormData();
    formData.append('media', fs.createReadStream(filePath));

    const response = await axios.post(`${SERVER_URL}/api/upload`, formData);

    if (response.status !== 200) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    return response.data.filePath;
};

// Function to setup autocannon
function setupAutocannon(users, files, duration = 10) {
    console.log('Setting up autocannon...');
    autocannon({
        title: 'Chat Load Test',
        url: SERVER_URL,
        connections: users.length,
        duration: duration,
        setupClient: (client) => {
            const user = getRandomUser(users);
            const socket = io(SERVER_URL, {
                transports: ['websocket'],
                reconnection: false
            });

            let messageCount = 0;

            socket.on('connect', async () => {
                socket.emit('join', user.username);
                client.on('response', async (status, body, context) => {
                    if (messageCount % 50 === 0) {
                        // const filePath = await uploadFile(getRandomFilePath(files));

                        const filePath = getRandomFilePath(files);
                        console.log('filePath:', filePath);
                        socket.emit('mediaMessage', {
                            mediaUrl: filePath,
                            mediaType: 'image',
                            fileName: path.basename(filePath),
                            fileSize: fs.statSync(filePath).size
                        });
                    } else {
                        socket.emit('chatMessage', getRandomMessage());
                    }
                    messageCount++;
                });
            });

            socket.on('connect_error', (err) => {
                console.error(`${user.username} connection error: ${err.message}`);
            });
        }
    }, (err, res) => {
        if (err) {
            console.error('Autocannon encountered an error:', err);
        } else {
            const result = getInsigthfulResults(res);
            CheckandSavetoFile(result);
            console.log(`Autocannon insights saved to ${filePath}`);
        }
    });
}

function CheckandSavetoFile(result) {
    // Ensure the perf_results directory exists
    const resultsDir = path.join(__dirname, '../perf_results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Save the insights to a JSON file
    const filename = `autocannon_insights_${getDate()}.json`;
    const filePath = path.join(resultsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
}

const getDate = () => {
    return new Date().toLocaleString("en-US").toString("MM-dd-YYYY").replaceAll(", ", "_").replaceAll("/", "-").replaceAll(" ", "").replaceAll(":", "-")
}

// Function to extract meaningful insights from autocannon results
function getInsigthfulResults(res) {
    const insights = {
        testTitle: res.title,
        urlTested: res.url,
        connections: `${res.connections} connections`,
        duration: `${res.duration} seconds`,
        totalRequests: `${res.requests.total} requests`,
        total2xxResponses: `${res['2xx']} responses`,
        averageLatency: `${res.latency.average} ms`,
        maxLatency: `${res.latency.max} ms`,
        averageRequestsPerSecond: `${res.requests.average} requests/second`,
        maxRequestsPerSecond: `${res.requests.max} requests/second`,
        averageThroughput: `${res.throughput.average / 1024} KB/sec`,
        maxThroughput: `${res.throughput.max / 1024} KB/sec`,
        failureCases: {
            errors: res.errors,
            timeouts: res.timeouts,
            mismatches: res.mismatches,
            non2xx: res.non2xx,
            resets: res.resets,
        },
        percentiles: {
            latency: res.latency,
            requests: res.requests,
            throughput: res.throughput
        }
    };

    // Add current date and time, and the current user's login
    const metadata = {
        currentDateTime: formatDate(Date.now()),
        currentUserLogin: 'tejassgg'
    };

    // Combine insights and metadata
    return { insights, metadata };
}

// Main function to run the test
async function main() {
    try {
        const numUsers = 15; // Adjust the number of users as needed
        const duration = 10; // Test duration in seconds
        const users = await createUsers(numUsers);
        const files = await loadFilesFromFolder('../images');

        if (users && users.length) {
            setupAutocannon(users, files, duration);
        }
    } catch (error) {
        console.error('Error in main:', error);
    }
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedTime = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds + ' ' + ampm;

    return `${day}/${month}/${year} ${formattedTime}`;
}

main();