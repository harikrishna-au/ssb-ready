/**
 * AWS Lambda entry point. The same Express app as server.js, wrapped for a Lambda Function URL.
 * Environment variables come from the function configuration (there is no .env file in the package).
 */
const serverlessExpress = require('@vendia/serverless-express');
const { loadEnv } = require('./config');

loadEnv();
require('./middleware/sentry').initSentry();
const { createApp } = require('./app');

// Built once per warm container, reused across requests.
let handler;
exports.handler = (event, context) => {
  handler ||= serverlessExpress({ app: createApp() });
  return handler(event, context);
};
