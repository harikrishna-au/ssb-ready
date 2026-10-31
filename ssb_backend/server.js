const { createApp } = require('./app');
const { loadEnv, config } = require('./config');
const { logger } = require('./utils/logger');

loadEnv();
require('./middleware/sentry').initSentry();
const app = createApp();

const server = app.listen(config.port, config.host, () => {
  logger.info(`SSB backend listening on ${config.host}:${config.port}`);
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

// Never let a stray rejection kill the process silently; log it (scrubbed) and keep serving.
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', { err: reason }));
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { err });
  process.exit(1);
});
