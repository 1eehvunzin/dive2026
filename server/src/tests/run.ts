import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

type Test = {
  name: string;
  run: () => void | Promise<void>;
};

const tests: Test[] = [];

function test(name: string, run: Test['run']): void {
  tests.push({ name, run });
}

const sourceDbPath = path.resolve(__dirname, '../../dive2026.db');
assert.ok(fs.existsSync(sourceDbPath), `fixture DB not found: ${sourceDbPath}`);

// Product DB is never mutated by the test suite. Engine/API tests use an isolated copy.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dive2026-server-test-'));
const testDbPath = path.join(tempDir, 'dive2026.test.db');
fs.copyFileSync(sourceDbPath, testDbPath);
process.env.DB_PATH = testDbPath;

// Require after DB_PATH is fixed because connection.ts resolves it at module load.
const { getDbStatus, closeDb } = require('../db/connection') as typeof import('../db/connection');
const { buildReport } = require('../lib/report-engine') as typeof import('../lib/report-engine');
const companiesRouter = require('../routes/companies').default as import('express').Router;
const roundsRouter = require('../routes/rounds').default as import('express').Router;
const comparisonsRouter = require('../routes/comparisons').default as import('express').Router;
const simulationsRouter = require('../routes/simulations').default as import('express').Router;
const { normalizeExtracted } = require('../routes/upload') as typeof import('../routes/upload');

const sourceDb = new Database(sourceDbPath, { readonly: true, fileMustExist: true });

type InvokeOptions = {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
};

function invokeRoute(
  router: import('express').Router,
  method: 'get' | 'post' | 'put',
  routePath: string,
  options: InvokeOptions = {},
): { status: number; body: unknown } {
  const stack = (router as unknown as {
    stack: Array<{
      route?: {
        path: string;
        methods: Record<string, boolean>;
        stack: Array<{ handle: (req: unknown, res: unknown) => unknown }>;
      };
    }>;
  }).stack;
  const route = stack.find(layer => layer.route?.path === routePath && layer.route.methods[method])?.route;
  assert.ok(route, `${method.toUpperCase()} ${routePath} handler not found`);

  let status = 200;
  let body: unknown;
  const response = {
    status(code: number) {
      status = code;
      return response;
    },
    json(payload: unknown) {
      body = payload;
      return response;
    },
  };
  const request = {
    params: options.params ?? {},
    query: options.query ?? {},
    body: options.body ?? {},
  };
  const result = route.stack[route.stack.length - 1].handle(request, response);
  assert.ok(!(result instanceof Promise), `${method.toUpperCase()} ${routePath} unexpectedly became async`);
  return { status, body };
}

test('default database location exists and copied fixture is data_ready', () => {
  assert.equal(path.basename(sourceDbPath), 'dive2026.db');
  assert.equal(path.dirname(sourceDbPath), path.resolve(__dirname, '../..'));
  const status = getDbStatus();
  assert.equal(status.path, testDbPath);
  assert.equal(status.schema_ready, true);
  assert.equal(status.data_ready, true);
  assert.equal(status.company_count, 2_886);
});

test('company population and 2024 revenue availability reconcile to 76.3%', () => {
  const companyCount = (sourceDb.prepare(
    'SELECT COUNT(*) AS n FROM company_master'
  ).get() as { n: number }).n;
  const validRevenue = (sourceDb.prepare(`
    SELECT COUNT(*) AS n
    FROM company_yearly
    WHERE fiscal_year = 2024 AND revenue IS NOT NULL
  `).get() as { n: number }).n;
  assert.equal(companyCount, 2_886);
  assert.equal(validRevenue, 2_201);
  assert.equal(Math.round(validRevenue / companyCount * 1_000) / 10, 76.3);
});

test('BOK benchmark metric_code is semantic text and core metrics exist', () => {
  const rows = sourceDb.prepare(`
    SELECT metric_code, COUNT(*) AS n
    FROM external_industry_benchmark
    GROUP BY metric_code
  `).all() as Array<{ metric_code: string; n: number }>;
  assert.ok(rows.length > 0, 'external_industry_benchmark is empty');
  assert.ok(rows.every(row => /[a-z_]/.test(row.metric_code)));
  const codes = new Set(rows.map(row => row.metric_code));
  for (const required of ['revenue_growth', 'operating_margin', 'debt_ratio', 'current_ratio']) {
    assert.ok(codes.has(required), `missing BOK metric_code: ${required}`);
  }
});

test('company 2124 keeps size and growth percentiles distinct', () => {
  const report = buildReport(2_124);
  assert.ok(report);
  const revenue = report.survival_indicators.find(item => item.code === 'revenue_level');
  const growth = report.survival_indicators.find(item => item.code === 'revenue_growth');
  assert.ok(revenue);
  assert.ok(growth);
  assert.equal(revenue.pctl, 61.2);
  assert.equal(growth.pctl, 1.2);
  assert.notEqual(revenue.pctl, growth.pctl);
  const sizeCheck = report.summary_checks.find(item => item.label === '매출 규모');
  assert.match(sizeCheck?.note ?? '', /61백분위/);
});

test('null growth/R&D values are never marked ok', () => {
  const candidate = sourceDb.prepare(`
    SELECT m.company_id
    FROM company_master m
    LEFT JOIN company_metric growth
      ON growth.company_id = m.company_id
     AND growth.as_of_fy = 2024
     AND growth.metric_code = 'revenue_growth'
    LEFT JOIN company_metric rd
      ON rd.company_id = m.company_id
     AND rd.as_of_fy = 2024
     AND rd.metric_code = 'rd_intensity'
    WHERE growth.value IS NULL OR rd.value IS NULL
    ORDER BY m.company_id
    LIMIT 1
  `).get() as { company_id: number };
  const report = buildReport(candidate.company_id);
  assert.ok(report);
  const checked = [...report.survival_indicators, ...report.reference_indicators]
    .filter(item => item.code === 'revenue_growth' || item.code === 'rd_intensity');
  assert.equal(checked.length, 2);
  for (const item of checked) {
    if (item.value === null) assert.equal(item.status, 'missing', `${item.code} null must be missing`);
  }
});

test('financial series is exposed in million KRW (백만원)', () => {
  const raw = sourceDb.prepare(`
    SELECT revenue
    FROM company_yearly
    WHERE company_id = 2124 AND fiscal_year = 2024
  `).get() as { revenue: number };
  const report = buildReport(2_124);
  assert.ok(report);
  const point = report.financial_series.find(item => item.year === 2024);
  assert.ok(point);
  assert.equal(point.revenue, raw.revenue / 1_000);
  assert.equal(
    report.survival_indicators.find(item => item.code === 'revenue_level')?.unit,
    '백만원',
  );
});

test('support amounts reconcile to 2,640.45억원', () => {
  const totalThousandWon = (sourceDb.prepare(`
    SELECT SUM(total_amount) AS total FROM support_episode
  `).get() as { total: number }).total;
  assert.equal(totalThousandWon, 264_045_056);
  const totalEokWon = totalThousandWon / 100_000;
  assert.equal(Math.round(totalEokWon * 100) / 100, 2_640.45);
});

test('historical report excludes post-cutoff financial/support/NTIS/patent facts', () => {
  const asOfDate = '2023-04-30';
  const cutoffFy = 2021;

  const financialReport = buildReport(2_124, null, asOfDate);
  assert.ok(financialReport);
  assert.equal(financialReport.as_of_fy, cutoffFy);
  assert.ok(financialReport.financial_series.every(item => item.year <= cutoffFy));
  assert.equal(financialReport.technology_evidence.valid_patent_count, null);

  const supportReport = buildReport(1_549, null, asOfDate);
  assert.ok(supportReport);
  const forbiddenSupportIds = new Set((sourceDb.prepare(`
    SELECT episode_id
    FROM support_episode
    WHERE company_id = 1549
      AND (
        selected_date > ?
        OR (selected_date IS NULL AND COALESCE(as_of_fy, source_year) > ?)
      )
  `).all(asOfDate, cutoffFy) as Array<{ episode_id: string }>).map(row => row.episode_id));
  assert.ok(
    supportReport.support_summary.episode_list.every(item => !forbiddenSupportIds.has(item.episode_id)),
    'historical report contains a support episode only known after cutoff',
  );

  const ntisReport = buildReport(887, null, asOfDate);
  assert.ok(ntisReport);
  const expectedNtisCount = (sourceDb.prepare(`
    SELECT COUNT(*) AS n
    FROM ntis_project
    WHERE company_id = 887 AND base_year IS NOT NULL AND base_year <= ?
  `).get(cutoffFy) as { n: number }).n;
  assert.equal(ntisReport.ntis_summary.project_count, expectedNtisCount);
  assert.ok(ntisReport.ntis_summary.latest_year === null || ntisReport.ntis_summary.latest_year <= cutoffFy);
});

test('similar-company selection is deterministic and evidence-based', () => {
  const first = buildReport(2_124);
  const second = buildReport(2_124);
  assert.ok(first);
  assert.ok(second);
  assert.deepEqual(first.similar_companies, second.similar_companies);
  assert.ok(first.similar_companies.length > 0);
  assert.ok(first.similar_companies.every(item => item.compared_metrics.length >= 2));
});

test('external benchmark is connected to report indicators', () => {
  const report = buildReport(2_124);
  assert.ok(report);
  assert.ok(report.external_benchmarks.length > 0);
  assert.ok(report.external_benchmarks.some(item => item.metric_code === 'revenue_growth'));
  assert.ok(report.external_benchmarks.every(item => /[a-z_]/.test(item.metric_code)));
});

test('notice extraction rejects invented weights and keeps explicit scores only', () => {
  const base = {
    title: '테스트 공고',
    agency: '부산테크노파크',
    field: '',
    budget: '',
    supportPerCompany: '',
    deadline: '',
    targetStage: '',
    keywords: [],
    description: '',
  };
  const program = normalizeExtracted({
    ...base,
    requirements: [
      {
        type: 'eligibility',
        label: '부산 소재',
        ruleField: 'location',
        ruleOperator: 'in',
        ruleValue: '부산광역시',
        weight: 1,
        sourcePage: 1,
        sourceText: '장비사용료의 60%를 지원한다.',
      },
      {
        type: 'evaluation',
        label: '기술성',
        ruleField: '',
        ruleOperator: 'manual_review',
        ruleValue: '',
        weight: 10,
        sourcePage: 2,
        sourceText: '기술성 배점 10점',
      },
    ],
  }, 'doc-test');
  assert.equal(program.requirements[0].weight, null);
  assert.equal(program.requirements[1].weight, 10);
  assert.equal(program.requirements[1].rule, null);
});

test('route contracts cover list/detail, round sorting, comparison and simulation', () => {
    const list = invokeRoute(companiesRouter, 'get', '/', {
      query: { limit: '2', sort: 'revenue:desc' },
    });
    assert.equal(list.status, 200);
    const listBody = list.body as {
      items: Array<Record<string, unknown>>;
      total: number;
      sort: string;
    };
    assert.equal(listBody.total, 2_886);
    assert.equal(listBody.items.length, 2);
    assert.equal(listBody.sort, 'revenue:desc');
    assert.ok('latest_revenue_million' in listBody.items[0]);
    assert.ok(!('revenue' in listBody.items[0]), 'raw DB field leaked from list DTO');

    const detail = invokeRoute(companiesRouter, 'get', '/:id', { params: { id: '2124' } });
    assert.equal(detail.status, 200);
    const detailBody = detail.body as Record<string, unknown>;
    assert.equal(detailBody.id, '2124');
    assert.ok('latest_revenue_million' in detailBody);
    assert.ok(!('revenue' in detailBody), 'raw DB field leaked from detail DTO');

    const roundResponse = invokeRoute(roundsRouter, 'post', '/', {
      body: { companyIds: [2_124, 1_549, 887], asOfDate: '2025-07-01' },
    });
    assert.equal(roundResponse.status, 201);
    const round = roundResponse.body as { roundId: string; candidateCount: number };
    assert.equal(round.candidateCount, 3);

    const candidatesResponse = invokeRoute(roundsRouter, 'get', '/:id/candidates', {
      params: { id: round.roundId },
      query: { sort: 'revenue:desc' },
    });
    assert.equal(candidatesResponse.status, 200);
    const candidates = candidatesResponse.body as {
      sort: string;
      items: Array<{ values: { revenue: number | null } }>;
    };
    assert.equal(candidates.sort, 'revenue:desc');
    const candidateRevenue = candidates.items.map(item => item.values.revenue).filter(
      (value): value is number => value !== null
    );
    assert.deepEqual(candidateRevenue, [...candidateRevenue].sort((a, b) => b - a));

    const comparisonResponse = invokeRoute(comparisonsRouter, 'post', '/', {
      body: {
        companyIds: [2_124, 1_549],
        roundId: round.roundId,
        metrics: ['revenue_level', 'debt_ratio', 'support_total_million'],
      },
    });
    assert.equal(comparisonResponse.status, 200);
    const comparison = comparisonResponse.body as {
      rows: unknown[];
      metrics: string[];
    };
    assert.equal(comparison.rows.length, 2);
    assert.deepEqual(comparison.metrics, ['revenue_level', 'debt_ratio', 'support_total_million']);

    const simulationResponse = invokeRoute(simulationsRouter, 'post', '/', {
      body: { companyId: 2_124, amountMillion: 100 },
    });
    assert.equal(simulationResponse.status, 200);
    const simulation = simulationResponse.body as {
      scenario: { type: string; support_amount_million: number };
      limitations: string[];
    };
    assert.equal(simulation.scenario.type, 'observational');
    assert.equal(simulation.scenario.support_amount_million, 100);
    assert.ok(simulation.limitations.some(item => item.includes('인과효과')));
});

async function main(): Promise<void> {
  let failed = 0;
  try {
    for (const item of tests) {
      try {
        await item.run();
        console.log(`✓ ${item.name}`);
      } catch (error) {
        failed += 1;
        console.error(`✗ ${item.name}`);
        console.error(error);
      }
    }
  } finally {
    sourceDb.close();
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log(`\n${tests.length - failed}/${tests.length} tests passed`);
  if (failed > 0) process.exitCode = 1;
}

void main();
