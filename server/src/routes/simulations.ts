import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';

const router = Router();

type Observation = {
  company_id: number;
  before_revenue: number | null;
  after_revenue: number | null;
  before_employees: number | null;
  after_employees: number | null;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

router.post('/', (req: Request, res: Response) => {
  const companyId = Number.parseInt(String(req.body?.companyId ?? ''), 10);
  const amountMillion = Number(req.body?.amountMillion);
  if (!Number.isFinite(companyId)) return res.status(400).json({ error: 'valid companyId is required' });
  if (!Number.isFinite(amountMillion) || amountMillion < 0) {
    return res.status(400).json({ error: 'amountMillion must be a non-negative number' });
  }
  const company = getDb().prepare('SELECT * FROM company_master WHERE company_id = ?').get(companyId) as {
    ksic3: string | null;
    size: string | null;
  } | undefined;
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const observations = getDb().prepare(`
    WITH first_support AS (
      SELECT company_id, MIN(as_of_fy) AS before_fy
      FROM support_episode
      WHERE as_of_fy IS NOT NULL
      GROUP BY company_id
    )
    SELECT
      m.company_id,
      y0.revenue AS before_revenue,
      y1.revenue AS after_revenue,
      COALESCE(y0.pension_enrolled, y0.employees) AS before_employees,
      COALESCE(y1.pension_enrolled, y1.employees) AS after_employees
    FROM company_master m
    JOIN first_support f ON f.company_id = m.company_id
    LEFT JOIN company_yearly y0 ON y0.company_id = m.company_id AND y0.fiscal_year = f.before_fy
    LEFT JOIN company_yearly y1 ON y1.company_id = m.company_id AND y1.fiscal_year = f.before_fy + 1
    WHERE m.ksic3 = ? AND m.size = ?
  `).all(company.ksic3, company.size) as Observation[];

  const revenueChanges = observations
    .filter(row => row.before_revenue !== null && row.before_revenue > 0 && row.after_revenue !== null)
    .map(row => (row.after_revenue! - row.before_revenue!) / row.before_revenue! * 100);
  const employmentChanges = observations
    .filter(row => row.before_employees !== null && row.after_employees !== null)
    .map(row => row.after_employees! - row.before_employees!);
  const cohortN = Math.min(revenueChanges.length, employmentChanges.length);
  const matchingLevel = cohortN >= 20 ? 'ksic3_size' : 'insufficient';

  return res.json({
    company_id: companyId,
    scenario: {
      support_amount_million: amountMillion,
      horizon_years: 1,
      type: 'observational',
    },
    cohort: {
      matching_level: matchingLevel,
      revenue_observations: revenueChanges.length,
      employment_observations: employmentChanges.length,
    },
    observed_medians: cohortN >= 20 ? {
      revenue_growth_pct: Math.round((median(revenueChanges) ?? 0) * 10) / 10,
      employment_change_persons: Math.round((median(employmentChanges) ?? 0) * 10) / 10,
    } : null,
    limitations: [
      '지원 전후 관찰값이며 지원사업의 인과효과나 미래 예측이 아님',
      '지원금 규모와 성과의 직접 관계를 추정하지 않음',
      cohortN < 20 ? '동일 KSIC3·기업규모 비교표본이 20개 미만이라 결과를 표시하지 않음' : null,
    ].filter(Boolean),
  });
});

export default router;
