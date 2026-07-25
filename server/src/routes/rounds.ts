import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import {
  parseDateOnly,
  parsePositiveInteger,
  parseUniquePositiveIntegerIds,
  sendApiError,
} from '../lib/http';
import { buildReport, fiscalYearAvailableAt } from '../lib/report-engine';

const router = Router();

const SORT_GETTERS: Record<string, (report: NonNullable<ReturnType<typeof buildReport>>) => number | string | null> = {
  company_id: report => report.company_id,
  revenue: report => report.survival_indicators.find(item => item.code === 'revenue_level')?.value ?? null,
  revenue_growth: report => report.survival_indicators.find(item => item.code === 'revenue_growth')?.value ?? null,
  operating_margin: report => report.reference_indicators.find(item => item.code === 'operating_margin')?.value ?? null,
  debt_ratio: report => report.reference_indicators.find(item => item.code === 'debt_ratio')?.value ?? null,
  employees: report => report.survival_indicators.find(item => item.code === 'employment_level')?.value ?? null,
  support_episodes: report => report.support_summary.total_episodes,
  program_fit: report => report.program_context?.program_fit_score ?? null,
};

router.post('/', (req: Request, res: Response) => {
  const programId = typeof req.body?.programId === 'string' ? req.body.programId : null;
  const candidateIds = parseUniquePositiveIntegerIds(req.body?.companyIds);
  const requestedDate = req.body?.asOfDate ?? new Date().toISOString().slice(0, 10);
  const parsedDate = parseDateOnly(requestedDate);
  if (!parsedDate) return sendApiError(res, 400, 'INVALID_AS_OF_DATE', 'asOfDate must be a valid YYYY-MM-DD date');
  if (!candidateIds || candidateIds.length === 0 || candidateIds.length > 200) {
    return sendApiError(
      res,
      400,
      'INVALID_COMPANY_IDS',
      'companyIds must contain 1-200 unique positive integer IDs',
    );
  }
  if (programId && !getDb().prepare('SELECT 1 FROM program_master WHERE program_id = ?').get(programId)) {
    return sendApiError(res, 404, 'PROGRAM_NOT_FOUND', 'Program not found');
  }
  const existingIds = new Set((getDb().prepare(`
    SELECT company_id FROM company_master
    WHERE company_id IN (${candidateIds.map(() => '?').join(',')})
  `).all(...candidateIds) as Array<{ company_id: number }>).map(row => row.company_id));
  const missingCompanyIds = candidateIds.filter(companyId => !existingIds.has(companyId));
  if (missingCompanyIds.length > 0) {
    return sendApiError(res, 404, 'COMPANY_NOT_FOUND', 'One or more companies were not found', {
      companyIds: missingCompanyIds,
    });
  }

  const roundId = `round-${crypto.randomUUID()}`;
  const asOfFy = fiscalYearAvailableAt(parsedDate.date);
  try {
    getDb().transaction(() => {
      getDb().prepare(`
        INSERT INTO round_master (round_id, program_id, as_of_date, as_of_fy, status)
        VALUES (?, ?, ?, ?, 'active')
      `).run(roundId, programId, parsedDate.text, asOfFy);
      const insert = getDb().prepare(`
        INSERT INTO round_candidate (round_id, company_id, application_status, reviewer_status)
        VALUES (?, ?, 'submitted', 'pending')
      `);
      for (const companyId of candidateIds) insert.run(roundId, companyId);
    })();
    return res.status(201).json({
      roundId,
      programId,
      asOfDate: parsedDate.text,
      asOfFy,
      candidateCount: candidateIds.length,
    });
  } catch {
    return sendApiError(res, 500, 'ROUND_CREATE_FAILED', 'Unable to create the review round');
  }
});

router.post('/:id/selection-scenarios', (req: Request, res: Response) => {
  const roundId = String(req.params.id);
  if (!getDb().prepare('SELECT 1 FROM round_master WHERE round_id = ?').get(roundId)) {
    return sendApiError(res, 404, 'ROUND_NOT_FOUND', 'Round not found');
  }
  const targetCount = parsePositiveInteger(req.body?.targetCount ?? 5);
  if (!targetCount || targetCount > 50) {
    return sendApiError(res, 400, 'INVALID_TARGET_COUNT', 'targetCount must be an integer between 1 and 50');
  }
  const selectedIds = parseUniquePositiveIntegerIds(req.body?.selectedCompanyIds);
  if (!selectedIds) {
    return sendApiError(
      res,
      400,
      'INVALID_SELECTED_COMPANY_IDS',
      'selectedCompanyIds must contain unique positive integer IDs',
    );
  }
  if (selectedIds.length !== targetCount) {
    return sendApiError(
      res,
      400,
      'SELECTION_COUNT_MISMATCH',
      `selectedCompanyIds must contain exactly ${targetCount} unique IDs`,
    );
  }
  const candidateIds = new Set((getDb().prepare(
    'SELECT company_id FROM round_candidate WHERE round_id = ?'
  ).all(roundId) as Array<{ company_id: number }>).map(row => row.company_id));
  if (selectedIds.some(companyId => !candidateIds.has(companyId))) {
    return sendApiError(
      res,
      400,
      'NON_CANDIDATE_SELECTED',
      'selectedCompanyIds contains a non-candidate company',
    );
  }
  const reports = selectedIds
    .map(companyId => buildReport(companyId, roundId))
    .filter((report): report is NonNullable<typeof report> => Boolean(report));
  const industryDistribution = reports.reduce<Record<string, number>>((accumulator, report) => {
    const industry = report.company_profile.ksic11?.slice(0, 3) || '미상';
    accumulator[industry] = (accumulator[industry] || 0) + 1;
    return accumulator;
  }, {});
  const riskCounts = reports.reduce((accumulator, report) => {
    if (report.summary_checks.some(check => check.status === 'red')) accumulator.red += 1;
    else if (report.summary_checks.some(check => check.status === 'yellow')) accumulator.yellow += 1;
    else accumulator.no_critical_signal += 1;
    return accumulator;
  }, { red: 0, yellow: 0, no_critical_signal: 0 });
  const fitScores = reports
    .map(report => report.program_context?.program_fit_score)
    .filter((value): value is number => value !== null && value !== undefined);

  return res.json({
    round_id: roundId,
    target_count: targetCount,
    selected_company_ids: selectedIds,
    composition: {
      industry_distribution: industryDistribution,
      risk_signal_counts: riskCounts,
      no_prior_support_count: reports.filter(report => report.support_summary.total_episodes === 0).length,
      low_data_quality_count: reports.filter(report => report.data_quality.status === 'low').length,
      average_program_fit_score: fitScores.length > 0
        ? Math.round(fitScores.reduce((sum, value) => sum + value, 0) / fitScores.length * 10) / 10
        : null,
    },
    disclaimer: '선택안을 평가하거나 추천하지 않고 선택된 기업 묶음의 데이터 구성을 요약함',
  });
});

router.get('/:id/candidates', (req: Request, res: Response) => {
  const roundId = String(req.params.id);
  const round = getDb().prepare('SELECT * FROM round_master WHERE round_id = ?').get(roundId);
  if (!round) return sendApiError(res, 404, 'ROUND_NOT_FOUND', 'Round not found');
  const [requestedSort = 'company_id', requestedDirection = 'asc'] = String(req.query.sort || '').split(':');
  const sortKey = SORT_GETTERS[requestedSort] ? requestedSort : 'company_id';
  const direction = requestedDirection === 'desc' ? -1 : 1;
  const candidates = getDb().prepare(`
    SELECT company_id, application_status, reviewer_status
    FROM round_candidate
    WHERE round_id = ?
  `).all(roundId) as Array<{ company_id: number; application_status: string; reviewer_status: string }>;
  const items = candidates
    .map(candidate => {
      const report = buildReport(candidate.company_id, roundId);
      if (!report) return null;
      return {
        company_id: candidate.company_id,
        alias_label: report.company_profile.name_alias,
        application_status: candidate.application_status,
        reviewer_status: candidate.reviewer_status,
        gate_status: report.program_context?.gate_status ?? null,
        program_fit_score: report.program_context?.program_fit_score ?? null,
        values: Object.fromEntries(Object.entries(SORT_GETTERS).map(([key, getter]) => [key, getter(report)])),
        data_quality: report.data_quality,
        risk_signals: report.summary_checks.filter(check => check.status === 'red' || check.status === 'yellow'),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      const a = left.values[sortKey];
      const b = right.values[sortKey];
      if (a === null && b === null) return left.company_id - right.company_id;
      if (a === null) return 1;
      if (b === null) return -1;
      const comparison = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a).localeCompare(String(b));
      return comparison * direction || left.company_id - right.company_id;
    });
  return res.json({ round_id: roundId, sort: `${sortKey}:${direction === 1 ? 'asc' : 'desc'}`, items });
});

router.put('/:id/candidates/:companyId', (req: Request, res: Response) => {
  const allowed = new Set(['pending', 'reviewing', 'shortlisted', 'selected', 'rejected']);
  const reviewerStatus = String(req.body?.reviewerStatus || '');
  if (!allowed.has(reviewerStatus)) {
    return sendApiError(res, 400, 'INVALID_REVIEWER_STATUS', 'invalid reviewerStatus');
  }
  const roundId = String(req.params.id);
  const companyId = parsePositiveInteger(req.params.companyId);
  if (!companyId) return sendApiError(res, 400, 'INVALID_COMPANY_ID', 'companyId must be a positive integer');
  const result = getDb().prepare(`
    UPDATE round_candidate SET reviewer_status = ? WHERE round_id = ? AND company_id = ?
  `).run(reviewerStatus, roundId, companyId);
  if (result.changes === 0) return sendApiError(res, 404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
  return res.json({ roundId, companyId, reviewerStatus });
});

export default router;
