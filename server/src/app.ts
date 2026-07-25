import cors from 'cors';
import express from 'express';
import agentRouter from './routes/agent';
import comparisonsRouter from './routes/comparisons';
import companiesRouter from './routes/companies';
import dataSourcesRouter from './routes/data-sources';
import evidenceRouter from './routes/evidence';
import programsRouter from './routes/programs';
import reportRouter from './routes/report';
import roundsRouter from './routes/rounds';
import simulationsRouter from './routes/simulations';
import uploadRouter from './routes/upload';
import { getDbStatus } from './db/connection';

export function createApp() {
  const app = express();

  app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/api/companies', companiesRouter);
  app.use('/api/programs', programsRouter);
  app.use('/api/agent', agentRouter);
  app.use('/api/programs', uploadRouter);
  app.use('/api/reports', reportRouter);
  app.use('/api/rounds', roundsRouter);
  app.use('/api/comparisons', comparisonsRouter);
  app.use('/api/simulations', simulationsRouter);
  app.use('/api/data-sources', dataSourcesRouter);
  app.use('/api/evidence', evidenceRouter);

  app.get('/health', (_req, res) => {
    try {
      const db = getDbStatus();
      res.status(db.data_ready ? 200 : 503).json({
        status: db.data_ready ? 'ok' : 'degraded',
        db,
      });
    } catch (error) {
      res.status(503).json({ status: 'error', error: String(error) });
    }
  });

  return app;
}
