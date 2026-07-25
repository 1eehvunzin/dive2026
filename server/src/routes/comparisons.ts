import { Router, Request, Response } from 'express';
import { buildReport } from '../lib/report-engine';

const router = Router();
const ALLOWED_METRICS = new Set([
  'revenue_level', 'revenue_growth', 'employment_level', 'operating_margin',
  'debt_ratio', 'rd_intensity', 'support_episode_count', 'support_total_million',
  'valid_patent_count', 'program_fit_score',
]);

router.post('/', (req: Request, res: Response) => {
  const companyIds: number[] = Array.isArray(req.body?.companyIds)
    ? [...new Set<number>(req.body.companyIds
        .map((value: unknown) => Number.parseInt(String(value), 10))
        .filter((value: number) => Number.isFinite(value)))]
    : [];
  const roundId = typeof req.body?.roundId === 'string' ? req.body.roundId : null;
  const metrics = Array.isArray(req.body?.metrics)
    ? req.body.metrics.map(String).filter((metric: string) => ALLOWED_METRICS.has(metric))
    : [...ALLOWED_METRICS];
  if (companyIds.length < 2 || companyIds.length > 50) {
    return res.status(400).json({ error: 'companyIds must contain 2-50 unique IDs' });
  }

  const rows = companyIds.map(companyId => {
    const report = buildReport(companyId, roundId);
    if (!report) return { company_id: companyId, error: 'Company not found' };
    const indicators = new Map(
      [...report.survival_indicators, ...report.reference_indicators].map(item => [item.code, item])
    );
    const values: Record<string, unknown> = {};
    for (const metric of metrics) {
      if (indicators.has(metric)) values[metric] = indicators.get(metric);
      else if (metric === 'support_episode_count') values[metric] = report.support_summary.total_episodes;
      else if (metric === 'support_total_million') values[metric] = report.support_summary.total_amount_million;
      else if (metric === 'valid_patent_count') values[metric] = report.technology_evidence.valid_patent_count;
      else if (metric === 'program_fit_score') values[metric] = report.program_context?.program_fit_score ?? null;
    }
    return {
      company_id: companyId,
      alias_label: report.company_profile.name_alias,
      industry: report.company_profile.ind_name,
      gate_status: report.program_context?.gate_status ?? null,
      data_quality: report.data_quality,
      values,
    };
  });
  return res.json({ round_id: roundId, metrics, rows });
});

export default router;
