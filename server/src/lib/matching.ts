import type { SimilarCompany, CompanyMaster } from './types';
import { getDb } from '../db/connection';

const MIN_N = 20;

const COHORT_STEPS = [
  { level: 'ksic3_size', cols: ['m.ksic3 = ? AND m.size = ?', 'ksic3', 'size'] as const },
  { level: 'ksic3', cols: ['m.ksic3 = ?', 'ksic3'] as const },
  { level: 'ksic2_size', cols: ['m.ksic2 = ? AND m.size = ?', 'ksic2', 'size'] as const },
  { level: 'ksic2', cols: ['m.ksic2 = ?', 'ksic2'] as const },
  { level: 'all', cols: ['1=1'] as const },
];

export function findSimilarCompanies(master: CompanyMaster): SimilarCompany[] {
  const db = getDb();

  for (const step of COHORT_STEPS) {
    const condition = step.cols[0] as string;
    const keyFields = step.cols.slice(1) as string[];

    const params: (string | null)[] = keyFields.map(k => (master as any)[k]);

    // 먼저 자기 자신 제외하고 정상기업 중 count
    const countSql = `
      SELECT COUNT(*) as n FROM company_master m
      WHERE ${condition} AND m.company_id != ? AND m.closed_flag = 0
    `;
    const countRow = db.prepare(countSql).get([...params, master.company_id]) as { n: number };

    if (countRow.n < MIN_N) continue;

    // 최대 5개 샘플링
    const sql = `
      SELECT m.company_id, m.ind_name, m.size, m.region
      FROM company_master m
      WHERE ${condition} AND m.company_id != ? AND m.closed_flag = 0
      ORDER BY RANDOM()
      LIMIT 5
    `;
    const rows = db.prepare(sql).all([...params, master.company_id]) as Array<{
      company_id: number; ind_name: string | null; size: string | null; region: string | null;
    }>;

    return rows.map(r => ({ ...r, cohort_level: step.level }));
  }

  return [];
}
