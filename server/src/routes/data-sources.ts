import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const count = (table: string): number => (
    db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
  ).n;
  const latestFinancialYear = (
    db.prepare('SELECT MAX(fiscal_year) AS year FROM company_yearly').get() as { year: number | null }
  ).year;
  const bokYears = db.prepare(`
    SELECT MIN(reference_year) AS min_year, MAX(reference_year) AS max_year
    FROM external_industry_benchmark
  `).get() as { min_year: number | null; max_year: number | null };
  return res.json({
    sources: [
      { id: 'kodata', rows: count('company_master'), latest_year: latestFinancialYear, status: count('company_master') > 0 ? 'ready' : 'empty' },
      { id: 'btp_support', rows: count('support_episode'), status: count('support_episode') > 0 ? 'ready' : 'empty' },
      { id: 'ntis', rows: count('ntis_project'), status: count('ntis_project') > 0 ? 'ready' : 'empty' },
      {
        id: 'bok_business_analysis',
        rows: count('external_industry_benchmark'),
        min_year: bokYears.min_year,
        max_year: bokYears.max_year,
        status: count('external_industry_benchmark') > 0 ? 'ready' : 'empty',
      },
      { id: 'sasang_business_census', rows: count('regional_industry_context'), status: count('regional_industry_context') > 0 ? 'ready' : 'empty' },
      { id: 'cretop', rows: 0, status: 'not_connected' },
    ],
    policies: {
      business_registration_number_external_lookup: false,
      credit_grade_inference: false,
      missing_value_as_zero: false,
    },
  });
});

export default router;
