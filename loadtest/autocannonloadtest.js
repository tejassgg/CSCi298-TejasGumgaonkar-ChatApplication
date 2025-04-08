const autocannon = require('autocannon');
const { io } = require('socket.io-client');
const axios = require('axios');
const os = require('os');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

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
    'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa nisl malesuada lacinia integer nunc posuere ut hendrerit semper vel class aptent taciti sociosqu ad litora torquent per conubia nostra inceptos himenaeos orci varius natoque penatibus et magnis dis parturient montes nascetur ridiculus mus donec rhoncus eros lobortis nulla molestie mattis scelerisque maximus eget fermentum odio phasellus non purus est efficitur laoreet mauris pharetra vestibulum fusce dictum risus blandit quis suspendisse aliquet nisi sodales consequat magna ante condimentum neque at luctus nibh finibus facilisis dapibus etiam interdum tortor ligula congue sollicitudin erat viverra ac tincidunt nam porta elementum a enim euismod quam justo lectus commodo augue arcu dignissim velit aliquam imperdiet mollis nullam volutpat porttitor ullamcorper rutrum gravida cras eleifend turpis fames primis vulputate ornare sagittis vehicula praesent dui felis venenatis ultrices proin libero feugiat tristique accumsan maecenas potenti ultricies habitant morbi senectus netus suscipit auctor curabitur facilisi cubilia curae hac habitasse platea dictumst lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa nisl malesuada lacinia integer nunc posuere ut hendrerit semper vel class aptent taciti sociosqu ad litora torquent per conubia nostra inceptos himenaeos orci varius natoque penatibus et magnis dis parturient montes nascetur ridiculus mus donec rhoncus eros lobortis nulla molestie mattis scelerisque maximus eget fermentum odio phasellus non purus est efficitur laoreet mauris pharetra vestibulum fusce dictum risus blandit quis suspendisse aliquet nisi sodales consequat magna ante condimentum neque at luctus nibh.',
    `Chocolate gingerbread sesame snaps cheesecake marshmallow. Gingerbread halvah lollipop cake bear claw pastry. Pie tiramisu jelly caramels caramels bear claw brownie.
    Lemon drops fruitcake fruitcake dessert jujubes pastry chocolate sweet roll. Gummi bears fruitcake chocolate donut lemon drops soufflé jelly beans. Marshmallow marzipan jujubes icing cotton candy.
    Cotton candy cupcake lemon drops bonbon jelly topping sugar plum. Bonbon cotton candy brownie lollipop tootsie roll biscuit sweet sesame snaps marshmallow. Powder chocolate bar dragée muffin wafer dessert.
    Carrot cake cookie pastry chupa chups liquorice cookie halvah gummi bears oat cake. Biscuit brownie ice cream pie wafer oat cake lemon drops. Bear claw sweet roll jelly beans lemon drops gummi bears marshmallow dragée powder. Donut sugar plum sweet roll caramels jelly-o.
    Tootsie roll macaroon icing cheesecake marzipan. Tart sesame snaps bonbon halvah cake marzipan shortbread jujubes. Candy canes dessert biscuit icing dessert tootsie roll cupcake cupcake.`,
    `Carrot cake chocolate cake shortbread macaroon marzipan pastry cupcake dragée bear claw. Gingerbread dessert shortbread topping toffee. Wafer cookie sweet roll tootsie roll cheesecake pie cake jelly beans. Chocolate bar ice cream cupcake croissant macaroon marzipan chocolate. Pudding dessert lemon drops dragée tootsie roll. Soufflé soufflé cotton candy muffin soufflé bear claw. Tootsie roll chocolate cake gingerbread topping wafer pudding sweet sugar plum. Topping chocolate cake pudding chocolate cake candy canes dessert. Jujubes chocolate bar powder candy canes biscuit soufflé cheesecake biscuit. Croissant halvah candy liquorice wafer soufflé cheesecake.
    Jujubes sweet roll danish oat cake carrot cake. Brownie soufflé tart tiramisu soufflé chocolate bar wafer tart. Cheesecake bonbon bonbon ice cream soufflé caramels shortbread sweet. Jelly-o sesame snaps sweet sweet roll danish sweet chupa chups. Jelly-o caramels tootsie roll bear claw ice cream. Cheesecake pudding cake jelly beans cookie dragée chocolate. Soufflé macaroon sugar plum fruitcake chocolate biscuit cheesecake. Sugar plum jujubes gummi bears marshmallow cheesecake. Cheesecake topping macaroon candy liquorice oat cake. Powder powder chupa chups jelly pastry marshmallow.
    Gummi bears gummi bears jelly beans chocolate jujubes cake pastry. Gingerbread marshmallow marshmallow soufflé dragée pastry shortbread. Topping cake tootsie roll cake dessert lollipop. Jelly-o cotton candy topping cake jelly brownie biscuit. Pudding marzipan marshmallow muffin candy candy. Sugar plum danish marzipan cookie jelly chocolate cake chocolate. Muffin pastry candy pie jelly beans jelly apple pie cake. Cotton candy apple pie biscuit jelly beans jelly beans gingerbread sesame snaps candy canes.
    Cotton candy macaroon cheesecake chocolate cake bear claw wafer donut. Sesame snaps bear claw gingerbread chupa chups dragée liquorice brownie lemon drops. Sweet marshmallow powder muffin chupa chups jelly-o jelly pie jelly. Biscuit tootsie roll wafer caramels cheesecake. Gingerbread jelly-o gummies liquorice topping bear claw. Oat cake jelly-o candy canes powder halvah marshmallow. Lemon drops toffee candy cotton candy gummi bears. Gummi bears bonbon cookie halvah tiramisu chocolate bar biscuit chupa chups.
    Chocolate bar shortbread fruitcake chocolate jujubes cake pastry macaroon gummies. Gummies cake fruitcake croissant croissant marshmallow lemon drops sweet roll liquorice. Shortbread gingerbread cupcake gummies jujubes candy jelly dragée. Marshmallow donut pie cotton candy powder tootsie roll bear claw. Brownie cake cookie pudding chupa chups. Sesame snaps gummies cookie ice cream tiramisu gingerbread powder biscuit jelly.`
];

// Function to get a random message
function getRandomMessage() {
    return messages[Math.floor(Math.random() * messages.length)];
}

// Function to get list of  users
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

// Function to get a random user
function getRandomUser(users) {
    return users[Math.floor(Math.random() * users.length)];
}

// Function to load files from a folder
const loadFilesFromFolder = (folderPath) => {
    return new Promise((resolve, reject) => {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                return reject(err);
            }
            resolve(files.map(file => path.join(folderPath, file)));
            console.log('All Files Loaded from Images Folder');
        });
    });
};

// Function to upload a file
const uploadFile = async (filePath) => {
    const formData = new FormData();
    formData.append('media', fs.createReadStream(filePath));

    const response = await axios.post(`${SERVER_URL}/api/upload`, formData);

    if (response.status !== 200) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    return response.data;
};

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

// Function to setup autocannon
function setupAutocannon(users, files, duration = 10) {
    console.log('Setting up autocannon...');

    let messageCount = 0;
    let cpuUsages = [];
    let memoryUsages = [];

    const interval = setInterval(() => {
        cpuUsages.push(getCpuUsage());
        memoryUsages.push(getMemoryUsage());
    }, 1000);

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

            socket.on('connect', async () => {
                socket.emit('join', user.username);
                client.on('response', async (status, body, context) => {

                    if (messageCount % 100 == 0) {
                        const filePath = files[Math.floor(Math.random() * files.length)];
                        const fileData = await uploadFile(filePath);
                        var fileType = "";
                        if (fileData.fileType.startsWith('image/')) {
                            fileType = 'image';
                        }
                        else if (fileData.fileType.startsWith('video/')) {
                            fileType = 'video';
                        }
                        else if (fileData.fileType.startsWith('audio/')) {
                            fileType = 'audio';
                        }
                        else if (fileData.fileType.startsWith('application/')) {
                            fileType = 'file';
                        }
                        else {
                            fileType = 'other';
                        }

                        if (fileData.success) {
                            socket.emit('mediaMessage', {
                                mediaUrl: fileData.filePath,
                                mediaType: fileType,
                                fileName: path.basename(fileData.filePath),
                                fileSize: fileData.fileSize
                            });
                        }
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
        clearInterval(interval);
        if (err) {
            console.error('Autocannon encountered an error:', err);
        } else {
            const result = getInsigthfulResults(res, cpuUsages, memoryUsages);
            console.log('Autocannon results:', res);
            CheckandSavetoFile(result);
            console.log(`Testing Completed with ${users.length} users for ${duration} seconds and sent ${messageCount} messages`);

            process.exit(0); // Exit the process after the test
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

    console.log(`Insights saved to ${filePath}`);
}

const getDate = () => {
    return new Date().toLocaleString("en-US").toString("MM-dd-YYYY").replaceAll(", ", "_").replaceAll("/", "-").replaceAll(" ", "").replaceAll(":", "-")
}

// Function to extract meaningful insights from autocannon results
function getInsigthfulResults(res, cpuUsages, memoryUsages) {
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
        currentDateTime: formatDate(Date.now()),
        currentUserLogin: 'tejassgg'
    };

    // Combine insights and metadata
    return { insights, metadata };
}

// Main function to run the test
async function main() {
    try {
        const numUsers = 100; // Adjust the number of users as needed
        const duration = 10; // Test duration in seconds
        const users = await getUsers(numUsers);
        const files = await loadFilesFromFolder('../images');


        fs.readdir('../uploads', (err, files) => {
            if (err) throw err;

            for (const file of files) {
                fs.unlink(path.join('../uploads', file), (err) => {
                    if (err) throw err;
                });
            }
            console.log('All Files Deleted from Uploads Folder');
        });

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