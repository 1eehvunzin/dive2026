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

const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

function normalizeOrigin(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveAllowedOrigins(configured = process.env.FRONTEND_ORIGINS): string[] {
  const requested = configured
    ? configured.split(',').map(normalizeOrigin).filter((value): value is string => Boolean(value))
    : [];
  return [...new Set([...DEFAULT_FRONTEND_ORIGINS, ...requested])];
}

export function createApp() {
  const app = express();
  const allowedOrigins = new Set(resolveAllowedOrigins());

  app.use(cors({
    origin(origin, callback) {
      // Requests without Origin are server-to-server/CLI calls. Browser origins must
      // be explicitly present in the local defaults or FRONTEND_ORIGINS.
      const vercelApp = Boolean(origin && /^https:\/\/[^.]+\.vercel\.app$/.test(origin));
      callback(null, !origin || allowedOrigins.has(origin) || vercelApp);
    },
  }));
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

  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found', code: 'ENDPOINT_NOT_FOUND' });
  });

  app.use((
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : null;
    if (status === 400) {
      return res.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_JSON' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  return app;
}
