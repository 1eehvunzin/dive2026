import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import { parseUniquePositiveIntegerIds, sendApiError } from '../lib/http';
import { buildReport, RoundNotFoundError } from '../lib/report-engine';

const router = Router();
const ALLOWED_METRICS = new Set([
  'revenue_level', 'revenue_growth', 'employment_level', 'operating_margin',
  'debt_ratio', 'rd_intensity', 'support_episode_count', 'support_total_million',
  'valid_patent_count', 'program_fit_score',
]);

router.post('/', (req: Request, res: Response) => {
  const companyIds = parseUniquePositiveIntegerIds(req.body?.companyIds);
  const roundId = typeof req.body?.roundId === 'string' ? req.body.roundId : null;
  if (!companyIds || companyIds.length < 2 || companyIds.length > 50) {
    return sendApiError(
      res,
      400,
      'INVALID_COMPANY_IDS',
      'companyIds must contain 2-50 unique positive integer IDs',
    );
  }
  const requestedMetrics = req.body?.metrics;
  if (requestedMetrics !== undefined && !Array.isArray(requestedMetrics)) {
    return sendApiError(res, 400, 'INVALID_METRICS', 'metrics must be an array');
  }
  const metrics = Array.isArray(requestedMetrics)
    ? [...new Set(requestedMetrics.map(String))]
    : [...ALLOWED_METRICS];
  const invalidMetrics = metrics.filter(metric => !ALLOWED_METRICS.has(metric));
  if (invalidMetrics.length > 0 || metrics.length === 0) {
    return sendApiError(res, 400, 'INVALID_METRICS', 'metrics contains unsupported values', {
      metrics: invalidMetrics,
      allowed: [...ALLOWED_METRICS],
    });
  }
  const existingIds = new Set((getDb().prepare(`
    SELECT company_id FROM company_master
    WHERE company_id IN (${companyIds.map(() => '?').join(',')})
  `).all(...companyIds) as Array<{ company_id: number }>).map(row => row.company_id));
  const missingCompanyIds = companyIds.filter(companyId => !existingIds.has(companyId));
  if (missingCompanyIds.length > 0) {
    return sendApiError(res, 404, 'COMPANY_NOT_FOUND', 'One or more companies were not found', {
      companyIds: missingCompanyIds,
    });
  }

  let rows;
  try {
    rows = companyIds.map(companyId => {
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
  } catch (err) {
    if (err instanceof RoundNotFoundError) {
      return sendApiError(res, 404, 'ROUND_NOT_FOUND', 'Round not found');
    }
    return sendApiError(res, 500, 'COMPARISON_FAILED', 'Unable to compare companies');
  }
  return res.json({ round_id: roundId, metrics, rows });
});

export default router;
