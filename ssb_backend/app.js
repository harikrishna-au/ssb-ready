const express = require('express');
const cors = require('cors');
const { requestContext } = require('./middleware/requestContext');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const piqRoutes = require('./routes/piqRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const healthRoutes = require('./routes/healthRoutes');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestContext);

  app.get('/', (_req, res) => {
    res.json({
      service: 'ssb-backend',
      status: 'ok'
    });
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api', assessmentRoutes);
  app.use('/api/piq', piqRoutes);
  app.use('/api/interview', interviewRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
