const express = require('express');
const cors = require('cors');
const { config, getCorsOriginOption } = require('./config');
const { requestContext } = require('./middleware/requestContext');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const piqRoutes = require('./routes/piqRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const healthRoutes = require('./routes/healthRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const firestoreRoutes = require('./routes/firestoreRoutes');
const ppdtRoutes = require('./routes/ppdtRoutes');
const tatRoutes = require('./routes/tatRoutes');
const evaluationPipelineRoutes = require('./routes/evaluationPipelineRoutes');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: getCorsOriginOption(),
      credentials: true
    })
  );
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestContext);

  app.get('/', (_req, res) => {
    const payload = {
      service: 'ssb-backend',
      status: 'ok'
    };
    if (config.publicUrl) {
      payload.publicUrl = config.publicUrl;
    }
    res.json(payload);
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/evaluate', evaluationRoutes);
  app.use('/api/evaluation', evaluationPipelineRoutes);
  app.use('/api/firestore', firestoreRoutes);
  app.use('/api/ppdt', ppdtRoutes);
  app.use('/api/tat', tatRoutes);
  app.use('/api', assessmentRoutes);
  app.use('/api/piq', piqRoutes);
  app.use('/api/interview', interviewRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
