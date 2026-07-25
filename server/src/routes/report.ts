import { Router, Request, Response } from 'express';
import { buildReport, RoundNotFoundError } from '../lib/report-engine';

const router = Router();

// GET /api/reports/:company_id?round_id=xxx&as_of_date=YYYY-MM-DD
router.get('/:company_id', (req: Request, res: Response) => {
  const companyId = parseInt(req.params['company_id'] as string, 10);
  if (isNaN(companyId)) {
    return res.status(400).json({ error: 'company_id must be a number' });
  }

  const roundId = (req.query.round_id as string) || null;
  const asOfDate = (req.query.as_of_date as string) || null;

  try {
    const report = buildReport(companyId, roundId, asOfDate);
    if (!report) {
      return res.status(404).json({ error: `Company ${companyId} not found` });
    }
    return res.json(report);
  } catch (err) {
    if (err instanceof RoundNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof Error && err.message === 'Invalid as_of_date') {
      return res.status(400).json({ error: err.message });
    }
    console.error(`[report] error for company ${companyId}:`, err);
    return res.status(500).json({ error: 'Report generation failed' });
  }
});

export default router;
