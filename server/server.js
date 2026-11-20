// require('dotenv').config();
// const http = require('http');
// const app = require('./app');
// const connectDB = require('./config/db');
// const { initCronJobs } = require('./jobs/cronScheduler');

// const PORT = process.env.PORT || 4000;

// const startServer = async () => {
//   // Connect to Database
//   await connectDB();

//   // Initialize automated cron jobs
//   initCronJobs();

//   // Create HTTP server
//   const server = http.createServer(app);

//   server.listen(PORT, () => {
//     console.log(`=======================================================`);
//     console.log(` PROPRENT ERP SERVER RUNNING ON PORT: ${PORT}`);
//     console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
//     console.log(` API Endpoint: http://localhost:${PORT}/api`);
//     console.log(` Health Check: http://localhost:${PORT}/api/health`);
//     console.log(`=======================================================`);
//   });

//   // Handle unhandled promise rejections
//   process.on('unhandledRejection', (err) => {
//     console.error(`[Unhandled Rejection] Error: ${err.message}`);
//     // Keep server running in development
//   });

//   process.on('SIGTERM', () => {
//     console.log('[Process] SIGTERM received. Gracefully shutting down.');
//     server.close(() => {
//       console.log('[Process] Server terminated.');
//     });
//   });
// };

// startServer();




require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initCronJobs } = require('./jobs/cronScheduler');

const PORT = process.env.PORT || 4000;
const isVercel = !!process.env.VERCEL;

// Serverless ke liye: DB connection ek baar banao aur reuse karo
let dbPromise = null;
const ensureDB = () => {
  if (!dbPromise) {
    dbPromise = connectDB().catch((err) => {
      dbPromise = null; // agli request pe dobara try ho
      throw err;
    });
  }
  return dbPromise;
};

// ---------- Vercel (serverless) ----------
// Har request se pehle DB connect hota hai, phir Express handle karta hai
const handler = async (req, res) => {
  try {
    await ensureDB();
    return app(req, res);
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Database connection failed' }));
  }
};

// ---------- Local development ----------
const startServer = async () => {
  await ensureDB();
  initCronJobs();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` PROPRENT ERP SERVER RUNNING ON PORT: ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` API Endpoint: http://localhost:${PORT}/api`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });

  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Rejection] Error: ${err.message}`);
  });

  process.on('SIGTERM', () => {
    console.log('[Process] SIGTERM received. Gracefully shutting down.');
    server.close(() => console.log('[Process] Server terminated.'));
  });
};

if (!isVercel) {
  startServer();
}

module.exports = handler;