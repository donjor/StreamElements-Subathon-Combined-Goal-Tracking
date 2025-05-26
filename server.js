const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Read from .env file
require('dotenv').config();
const JWT_TOKEN = process.env.JWT_TOKEN; // Ensure you have a JWT_TOKEN in your .env file

// const goals = {
//   "1": {
//     "name": "First Goal",
//     "points": 500,
//   },
//   "2": {
//     "name": "Second Goal",
//     "points": 1000,
//   },
//   // Add more goals as needed
// };

// Create a new websocket connection
const ws = new WebSocket('wss://astro.streamelements.com');

// File to store points
const pointsFilePath = path.join(__dirname, 'points.txt');

// Function to read points from points.txt, or create it if it doesn't exist
function readPoints() {
  try {
    // Check if the file exists
    if (fs.existsSync(pointsFilePath)) {
      // Read the points from the file
      const points = fs.readFileSync(pointsFilePath, 'utf-8');
      return parseInt(points, 10); // Return as integer
    } else {
      // If the file doesn't exist, create it with 0 points
      fs.writeFileSync(pointsFilePath, '0');
      return 0;
    }
  } catch (error) {
    console.error('Error reading points file:', error);
    return 0;
  }
}


let currentPoints = readPoints(); // Initialize current points from the file
console.log('INIT: Current points:', currentPoints); // Log the current points

// Function to update the points in points.txt
function updatePoints(points) {
  try {
    console.log('Points Updated | Current Points:', points); // Log the new points value



    // Write the new points value to the file
    fs.writeFileSync(pointsFilePath, points.toString());
  } catch (error) {
    console.error('Error writing to points file:', error);
  }
}


// Connection opened
ws.on('open', () => {
  console.log('Connected to StreamElements Astro');

  // Subscribe to multiple topics
  const subscribeMessage = {
    type: 'subscribe',
    nonce: uuidv4(),
    data: {
      topic: 'channel.activities',
      token: JWT_TOKEN,
      token_type: 'jwt'
    }
  };
  ws.send(JSON.stringify(subscribeMessage));

});

// Listen for messages
ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Message from server:', message);
  
    // Handle different message types
    if (message.type === 'response') {
      console.log('Received response:', message);
    } else if (message.type === 'message') {
    //console.log('Received notification:', message);
  
      // Process the notification based on the activity type
      if (message.topic === 'channel.activities') {
        const activity = message.data;
        switch (activity.type) {
            case 'follow':
              // Handle follow event
              console.log('New follower:', activity.data.username);
              currentPoints += 10;
              updatePoints(currentPoints); // Update points in the file
              break;
            case 'subscriber':
              // Handle subscription event
              console.log('New subscriber:', activity.data.username, " | Tier:", activity.data.tier);
              let teir = activity.data.tier;
              let amount = activity.data.amount;
                if (teir == 1000) {
                    currentPoints += 150 * amount; // Add 150 points for subscriptions
                } else if (teir == 2000) {
                    currentPoints += 150 * 2 * amount; // Add 300 points for subscriptions
                } else if (teir == 3000) {
                    currentPoints += 150 * 5 * amount; // Add 500 points for subscriptions
                } else {
                    currentPoints += 150 * amount; // Add 100 points for subscriptions
                }
              updatePoints(currentPoints); // Update points in the file
              break;
            case 'tip':
              // Handle tip (donation) event
              console.log('New donation (tip):', activity.data.username, 'Amount:', activity.data.amount);
              currentPoints += activity.data.amount * 60; // Add 60 points per $1 tip
              updatePoints(currentPoints); // Update points in the file
              break;
            case 'cheer':
              // Handle bits donation event
              console.log('Bits donation:', activity.data.username, 'Amount:', activity.data.amount);
              currentPoints += Math.floor(activity.data.amount / 100) * 30; // Add 30 points for every 100 bits
              updatePoints(currentPoints); // Update points in the file
              break;
            default:
              console.log('Other activity:', activity.type);
          }
        }
      }
    });

// Connection error
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Connection closed
ws.on('close', (code, reason) => {
  console.log('Connection closed:', code, reason);
  // Implement reconnection logic here if needed
});

// Example of unsubscribing from a topic
function unsubscribe(topic, room) {
  const unsubscribeMessage = {
    type: 'unsubscribe',
    nonce: uuidv4(),
    data: {
      topic: topic,
      token: JWT_TOKEN,
      token_type: 'jwt'
    }
  };
  
  ws.send(JSON.stringify(unsubscribeMessage));
}
