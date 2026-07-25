import { Router } from 'express';
import { buildReport } from '../lib/report-engine';

const router = Router();

router.get('/:id', (req, res) => {
  const evidenceId = String(req.params.id);
  const match = evidenceId.match(/^kodata:(\d+):(\d+|latest):([a-z0-9_]+)$/);
  if (!match) return res.status(400).json({ error: 'invalid evidence id' });
  const companyId = Number.parseInt(match[1], 10);
  const requestedYear = match[2] === 'latest' ? null : Number.parseInt(match[2], 10);
  const report = buildReport(
    companyId,
    null,
    requestedYear === null ? null : `${requestedYear + 1}-05-01`,
  );
  if (!report) return res.status(404).json({ error: 'Company not found' });
  const evidence = report.evidence.find(item => item.evidence_id === evidenceId);
  if (!evidence) return res.status(404).json({ error: 'Evidence not found' });
  return res.json(evidence);
});

export default router;
