const autocannon = require('autocannon');
const { io } = require('socket.io-client');
const axios = require('axios');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const SERVER_URL = 'http://localhost:3000';

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

// Function to setup autocannon
function setupAutocannon(users, duration = 10) {
    console.log('Setting up autocannon...');
    autocannon({
        title: 'Chat Load Test',
        url: SERVER_URL,
        connections: users.length, // Number of concurrent connections
        duration: 20, // Test duration in seconds
        setupClient: (client) => {
            const user = getRandomUser(users);
            const socket = io(SERVER_URL, {
                transports: ['websocket'],
                reconnection: false
            });

            socket.on('connect', () => {
                socket.emit('join', user.username);
                client.on('response', (status, body, context) => {
                    socket.emit('chatMessage', getRandomMessage());
                });
            });

            socket.on('connect_error', (err) => {
                console.error(`Client ${user.username} connection error: ${err.message}`);
            });
        }
    }, (err, autocannonResults) => {
        if (err) {
            console.error('Autocannon encountered an error:', err);
        } else {
            // console.log('Autocannon results:', autocannonResults);
            // Extract meaningful insights with units
            const insights = {
                testTitle: autocannonResults.title,
                urlTested: autocannonResults.url,
                connections: `${autocannonResults.connections} connections`,
                duration: `${autocannonResults.duration} seconds`,
                totalRequests: `${autocannonResults.requests.total} requests`,
                total2xxResponses: `${autocannonResults['2xx']} responses`,
                averageLatency: `${autocannonResults.latency.average} ms`,
                maxLatency: `${autocannonResults.latency.max} ms`,
                averageRequestsPerSecond: `${autocannonResults.requests.average} requests/second`,
                maxRequestsPerSecond: `${autocannonResults.requests.max} requests/second`,
                averageThroughput: `${autocannonResults.throughput.average} B/sec`,
                maxThroughput: `${autocannonResults.throughput.max} B/sec`,
                failureCases: {
                    errors: autocannonResults.errors,
                    timeouts: autocannonResults.timeouts,
                    mismatches: autocannonResults.mismatches,
                    non2xx: autocannonResults.non2xx,
                    resets: autocannonResults.resets,
                },
                percentiles: {
                    latency: autocannonResults.latency,
                    requests: autocannonResults.requests,
                    throughput: autocannonResults.throughput
                }
            };

            // Add current date and time, and the current user's login
            const metadata = {
                currentDateTime: formatDate(Date.now()),
                currentUserLogin: 'tejassgg'
            };

            // Combine insights and metadata
            const result = {
                insights,
                metadata
            };

            // Ensure the perf_results directory exists
            const resultsDir = path.join(__dirname, '../perf_results');
            if (!fs.existsSync(resultsDir)) {
                fs.mkdirSync(resultsDir, { recursive: true });
            }

            // Save the insights to a JSON file
            const timestamp = new Date().toLocaleString("en-US").replaceAll(", ", "_").replaceAll("/", "-").replaceAll(" ", "");
            const filename = `autocannon_insights_${timestamp}.json`;
            const filePath = path.join(resultsDir, filename);

            fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');

            console.log(`Autocannon insights saved to ${filePath}`);
        }
    });
}


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

// Main function to run the test
async function main() {
    try {
        const numUsers = 10; // Adjust the number of users as needed
        const duration = 5; // Test duration in seconds
        const users = await createUsers(numUsers);

        if (users && users.length) {
            setupAutocannon(users, duration);
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