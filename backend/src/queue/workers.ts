import { Queue, Worker } from "bullmq";
import net from "net";
import tls from "tls";
import { checkOverduePOs, checkBatchExpiries, checkLowStockLevels } from "./jobs/check-po-overdue.js";

// Connection variables resolved at runtime to handle ES Module load order
function getRedisConfig() {
  const cleanEnvVar = (val?: string) => (val || "").replace(/['"]/g, "").trim();

  // Extraction of Upstash settings fallback
  const upstashRestUrl = cleanEnvVar(process.env.UPSTASH_REDIS_REST_URL);
  let upstashHost = "";
  if (upstashRestUrl && upstashRestUrl.startsWith("http")) {
    try {
      upstashHost = new URL(upstashRestUrl).hostname;
    } catch (e) {
      console.error("[Background Worker] Failed to parse UPSTASH_REDIS_REST_URL:", e);
    }
  }

  const host = cleanEnvVar(process.env.REDIS_HOST) || upstashHost || "127.0.0.1";
  const port = parseInt(cleanEnvVar(process.env.REDIS_PORT) || "6379", 10);
  const password = cleanEnvVar(process.env.REDIS_PASSWORD) || cleanEnvVar(process.env.UPSTASH_REDIS_REST_TOKEN) || "";
  const tlsEnabled = cleanEnvVar(process.env.REDIS_TLS) === "true" || !!upstashRestUrl;

  return { host, port, password, tlsEnabled };
}

let useRedis = false;
let poQueue: Queue | null = null;
let expiryQueue: Queue | null = null;

function checkRedisConnection(): Promise<boolean> {
  const { host, port, tlsEnabled } = getRedisConfig();
  
  return new Promise((resolve) => {
    let socket: any;

    if (tlsEnabled) {
      // Connect over TLS/SSL
      socket = tls.connect(port, host, { rejectUnauthorized: false });
    } else {
      // Connect over regular TCP
      socket = new net.Socket();
      socket.connect(port, host);
    }

    socket.setTimeout(2500);
    
    const cleanupAndResolve = (result: boolean) => {
      if (socket) {
        socket.destroy();
      }
      resolve(result);
    };

    socket.once("connect", () => {
      cleanupAndResolve(true);
    });

    socket.once("secureConnect", () => {
      cleanupAndResolve(true);
    });
    
    socket.once("timeout", () => {
      cleanupAndResolve(false);
    });
    
    socket.once("error", (err: any) => {
      console.warn(`[Background Worker] TCP check connection failed to ${host}:${port}:`, err.message);
      cleanupAndResolve(false);
    });
  });
}

export async function initBackgroundSchedules() {
  console.log("[Background Worker] Initializing background schedules...");

  const { host, port, password, tlsEnabled } = getRedisConfig();

  // Trigger initial scans immediately on startup so alerts are up-to-date
  console.log("[Background Worker] Running initial database checks on startup...");
  runScans().catch((err) => console.error("[Background Worker] Initial startup scan failed:", err));

  // Perform active connection check to avoid BullMQ ECONNREFUSED spam
  const redisAlive = await checkRedisConnection();
  if (!redisAlive) {
    console.warn(`[Background Worker] Redis server is NOT running on ${host}:${port}. Bypassing BullMQ and falling back to in-memory interval schedulers.`);
    setupFallbackIntervals();
    return;
  }

  try {
    const connection: any = {
      host,
      port,
      maxRetriesPerRequest: null, // BullMQ requires maxRetriesPerRequest to be null for IORedis when using customized options
    };

    if (password) {
      connection.password = password;
      connection.username = "default";
    }

    if (tlsEnabled) {
      connection.tls = {};
    }
    
    poQueue = new Queue("po-overdue-queue", { connection });
    expiryQueue = new Queue("batch-expiry-queue", { connection });

    // Define workers
    const worker = new Worker(
      "po-overdue-queue",
      async (job) => {
        if (job.name === "check-overdue") {
          await checkOverduePOs();
        }
      },
      { connection }
    );

    const expiryWorker = new Worker(
      "batch-expiry-queue",
      async (job) => {
        if (job.name === "check-expiry") {
          await checkBatchExpiries();
        }
      },
      { connection }
    );

    worker.on("failed", (job, err) => {
      console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err);
    });

    // Schedule repeatable jobs in BullMQ (hourly PO overdue, daily batch expiry)
    await poQueue.add("check-overdue", {}, {
      repeat: { pattern: "0 * * * *" } // hourly
    });
    
    await expiryQueue.add("check-expiry", {}, {
      repeat: { pattern: "0 0 * * *" } // daily at midnight
    });

    useRedis = true;
    console.log(`[Background Worker] BullMQ scheduled jobs configured via Redis at ${host}:${port}`);

  } catch (error: any) {
    console.warn(`[Background Worker] Redis initialization failed (${error.message}). Falling back to pure Node.js in-memory interval schedulers.`);
    setupFallbackIntervals();
  }
}

async function runScans() {
  await checkOverduePOs();
  await checkBatchExpiries();
  await checkLowStockLevels();
}

function setupFallbackIntervals() {
  console.log("[Background Worker] Initializing fallback in-memory intervals (No Redis dependency)...");

  // Run PO overdue check every hour
  const hourly = 60 * 60 * 1000;
  setInterval(async () => {
    console.log("[Background Worker Fallback] Triggering scheduled PO overdue check...");
    await checkOverduePOs();
  }, hourly);

  // Run Batch Expiry check every 12 hours (fallback standard)
  const twelveHours = 12 * 60 * 60 * 1000;
  setInterval(async () => {
    console.log("[Background Worker Fallback] Triggering scheduled Batch Expiry check...");
    await checkBatchExpiries();
  }, twelveHours);

  // Run Low Stock scan check every 30 minutes
  const thirtyMinutes = 30 * 60 * 1000;
  setInterval(async () => {
    console.log("[Background Worker Fallback] Triggering scheduled Low Stock scan check...");
    await checkLowStockLevels();
  }, thirtyMinutes);
}
