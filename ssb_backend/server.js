const { createApp } = require('./app');
const { loadEnv } = require('./config/env');
const { logger } = require('./utils/logger');

loadEnv();
const app = createApp();

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`SSB backend listening on ${HOST}:${PORT}`);
});

const gracefulShutdown = (signal) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);
  server.close((error) => {
    if (error) {
      logger.error(`Shutdown failed: ${error.message}`);
      process.exit(1);
    }
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
