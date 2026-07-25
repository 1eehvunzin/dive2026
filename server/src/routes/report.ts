import { Router, Request, Response } from 'express';
import { buildReport } from '../lib/report-engine';

const router = Router();

// GET /api/report/:company_id?round_id=xxx
router.get('/:company_id', (req: Request, res: Response) => {
  const companyId = parseInt(req.params['company_id'] as string, 10);
  if (isNaN(companyId)) {
    return res.status(400).json({ error: 'company_id must be a number' });
  }

  const roundId = (req.query.round_id as string) || null;

  try {
    const report = buildReport(companyId, roundId);
    if (!report) {
      return res.status(404).json({ error: `Company ${companyId} not found` });
    }
    return res.json(report);
  } catch (err) {
    console.error(`[report] error for company ${companyId}:`, err);
    return res.status(500).json({ error: 'Report generation failed' });
  }
});

export default router;
