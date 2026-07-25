import type { CompanyMaster, CompanyYearly, SimilarCompany } from './types';
import { getDb } from '../db/connection';

const MIN_N = 20;

const COHORT_STEPS = [
  { level: 'ksic3_size', condition: 'm.ksic3 = ? AND m.size = ?', keys: ['ksic3', 'size'] as const },
  { level: 'ksic3', condition: 'm.ksic3 = ?', keys: ['ksic3'] as const },
  { level: 'ksic2_size', condition: 'm.ksic2 = ? AND m.size = ?', keys: ['ksic2', 'size'] as const },
  { level: 'ksic2', condition: 'm.ksic2 = ?', keys: ['ksic2'] as const },
];

type CandidateRow = CompanyYearly & {
  ind_name: string | null;
  size: string | null;
  region: string | null;
};

function featureDistance(target: CompanyYearly, candidate: CompanyYearly): {
  distance: number;
  compared: string[];
} {
  const terms: number[] = [];
  const compared: string[] = [];

  const addLogDistance = (code: string, left: number | null, right: number | null) => {
    if (left === null || right === null || left < 0 || right < 0) return;
    terms.push(Math.abs(Math.log1p(left) - Math.log1p(right)));
    compared.push(code);
  };
  const addScaledDistance = (code: string, left: number | null, right: number | null, scale: number) => {
    if (left === null || right === null) return;
    terms.push(Math.abs(left - right) / scale);
    compared.push(code);
  };

  addLogDistance('revenue', target.revenue, candidate.revenue);
  addLogDistance(
    'employees',
    target.pension_enrolled ?? target.employees,
    candidate.pension_enrolled ?? candidate.employees,
  );
  addScaledDistance('operating_margin', target.op_margin_pct, candidate.op_margin_pct, 20);
  const targetDebt = target.equity !== null && target.equity > 0 && target.liabilities !== null
    ? target.liabilities / target.equity * 100
    : null;
  const candidateDebt = candidate.equity !== null && candidate.equity > 0 && candidate.liabilities !== null
    ? candidate.liabilities / candidate.equity * 100
    : null;
  addScaledDistance('debt_ratio', targetDebt, candidateDebt, 200);

  return {
    distance: terms.length === 0
      ? Number.POSITIVE_INFINITY
      : terms.reduce((sum, value) => sum + value, 0) / terms.length,
    compared,
  };
}

export function findSimilarCompanies(
  master: CompanyMaster,
  targetYearly: CompanyYearly | null,
  asOfFy: number,
): SimilarCompany[] {
  if (!targetYearly) return [];
  const db = getDb();

  for (const step of COHORT_STEPS) {
    const params = step.keys.map(key => master[key]);
    if (params.some(value => value === null)) continue;

    const rows = db.prepare(`
      SELECT y.*, m.ind_name, m.size, m.region
      FROM company_master m
      JOIN company_yearly y
        ON y.company_id = m.company_id
       AND y.fiscal_year = ?
      WHERE ${step.condition}
        AND m.company_id != ?
        AND m.closed_flag = 0
    `).all(asOfFy, ...params, master.company_id) as CandidateRow[];

    if (rows.length < MIN_N) continue;

    return rows
      .map(row => {
        const similarity = featureDistance(targetYearly, row);
        return {
          company_id: row.company_id,
          ind_name: row.ind_name,
          size: row.size,
          region: row.region,
          cohort_level: step.level,
          distance: Math.round(similarity.distance * 10_000) / 10_000,
          compared_metrics: similarity.compared,
        };
      })
      .filter(row => Number.isFinite(row.distance) && row.compared_metrics.length >= 2)
      .sort((left, right) => left.distance - right.distance || left.company_id - right.company_id)
      .slice(0, 5);
  }

  return [];
}
