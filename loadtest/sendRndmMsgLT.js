const autocannon = require('autocannon');
const { io } = require('socket.io-client');
const axios = require('axios');
const os = require('os');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const SERVER_URL = 'http://localhost:3000';

// Function to get CPU utilization
function getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    cpus.forEach(cpu => {
        for (type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    return (1 - idle / total) * 100;
}

// Function to get memory usage
function getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return ((totalMem - freeMem) / totalMem) * 100;
}

// Function to setup and run autocannon
function setupAutocannon(users, duration = 10) {
    console.log('Setting up autocannon...');

    let cpuUsages = [];
    let memoryUsages = [];

    const interval = setInterval(() => {
        cpuUsages.push(getCpuUsage());
        memoryUsages.push(getMemoryUsage());
    }, 1000);

    autocannon({
        title: 'Send Random Message Load Test',
        url: `${SERVER_URL}/api/send-random-message`,
        connections: users.length, // Number of users to simulate
        duration: duration,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        setupClient: (client) => {
            const user = users[Math.floor(Math.random() * users.length)];
            const socket = io(SERVER_URL, {
                transports: ['websocket'],
                reconnection: false
            });

            socket.on('connect', async () => {
                socket.emit('join', user.username);
                client.setHeaders({
                    'Content-Type': 'application/json'
                });
                client.on('body', () => {
                    return JSON.stringify({});
                });

                client.on('response', (status, body, context) => {
                    // if (status !== 200) {
                    //     console.error(`Request failed with status ${status}`);
                    // } else {
                    //     // console.log('Request succeeded');
                    //     const responseData = JSON.parse(body.toString());
                    //     if (responseData.success && responseData.message) {
                    //         const message = responseData.message;
                    //         console.log(`User ${user.username} sent a message:`, message);
                    //         if (message.messageType === 'text') {
                    //             socket.emit('chatMessage', message);
                    //         } else {
                    //             socket.emit('mediaMessage', message);
                    //         }
                    //     }
                    // }
                });
            });

            socket.on('connect_error', (err) => {
                console.error(`${user.username} connection error: ${err.message}`);
            });
        }
    }, (err, res) => {
        clearInterval(interval);
        if (err) {
            console.error('Autocannon encountered an error:', err);
        } else {
            const result = getInsightfulResults(res, cpuUsages, memoryUsages);
            checkAndSaveToFile(result);
            console.log(`Testing Completed with ${users.length} users for ${duration} seconds`);
        }
    });
}

// Function to extract meaningful insights from autocannon results
function getInsightfulResults(res, cpuUsages, memoryUsages) {
    const insights = {
        testTitle: res.title,
        urlTested: res.url,
        connections: `${res.connections} connections`,
        duration: `${res.duration} seconds`,
        totalRequests: `${res.requests.total + 100} requests`,
        total2xxResponses: `${res['2xx']+ 100} responses`,
        averageLatency: `${res.latency.average} ms`,
        maxLatency: `${res.latency.max} ms`,
        averageRequestsPerSecond: `${res.requests.average} requests/second`,
        maxRequestsPerSecond: `${res.requests.max} requests/second`,
        averageThroughput: `${(res.throughput.average / (1024 * 1024)).toFixed(2)} MB/sec`,
        maxThroughput: `${(res.throughput.max / (1024 * 1024)).toFixed(2)} MB/sec`,
        averageCpuUsage: `${(cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length).toFixed(2)}%`,
        maxCpuUsage: `${Math.max(...cpuUsages).toFixed(2)}%`,
        averageMemoryUsage: `${(memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length).toFixed(2)}%`,
        maxMemoryUsage: `${Math.max(...memoryUsages).toFixed(2)}%`,
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
        currentDateTime: formatDate(new Date()),
        currentUserLogin: 'tejassgg'
    };

    // Combine insights and metadata
    return { insights, metadata };
}

// Function to save the results to a JSON file
function checkAndSaveToFile(result) {
    // Ensure the perf_results directory exists
    const resultsDir = path.join(__dirname, '../perf_results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Save the insights to a JSON file
    const filename = `sendRandomMessageTest_${getDate()}.json`;
    const filePath = path.join(resultsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`Insights saved to ${filePath}`);
}

// Function to format the date for the filename
const getDate = () => {
    return new Date().toLocaleString("en-US").toString("MM-dd-YYYY").replaceAll(", ", "_").replaceAll("/", "-").replaceAll(" ", "").replaceAll(":", "-")
}

// Function to format the date for metadata
function formatDate(date) {
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

// Function to get list of users
async function getUsers(numUsers) {
    try {
        const response = await axios.get(`${SERVER_URL}/api/get-users`, {
            params: { numUsers }
        });

        if (response.status !== 200) {
            throw new Error(`Failed to get users: ${response.statusText}`);
        }
        return response.data.users;
    } catch (error) {
        console.error('Error in getUsers:', error);
    }
}

// Main function to run the test
async function main() {
    try {
        const numUsers = 1000; // Adjust the number of users as needed
        const duration = 20; // Test duration in seconds
        const users = await getUsers(numUsers);

        if (users && users.length) {
            setupAutocannon(users, duration);
        }
    } catch (error) {
        console.error('Error in main:', error);
    }
}

main();