require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initCronJobs } = require('./jobs/cronScheduler');

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Initialize automated cron jobs
  initCronJobs();

  // Create HTTP server
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` PROPRENT ERP SERVER RUNNING ON PORT: ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` API Endpoint: http://localhost:${PORT}/api`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Rejection] Error: ${err.message}`);
    // Keep server running in development
  });

  process.on('SIGTERM', () => {
    console.log('[Process] SIGTERM received. Gracefully shutting down.');
    server.close(() => {
      console.log('[Process] Server terminated.');
    });
  });
};

startServer();
