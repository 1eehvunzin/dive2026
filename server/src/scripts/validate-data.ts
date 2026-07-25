import assert from 'node:assert/strict';
import path from 'node:path';
import Database from 'better-sqlite3';

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : null;
}

const dbPath = path.resolve(argumentValue('--db') ?? process.env.DB_PATH ?? path.resolve(__dirname, '../../dive2026.db'));
const db = new Database(dbPath, { readonly: true, fileMustExist: true });

try {
  const companyCount = (db.prepare(
    'SELECT COUNT(*) AS n FROM company_master'
  ).get() as { n: number }).n;
  const revenue2024 = (db.prepare(`
    SELECT COUNT(*) AS n
    FROM company_yearly
    WHERE fiscal_year = 2024 AND revenue IS NOT NULL
  `).get() as { n: number }).n;
  const revenueAvailabilityPct = Math.round(revenue2024 / companyCount * 1_000) / 10;
  const supportTotalThousandWon = (db.prepare(
    'SELECT COALESCE(SUM(total_amount), 0) AS total FROM support_episode'
  ).get() as { total: number }).total;
  const supportTotalEokWon = Math.round(supportTotalThousandWon / 100_000 * 100) / 100;
  const benchmarkCodes = (db.prepare(`
    SELECT DISTINCT metric_code
    FROM external_industry_benchmark
    ORDER BY metric_code
  `).all() as Array<{ metric_code: string }>).map(row => row.metric_code);
  const pctl2124 = Object.fromEntries((db.prepare(`
    SELECT metric_code, pctl
    FROM company_percentile
    WHERE company_id = 2124
      AND as_of_fy = 2024
      AND metric_code IN ('revenue_level', 'revenue_growth')
  `).all() as Array<{ metric_code: string; pctl: number }>).map(row => [row.metric_code, row.pctl]));

  assert.equal(companyCount, 2_886, 'company_master count');
  assert.equal(revenue2024, 2_201, 'valid 2024 revenue count');
  assert.equal(revenueAvailabilityPct, 76.3, '2024 revenue availability');
  assert.equal(supportTotalThousandWon, 264_045_056, 'support total (thousand KRW)');
  assert.equal(supportTotalEokWon, 2_640.45, 'support total (억원)');
  assert.ok(benchmarkCodes.every(code => /[a-z_]/.test(code)), 'numeric/non-semantic BOK metric_code');
  for (const required of ['revenue_growth', 'operating_margin', 'debt_ratio', 'current_ratio']) {
    assert.ok(benchmarkCodes.includes(required), `missing BOK metric ${required}`);
  }
  assert.equal(pctl2124.revenue_level, 61.2, 'company 2124 revenue-level percentile');
  assert.equal(pctl2124.revenue_growth, 1.2, 'company 2124 revenue-growth percentile');

  console.log(JSON.stringify({
    status: 'ok',
    db_path: dbPath,
    company_count: companyCount,
    revenue_2024: {
      valid_count: revenue2024,
      denominator: companyCount,
      availability_pct: revenueAvailabilityPct,
    },
    support: {
      total_thousand_won: supportTotalThousandWon,
      total_eok_won: supportTotalEokWon,
    },
    bok_metric_code_count: benchmarkCodes.length,
    company_2124_percentiles: pctl2124,
  }, null, 2));
} finally {
  db.close();
}
