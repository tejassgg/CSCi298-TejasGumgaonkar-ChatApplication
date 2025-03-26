const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { PerformanceObserver, performance } = require('perf_hooks');
require('dotenv').config();

// Import models
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');

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

    const result = await response.json();
    console.log(result.message);
  } catch (error) {
    console.error('Error in createUsers:', error);
  }
}

async function sendRandomMessage(users, generalRoom) {
  try {
    const response = await fetch(`${SERVER_URL}/api/send-random-message`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to send random message: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(result.message);
  } catch (error) {
    console.error('Error in sendRandomMessage:', error);
  }
}

async function main() {
  await createUsers(100); // Adjust the number of users as needed

  // Measure CPU execution time for specific durations
  const duration = 10000; // Total duration in milliseconds (e.g., 10 seconds)
  const intervals = [0.05, 0.10, 0.25, 0.50, 0.75, 1.00];
  const times = [];

  for (const interval of intervals) {
    const intervalTime = interval * duration;
    const startTime = performance.now();
    
    const endTime = startTime + intervalTime;
    while (performance.now() < endTime) {
      await sendRandomMessage(users, generalRoom);
    }

    const cpuTime = performance.now() - startTime;
    times.push({ percentage: interval * 100, cpuTime });
  }

  const cpuTimesFile = path.join(resultsDir, 'cpu_times.json');
  fs.writeFileSync(cpuTimesFile, JSON.stringify(times, null, 2));
}

main();