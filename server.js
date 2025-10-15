const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const JWT_TOKEN = process.env.JWT_TOKEN;
const ALWAYS_READ_IN_POINTS_TXT = process.env.ALWAYS_READ_IN_POINTS_TXT !== "false";
const USE_POINTS = process.env.USE_POINTS !== "false";
const USE_CURRENCY = process.env.USE_CURRENCY === "true";
const CURRENCY_SYMBOL = process.env.CURRENCY_SYMBOL || "$";

console.log("INIT: ALWAYS_READ_IN_POINTS_TXT =", ALWAYS_READ_IN_POINTS_TXT);
console.log("INIT: USE_POINTS =", USE_POINTS);
console.log("INIT: USE_CURRENCY =", USE_CURRENCY, "| CURRENCY_SYMBOL =", CURRENCY_SYMBOL);

const getEnvNumber = (key, fallback) => {
  const raw = process.env[key];
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatNumber = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";

const normalizeStoredNumber = (raw) => {
  if (!raw) {
    return 0;
  }
  const sanitized = raw.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Point values (fall back to defaults if env missing)
const POINTS_PER_FOLLOW = getEnvNumber("POINTS_PER_FOLLOW", 10);
const POINTS_PER_TIER_ONE_SUB = getEnvNumber("POINTS_PER_TIER_ONE_SUB", 150);
const POINTS_PER_TIER_TWO_SUB = getEnvNumber("POINTS_PER_TIER_TWO_SUB", 300);
const POINTS_PER_TIER_THREE_SUB = getEnvNumber("POINTS_PER_TIER_THREE_SUB", 750);
const POINTS_PER_ONE_USD_DONO = getEnvNumber("POINTS_PER_ONE_USD_DONO", 60);
const POINTS_PER_ONE_HUNDRED_BITS = getEnvNumber("POINTS_PER_ONE_HUNDRED_BITS", 30);

const EARNINGS_PER_FOLLOW = getEnvNumber("EARNINGS_PER_FOLLOW", 10);
const EARNINGS_PER_TIER_ONE_SUB = getEnvNumber("EARNINGS_PER_TIER_ONE_SUB", 150);
const EARNINGS_PER_TIER_TWO_SUB = getEnvNumber("EARNINGS_PER_TIER_TWO_SUB", 300);
const EARNINGS_PER_TIER_THREE_SUB = getEnvNumber("EARNINGS_PER_TIER_THREE_SUB", 750);
const EARNINGS_PER_ONE_USD_DONO = getEnvNumber("EARNINGS_PER_ONE_USD_DONO", 60);
const EARNINGS_PER_ONE_HUNDRED_BITS = getEnvNumber("EARNINGS_PER_ONE_HUNDRED_BITS", 30);

console.log("INIT: Points Configuration:");
console.log("Points per Follow:            ", POINTS_PER_FOLLOW);
console.log("Points per Tier 1 Sub:        ", POINTS_PER_TIER_ONE_SUB);
console.log("Points per Tier 2 Sub:        ", POINTS_PER_TIER_TWO_SUB);
console.log("Points per Tier 3 Sub:        ", POINTS_PER_TIER_THREE_SUB);
console.log("Points per $1 Donation:       ", POINTS_PER_ONE_USD_DONO);
console.log("Points per 100 Bits Donation: ", POINTS_PER_ONE_HUNDRED_BITS);

if (USE_CURRENCY) {
  console.log("INIT: Earnings Configuration:");
  console.log("Earnings per Follow:            ", EARNINGS_PER_FOLLOW);
  console.log("Earnings per Tier 1 Sub:        ", EARNINGS_PER_TIER_ONE_SUB);
  console.log("Earnings per Tier 2 Sub:        ", EARNINGS_PER_TIER_TWO_SUB);
  console.log("Earnings per Tier 3 Sub:        ", EARNINGS_PER_TIER_THREE_SUB);
  console.log("Earnings per $1 Donation:       ", EARNINGS_PER_ONE_USD_DONO);
  console.log("Earnings per 100 Bits Donation: ", EARNINGS_PER_ONE_HUNDRED_BITS);
}

// ─── points.txt setup ───────────────────────────────────────────────────────────
const pointsFilePath = path.join(__dirname, "points.txt");
const earningsFilePath = path.join(__dirname, "earnings.txt");

const writeFormattedValue = (filePath, value, options = {}) => {
  const formatted = formatNumber(value);
  const payload = options.appendSymbol ? `${formatted}${options.appendSymbol}` : formatted;
  fs.writeFileSync(filePath, payload);
};

const ensureFileWithValue = (filePath, initialValue, options = {}) => {
  if (!fs.existsSync(filePath)) {
    writeFormattedValue(filePath, initialValue, options);
  }
};

const readStoredValue = (filePath, options = {}) => {
  try {
    ensureFileWithValue(filePath, 0, options);
    const raw = fs.readFileSync(filePath, "utf-8");
    return normalizeStoredNumber(raw);
  } catch (err) {
    console.error(`Error reading file ${path.basename(filePath)}:`, err);
    return 0;
  }
};

function readPoints() {
  return readStoredValue(pointsFilePath);
}

function readEarnings() {
  return readStoredValue(earningsFilePath, { appendSymbol: CURRENCY_SYMBOL });
}

let currentPoints = USE_POINTS ? readPoints() : 0;
console.log("INIT: Current points:", formatNumber(currentPoints));

let currentEarnings = USE_CURRENCY ? readEarnings() : 0;
if (USE_CURRENCY) {
  console.log("INIT: Current earnings:", `${formatNumber(currentEarnings)}${CURRENCY_SYMBOL}`);
}

const buildDeltaLabel = (delta) => {
  const absValue = Math.abs(delta);
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${formatNumber(absValue)}`;
};

function updatePoints(pointsToAdd) {
  if (!USE_POINTS) {
    return;
  }

  const delta = Number(pointsToAdd);
  if (!Number.isFinite(delta) || delta === 0) {
    return;
  }

  try {
    if (ALWAYS_READ_IN_POINTS_TXT) {
      currentPoints = readPoints();
    }
    console.log("Updating points… Existing Points:", formatNumber(currentPoints));
    currentPoints += delta;
    console.log(
      "Points Updated (" + buildDeltaLabel(delta) + ") | Updated Current Points:",
      formatNumber(currentPoints)
    );
    writeFormattedValue(pointsFilePath, currentPoints);
  } catch (err) {
    console.error("Error writing to points file:", err);
  }
}

function updateEarnings(amountToAdd) {
  if (!USE_CURRENCY) {
    return;
  }

  const delta = Number(amountToAdd);
  if (!Number.isFinite(delta) || delta === 0) {
    return;
  }

  try {
    if (ALWAYS_READ_IN_POINTS_TXT) {
      currentEarnings = readEarnings();
    }
    console.log("Updating earnings… Existing Earnings:", formatNumber(currentEarnings));
    currentEarnings += delta;
    console.log(
      "Earnings Updated (" + buildDeltaLabel(delta) + ") | Updated Current Earnings:",
      `${formatNumber(currentEarnings)}${CURRENCY_SYMBOL}`
    );
    writeFormattedValue(earningsFilePath, currentEarnings, { appendSymbol: CURRENCY_SYMBOL });
  } catch (err) {
    console.error("Error writing to earnings file:", err);
  }
}

// ─── WebSocket + auto-reconnect logic ────────────────────────────────────────────
let ws = null;
const RECONNECT_DELAY_MS = 5000; // 5 seconds before retry

function connect() {
  console.log("→ Attempting to connect to StreamElements Astro…");
  ws = new WebSocket("wss://astro.streamelements.com");

  ws.on("open", () => {
    console.log("Connected to StreamElements Astro");

    // Subscribe once we're open
    const subscribeMessage = {
      type: "subscribe",
      nonce: uuidv4(),
      data: {
        topic: "channel.activities",
        token: JWT_TOKEN,
        token_type: "jwt",
      },
    };
    ws.send(JSON.stringify(subscribeMessage));
  });

  ws.on("message", (data) => {
    const message = JSON.parse(data);
    console.log("Message from server:", message);

    if (message.type === "response") {
      console.log("Received response:", message);
      return;
    }

    if (message.type === "message" && message.topic === "channel.activities") {
      const activity = message.data;
      switch (activity.type) {
        case "follow":
          console.log("New follower:", activity.data.username);
          updatePoints(POINTS_PER_FOLLOW);
          updateEarnings(EARNINGS_PER_FOLLOW);
          break;
        case "subscriber": {
          console.log("New subscriber:", activity.data.username, "| Tier:", activity.data.tier);
          const tier = Number(activity.data.tier);
          const amount = Number(activity.data.amount) || 0;
          if (tier === 1000) {
            updatePoints(POINTS_PER_TIER_ONE_SUB * amount);
            updateEarnings(EARNINGS_PER_TIER_ONE_SUB * amount);
          } else if (tier === 2000) {
            updatePoints(POINTS_PER_TIER_TWO_SUB * amount);
            updateEarnings(EARNINGS_PER_TIER_TWO_SUB * amount);
          } else if (tier === 3000) {
            updatePoints(POINTS_PER_TIER_THREE_SUB * amount);
            updateEarnings(EARNINGS_PER_TIER_THREE_SUB * amount);
          } else {
            // fallback if tier is unexpected
            updatePoints(POINTS_PER_TIER_ONE_SUB * amount);
            updateEarnings(EARNINGS_PER_TIER_ONE_SUB * amount);
          }
          break;
        }
        case "tip": {
          console.log("New donation (tip):", activity.data.username, "Amount:", activity.data.amount);
          const tipAmount = Number(activity.data.amount) || 0;
          updatePoints(tipAmount * POINTS_PER_ONE_USD_DONO);
          updateEarnings(tipAmount * EARNINGS_PER_ONE_USD_DONO);
          break;
        }
        case "cheer": {
          console.log("Bits donation:", activity.data.username, "Amount:", activity.data.amount);
          // Only award points per 100 bits
          const cheerAmount = Number(activity.data.amount) || 0;
          const cheerHundreds = Math.floor(cheerAmount / 100);
          updatePoints(cheerHundreds * POINTS_PER_ONE_HUNDRED_BITS);
          updateEarnings(cheerHundreds * EARNINGS_PER_ONE_HUNDRED_BITS);
          break;
        }
        default:
          console.log("Other activity:", activity.type);
      }
    }
  });

  ws.on("error", (err) => {
    // Note: “error” often fires just before “close”. Don’t reconnect here directly,
    // or you might end up with multiple overlapping attempts.
    console.error("WebSocket error:", err);
  });

  ws.on("close", (code, reason) => {
    console.warn(`Connection closed: ${code}`, reason || "<no reason>");
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
      type: "unsubscribe",
      nonce: uuidv4(),
      data: {
        topic: topic,
        token: JWT_TOKEN,
        token_type: "jwt",
      },
    };
    ws.send(JSON.stringify(msg));
  }
}
