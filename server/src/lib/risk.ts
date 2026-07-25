import path from 'path';
import fs from 'fs';
import type {
  CompanyMaster, CompanyYearly, CompanyPercentile,
  SupportEpisode, SixBoxCheck, IndicatorRow, SupportSummary
} from './types';

// ── 임계값 로딩 ───────────────────────────────────────────────

const THRESHOLD_PATH = path.resolve(__dirname, '../../../../etl/config/threshold.json');

interface Threshold {
  survival: { revenue_pctl_caution: number; tenure_caution_years: number; employment_pctl_caution: number; min_employees_viable: number };
  financial: { debt_ratio_warning: number; debt_ratio_caution: number; current_ratio_caution: number; op_margin_caution_pct: number; runway_caution_months: number };
  technology: { rd_intensity_base_pct: number; rd_intensity_strong_pct: number };
  support_history: { repeat_episode_caution: number; consecutive_years_caution: number; overlap_days_threshold: number };
}

let _threshold: Threshold | null = null;
function getThreshold(): Threshold {
  if (!_threshold) {
    try {
      _threshold = JSON.parse(fs.readFileSync(THRESHOLD_PATH, 'utf-8'));
    } catch {
      _threshold = {
        survival: { revenue_pctl_caution: 30, tenure_caution_years: 3, employment_pctl_caution: 30, min_employees_viable: 2 },
        financial: { debt_ratio_warning: 200, debt_ratio_caution: 100, current_ratio_caution: 130, op_margin_caution_pct: 0, runway_caution_months: 18 },
        technology: { rd_intensity_base_pct: 2, rd_intensity_strong_pct: 5 },
        support_history: { repeat_episode_caution: 5, consecutive_years_caution: 3, overlap_days_threshold: 30 },
      };
    }
  }
  return _threshold!;
}

// ── 유틸 ─────────────────────────────────────────────────────

function tenureYears(foundedDate: string | null, asOfYear: number): number | null {
  if (!foundedDate) return null;
  const d = new Date(foundedDate);
  if (isNaN(d.getTime())) return null;
  return asOfYear - d.getFullYear();
}

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function pctlStatus(pctl: number | null, cautionBelow: number): 'ok' | 'caution' | 'warning' | 'missing' {
  if (pctl === null) return 'missing';
  if (pctl < cautionBelow / 2) return 'warning';
  if (pctl < cautionBelow) return 'caution';
  return 'ok';
}

// ── 30초 판단판 (6칸) ─────────────────────────────────────────

export function buildSixBoxChecks(
  master: CompanyMaster,
  latestYearly: CompanyYearly | null,
  pctlMap: Map<string, CompanyPercentile>,
  supportSummary: SupportSummary,
  asOfFy: number
): SixBoxCheck[] {
  const thr = getThreshold();
  const checks: SixBoxCheck[] = [];

  // 1. 기업 생존 상태
  const isClosed = master.closed_flag === 1;
  const statusBad = master.biz_status && !['정상'].includes(master.biz_status);
  checks.push({
    label: '기업 운영 상태',
    status: isClosed ? 'red' : statusBad ? 'yellow' : 'green',
    value: master.biz_status || '정보 없음',
    note: isClosed ? `폐업/청산 확인 필요 (${master.biz_status})` : null,
  });

  // 2. 매출 규모 위치
  const revPctl = pctlMap.get('revenue_growth')?.pctl ?? null;
  const revenue = latestYearly?.revenue ?? null;
  checks.push({
    label: '매출 규모',
    status: revenue === null ? 'gray' : revPctl !== null && revPctl < thr.survival.revenue_pctl_caution ? 'yellow' : 'green',
    value: revenue !== null ? `${(revenue / 1000).toFixed(0)}백만원 (${asOfFy}년)` : '데이터 없음',
    note: revPctl !== null ? `동종기업 ${revPctl.toFixed(0)}백분위` : null,
  });

  // 3. 업력
  const tenure = tenureYears(master.founded_date, asOfFy);
  checks.push({
    label: '업력',
    status: tenure === null ? 'gray' : tenure < thr.survival.tenure_caution_years ? 'yellow' : 'green',
    value: tenure !== null ? `${tenure}년` : '정보 없음',
    note: tenure !== null && tenure < thr.survival.tenure_caution_years ? `단기업력 (${thr.survival.tenure_caution_years}년 미만)` : null,
  });

  // 4. 고용 현황
  const emp = latestYearly?.pension_enrolled ?? latestYearly?.employees ?? null;
  const empPctl = pctlMap.get('employment_growth')?.pctl ?? null;
  checks.push({
    label: '고용 규모',
    status: emp === null ? 'gray' : emp < thr.survival.min_employees_viable ? 'yellow' : 'green',
    value: emp !== null ? `${emp}명 (${asOfFy}년)` : '데이터 없음',
    note: empPctl !== null ? `고용변화 ${empPctl.toFixed(0)}백분위` : null,
  });

  // 5. 재무 안정성
  const equity = latestYearly?.equity ?? null;
  const liab = latestYearly?.liabilities ?? null;
  const debtRatio = (equity !== null && liab !== null && equity > 0) ? liab / equity * 100 : null;
  const isNegativeEquity = equity !== null && equity <= 0;
  const opMargin = latestYearly?.op_margin_pct ?? null;
  const finStatus = isNegativeEquity ? 'red'
    : debtRatio !== null && debtRatio > thr.financial.debt_ratio_warning ? 'yellow'
    : opMargin !== null && opMargin < thr.financial.op_margin_caution_pct ? 'yellow'
    : equity === null ? 'gray' : 'green';
  checks.push({
    label: '재무 안정성',
    status: finStatus,
    value: isNegativeEquity ? '자본잠식' : debtRatio !== null ? `부채비율 ${debtRatio.toFixed(0)}%` : '데이터 없음',
    note: isNegativeEquity ? '자본총계 ≤ 0' : opMargin !== null && opMargin < 0 ? '영업적자' : null,
  });

  // 6. 지원 집중도
  const total = supportSummary.total_episodes;
  const consec = supportSummary.is_consecutive_3yr;
  checks.push({
    label: '지원 이력',
    status: total === 0 ? 'gray' : consec ? 'yellow' : total >= thr.support_history.repeat_episode_caution ? 'yellow' : 'green',
    value: total === 0 ? '이력 없음' : `${total}건 수혜`,
    note: consec ? '3년 연속 수혜' : total >= thr.support_history.repeat_episode_caution ? `집중 수혜 확인 필요` : null,
  });

  return checks;
}

// ── 생존 지표 ────────────────────────────────────────────────

export function buildSurvivalIndicators(
  master: CompanyMaster,
  yearlies: CompanyYearly[],
  pctlMap: Map<string, CompanyPercentile>,
  asOfFy: number
): IndicatorRow[] {
  const thr = getThreshold();
  const yMap = new Map(yearlies.map(y => [y.fiscal_year, y]));
  const latest = yMap.get(asOfFy) || yMap.get(Math.max(...yearlies.map(y => y.fiscal_year)));

  const rows: IndicatorRow[] = [];

  // 매출 규모
  const rev = latest?.revenue ?? null;
  const revPctl = pctlMap.get('revenue_growth');
  rows.push({
    label: `매출액 (${asOfFy}년)`,
    value: rev !== null ? Math.round(rev / 1000) : null,
    unit: '백만원',
    pctl: revPctl?.pctl ?? null,
    cohort_level: revPctl?.cohort_level ?? null,
    cohort_n: revPctl?.cohort_n ?? null,
    status: rev === null ? 'missing' : revPctl && revPctl.pctl < thr.survival.revenue_pctl_caution ? 'caution' : 'ok',
    flag_reason: rev === null ? '재무 미제출' : null,
  });

  // 업력
  const tenure = tenureYears(master.founded_date, asOfFy);
  rows.push({
    label: '업력',
    value: tenure,
    unit: '년',
    pctl: null,
    cohort_level: null,
    cohort_n: null,
    status: tenure === null ? 'missing' : tenure < thr.survival.tenure_caution_years ? 'caution' : 'ok',
    flag_reason: tenure !== null && tenure < thr.survival.tenure_caution_years ? `${thr.survival.tenure_caution_years}년 미만` : null,
  });

  // 고용
  const emp = latest?.pension_enrolled ?? latest?.employees ?? null;
  const empPctl = pctlMap.get('employment_growth');
  rows.push({
    label: `고용 인원 (${asOfFy}년)`,
    value: emp,
    unit: '명',
    pctl: empPctl?.pctl ?? null,
    cohort_level: empPctl?.cohort_level ?? null,
    cohort_n: empPctl?.cohort_n ?? null,
    status: emp === null ? 'missing' : emp < thr.survival.min_employees_viable ? 'caution' : 'ok',
    flag_reason: null,
  });

  // 매출 성장률
  const growthMetric = pctlMap.get('revenue_growth');
  rows.push({
    label: '매출 성장률 (전년비)',
    value: growthMetric ? null : null, // metric value is in company_metric table
    unit: '%',
    pctl: growthMetric?.pctl ?? null,
    cohort_level: growthMetric?.cohort_level ?? null,
    cohort_n: growthMetric?.cohort_n ?? null,
    status: growthMetric ? 'ok' : 'missing',
    flag_reason: null,
  });

  return rows;
}

// ── 참고 지표 (weight=0) ─────────────────────────────────────

export function buildReferenceIndicators(
  latest: CompanyYearly | null,
  pctlMap: Map<string, CompanyPercentile>,
): IndicatorRow[] {
  const thr = getThreshold();
  const rows: IndicatorRow[] = [];

  // 부채비율
  const liab = latest?.liabilities ?? null;
  const equity = latest?.equity ?? null;
  const debtRatio = (liab !== null && equity !== null && equity > 0) ? liab / equity * 100 : null;
  const debtPctl = pctlMap.get('debt_ratio');
  rows.push({
    label: '부채비율',
    value: debtRatio !== null ? Math.round(debtRatio) : null,
    unit: '%',
    pctl: debtPctl?.pctl ?? null,
    cohort_level: debtPctl?.cohort_level ?? null,
    cohort_n: debtPctl?.cohort_n ?? null,
    status: equity !== null && equity <= 0 ? 'negative_equity'
      : debtRatio === null ? 'missing'
      : debtRatio > thr.financial.debt_ratio_warning ? 'warning'
      : debtRatio > thr.financial.debt_ratio_caution ? 'caution' : 'ok',
    flag_reason: equity !== null && equity <= 0 ? '자본잠식' : null,
  });

  // 영업이익률
  const opMargin = latest?.op_margin_pct ?? null;
  const opPctl = pctlMap.get('operating_margin');
  rows.push({
    label: '영업이익률',
    value: opMargin !== null ? Math.round(opMargin * 10) / 10 : null,
    unit: '%',
    pctl: opPctl?.pctl ?? null,
    cohort_level: opPctl?.cohort_level ?? null,
    cohort_n: opPctl?.cohort_n ?? null,
    status: opMargin === null ? 'missing' : opMargin < thr.financial.op_margin_caution_pct ? 'caution' : 'ok',
    flag_reason: opMargin !== null && opMargin < 0 ? '영업적자' : null,
  });

  // R&D 집약도
  const rdPctl = pctlMap.get('rd_intensity');
  rows.push({
    label: 'R&D 집약도',
    value: null,
    unit: '%',
    pctl: rdPctl?.pctl ?? null,
    cohort_level: rdPctl?.cohort_level ?? null,
    cohort_n: rdPctl?.cohort_n ?? null,
    status: rdPctl ? 'ok' : 'missing',
    flag_reason: null,
  });

  return rows;
}

// ── 지원 이력 집계 ───────────────────────────────────────────

export function buildSupportSummary(episodes: SupportEpisode[]): SupportSummary {
  const years_received = [...new Set(
    episodes.map(e => e.source_year).filter(Boolean)
  )].sort() as number[];

  const is_consecutive_3yr = [2022, 2023, 2024].every(y => years_received.includes(y));
  const total_amount_million = episodes.reduce(
    (s, e) => s + ((e.total_amount ?? 0) / 1000), 0
  );

  // 겹치는 기간 찾기
  const overlap_pairs: Array<{ ep1_id: string; ep2_id: string; overlap_days: number }> = [];
  for (let i = 0; i < episodes.length; i++) {
    for (let j = i + 1; j < episodes.length; j++) {
      const a = episodes[i];
      const b = episodes[j];
      if (!a.start_date || !a.end_date || !b.start_date || !b.end_date) continue;
      const overlapStart = a.start_date > b.start_date ? a.start_date : b.start_date;
      const overlapEnd = a.end_date < b.end_date ? a.end_date : b.end_date;
      if (overlapStart < overlapEnd) {
        overlap_pairs.push({
          ep1_id: a.episode_id,
          ep2_id: b.episode_id,
          overlap_days: Math.round(daysBetween(overlapStart, overlapEnd)),
        });
      }
    }
  }

  return {
    total_episodes: episodes.length,
    total_amount_million: Math.round(total_amount_million),
    years_received,
    is_consecutive_3yr,
    episode_list: episodes.map(e => ({
      episode_id: e.episode_id,
      program_name: e.program_name,
      biz_type: e.biz_type,
      selected_date: e.selected_date,
      total_amount_million: Math.round((e.total_amount ?? 0) / 1000),
      component_count: e.component_count,
    })),
    overlap_pairs,
  };
}

// ── 추가 확인 질문 생성 ───────────────────────────────────────

export function generateFollowUpQuestions(
  master: CompanyMaster,
  summary_checks: SixBoxCheck[],
  support_summary: SupportSummary
): string[] {
  const questions: string[] = [];

  const redChecks = summary_checks.filter(c => c.status === 'red');
  const yellowChecks = summary_checks.filter(c => c.status === 'yellow');

  for (const c of redChecks) {
    questions.push(`[필수 확인] ${c.label}: ${c.note || c.value}`);
  }
  for (const c of yellowChecks) {
    questions.push(`[확인 권장] ${c.label}: ${c.note || c.value}`);
  }

  if (support_summary.is_consecutive_3yr) {
    questions.push('[지원 이력] 3년 연속 수혜 기업 — 지원 효과 및 자립도 확인 필요');
  }
  if (support_summary.overlap_pairs.length > 0) {
    questions.push(`[이력 중복] ${support_summary.overlap_pairs.length}건 지원 기간 겹침 확인 필요`);
  }
  if (!master.founded_date) {
    questions.push('[기본 정보] 설립일자 미확인 — 업력 계산 불가');
  }

  return questions;
}
