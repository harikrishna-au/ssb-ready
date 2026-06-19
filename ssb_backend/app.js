const express = require('express');
const cors = require('cors');
const { config, getCorsOriginOption } = require('./config');
const { requestContext } = require('./middleware/requestContext');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const interviewRoutes = require('./routes/interviewRoutes');
const healthRoutes = require('./routes/healthRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const firestoreRoutes = require('./routes/firestoreRoutes');
const ppdtRoutes = require('./routes/ppdtRoutes');
const tatRoutes = require('./routes/tatRoutes');
const evaluationPipelineRoutes = require('./routes/evaluationPipelineRoutes');
const legalRoutes = require('./routes/legalRoutes');

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

  app.get('/', (req, res) => {
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    const base =
      config.publicUrl ||
      (host ? `${proto}://${host}`.replace(/\/+$/, '') : '');

    const payload = {
      service: 'ssb-backend',
      status: 'ok',
      legal: {
        privacyPolicy: base ? `${base}/privacy` : '/privacy'
      }
    };
    if (config.publicUrl) {
      payload.publicUrl = config.publicUrl;
    }
    res.json(payload);
  });

  app.use('/', legalRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/evaluate', evaluationRoutes);
  app.use('/api/evaluation', evaluationPipelineRoutes);
  app.use('/api/firestore', firestoreRoutes);
  app.use('/api/ppdt', ppdtRoutes);
  app.use('/api/tat', tatRoutes);
  app.use('/api/interview', interviewRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
