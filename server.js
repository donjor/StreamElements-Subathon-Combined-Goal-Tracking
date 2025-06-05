const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const JWT_TOKEN = process.env.JWT_TOKEN;
const ALWAYS_READ_IN_POINTS_TXT = process.env.ALWAYS_READ_IN_POINTS_TXT !== 'false';

console.log('INIT: ALWAYS_READ_IN_POINTS_TXT =', ALWAYS_READ_IN_POINTS_TXT);

// Point values (fall back to defaults if env missing)
const POINTS_PER_FOLLOW           = process.env.POINTS_PER_FOLLOW           ? parseInt(process.env.POINTS_PER_FOLLOW, 10)           : 10;
const POINTS_PER_TIER_ONE_SUB     = process.env.POINTS_PER_TIER_ONE_SUB     ? parseInt(process.env.POINTS_PER_TIER_ONE_SUB, 10)     : 150;
const POINTS_PER_TIER_TWO_SUB     = process.env.POINTS_PER_TIER_TWO_SUB     ? parseInt(process.env.POINTS_PER_TIER_TWO_SUB, 10)     : 300;
const POINTS_PER_TIER_THREE_SUB   = process.env.POINTS_PER_TIER_THREE_SUB   ? parseInt(process.env.POINTS_PER_TIER_THREE_SUB, 10)   : 750;
const POINTS_PER_ONE_USD_DONO     = process.env.POINTS_PER_ONE_USD_DONO     ? parseInt(process.env.POINTS_PER_ONE_USD_DONO, 10)     : 60;
const POINTS_PER_ONE_HUNDRED_BITS = process.env.POINTS_PER_ONE_HUNDRED_BITS ? parseInt(process.env.POINTS_PER_ONE_HUNDRED_BITS, 10) : 30;

console.log('INIT: Points Configuration:');
console.log('Points per Follow:            ', POINTS_PER_FOLLOW);
console.log('Points per Tier 1 Sub:        ', POINTS_PER_TIER_ONE_SUB);
console.log('Points per Tier 2 Sub:        ', POINTS_PER_TIER_TWO_SUB);
console.log('Points per Tier 3 Sub:        ', POINTS_PER_TIER_THREE_SUB);
console.log('Points per $1 Donation:       ', POINTS_PER_ONE_USD_DONO);
console.log('Points per 100 Bits Donation: ', POINTS_PER_ONE_HUNDRED_BITS);

// ─── points.txt setup ───────────────────────────────────────────────────────────
const pointsFilePath = path.join(__dirname, 'points.txt');
function readPoints() {
  try {
    if (fs.existsSync(pointsFilePath)) {
      const raw = fs.readFileSync(pointsFilePath, 'utf-8');
      return parseInt(raw, 10) || 0;
    } else {
      fs.writeFileSync(pointsFilePath, '0');
      return 0;
    }
  } catch (err) {
    console.error('Error reading points file:', err);
    return 0;
  }
}

let currentPoints = readPoints();
console.log('INIT: Current points:', currentPoints);

function updatePoints(points_to_add) {
  try {
    if (ALWAYS_READ_IN_POINTS_TXT) {
      currentPoints = readPoints();
    }
    console.log(`Updating points… Existing Points: ${currentPoints}`);
    currentPoints += points_to_add;
    console.log(`Points Updated (+${points_to_add}) | Updated Current Points: ${currentPoints}`);
    fs.writeFileSync(pointsFilePath, currentPoints.toString());
  } catch (err) {
    console.error('Error writing to points file:', err);
  }
}


// ─── WebSocket + auto-reconnect logic ────────────────────────────────────────────
let ws = null;
const RECONNECT_DELAY_MS = 5000; // 5 seconds before retry

function connect() {
  console.log('→ Attempting to connect to StreamElements Astro…');
  ws = new WebSocket('wss://astro.streamelements.com');

  ws.on('open', () => {
    console.log('Connected to StreamElements Astro');

    // Subscribe once we're open
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

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Message from server:', message);

    if (message.type === 'response') {
      console.log('Received response:', message);
      return;
    }

    if (message.type === 'message' && message.topic === 'channel.activities') {
      const activity = message.data;
      switch (activity.type) {
        case 'follow':
          console.log('New follower:', activity.data.username);
          updatePoints(POINTS_PER_FOLLOW);
          break;
        case 'subscriber':
          console.log('New subscriber:', activity.data.username, '| Tier:', activity.data.tier);
          let tier   = activity.data.tier;
          let amount = activity.data.amount;
          if (tier === 1000) {
            updatePoints(POINTS_PER_TIER_ONE_SUB * amount);
          } else if (tier === 2000) {
            updatePoints(POINTS_PER_TIER_TWO_SUB * amount);
          } else if (tier === 3000) {
            updatePoints(POINTS_PER_TIER_THREE_SUB * amount);
          } else {
            // fallback if tier is unexpected
            updatePoints(POINTS_PER_TIER_ONE_SUB * amount);
          }
          break;
        case 'tip':
          console.log('New donation (tip):', activity.data.username, 'Amount:', activity.data.amount);
          updatePoints(activity.data.amount * POINTS_PER_ONE_USD_DONO);
          break;
        case 'cheer':
          console.log('Bits donation:', activity.data.username, 'Amount:', activity.data.amount);
          // Only award points per 100 bits
          updatePoints(Math.floor(activity.data.amount / 100) * POINTS_PER_ONE_HUNDRED_BITS);
          break;
        default:
          console.log('Other activity:', activity.type);
      }
    }
  });

  ws.on('error', (err) => {
    // Note: “error” often fires just before “close”. Don’t reconnect here directly,
    // or you might end up with multiple overlapping attempts.
    console.error('WebSocket error:', err);
  });

  ws.on('close', (code, reason) => {
    console.warn(`Connection closed: ${code}`, reason || '<no reason>');
    // Attempt reconnection after a delay
    setTimeout(() => {
      console.log(`Reconnecting in ${RECONNECT_DELAY_MS / 1000} seconds…`);
      connect();
    }, RECONNECT_DELAY_MS);
  });
}

// Start the first connection
connect();


// Example unsubscribe function (if you ever need to cleanly leave)
function unsubscribe(topic) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const msg = {
      type: 'unsubscribe',
      nonce: uuidv4(),
      data: {
        topic: topic,
        token: JWT_TOKEN,
        token_type: 'jwt'
      }
    };
    ws.send(JSON.stringify(msg));
  }
}
