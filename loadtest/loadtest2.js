const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const User = require('./models/User');
const ChatRoom = require('./models/ChatRoom');

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

async function getUsersAndGeneralRoom() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    await mongoose.connect(mongoURI);

    // Retrieve users and general room from the database
    const users = await User.find();
    const generalRoom = await ChatRoom.findOne({ name: 'General' });

    await mongoose.disconnect();

    return { users, generalRoom };
  } catch (error) {
    console.error('Error in getUsersAndGeneralRoom:', error);
  }
}

async function sendRandomMessage(users, generalRoom) {
  try {
    const response = await fetch(`${SERVER_URL}/api/send-random-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ users, generalRoom })
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
  await createUsers(50); // Adjust the number of users as needed

  const { users, generalRoom } = await getUsersAndGeneralRoom();

  // Export the users and generalRoom data
  const data = { users, generalRoom };
  const resultsDir = path.join(__dirname, 'perf_results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }
  const resultsFile = path.join(resultsDir, 'users_and_generalRoom.json');
  fs.writeFileSync(resultsFile, JSON.stringify(data, null, 2));

  // Call the send-random-message API
  await sendRandomMessage(users, generalRoom);
}

main();