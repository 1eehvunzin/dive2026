import fs from 'fs';
import path from 'path';
import type {
  CompanyMaster,
  CompanyMetric,
  CompanyPercentile,
  CompanyYearly,
  IndicatorRow,
  SixBoxCheck,
  SupportEpisode,
  SupportSummary,
} from './types';

interface Threshold {
  survival: {
    revenue_pctl_caution: number;
    tenure_caution_years: number;
    employment_pctl_caution: number;
    min_employees_viable: number;
  };
  financial: {
    debt_ratio_warning: number;
    debt_ratio_caution: number;
    op_margin_caution_pct: number;
  };
  support_history: {
    repeat_episode_caution: number;
    consecutive_years_caution: number;
    overlap_days_threshold: number;
  };
}

const DEFAULT_THRESHOLD: Threshold = {
  survival: {
    revenue_pctl_caution: 30,
    tenure_caution_years: 3,
    employment_pctl_caution: 30,
    min_employees_viable: 2,
  },
  financial: {
    debt_ratio_warning: 200,
    debt_ratio_caution: 100,
    op_margin_caution_pct: 0,
  },
  support_history: {
    repeat_episode_caution: 5,
    consecutive_years_caution: 3,
    overlap_days_threshold: 30,
  },
};

let thresholdCache: Threshold | null = null;

function getThreshold(): Threshold {
  if (thresholdCache) return thresholdCache;
  const candidates = [
    path.resolve(__dirname, '../../config/threshold.json'),
    path.resolve(__dirname, '../../../../etl/config/threshold.json'),
  ];
  const thresholdPath = candidates.find(candidate => fs.existsSync(candidate));
  thresholdCache = thresholdPath
    ? { ...DEFAULT_THRESHOLD, ...JSON.parse(fs.readFileSync(thresholdPath, 'utf-8')) }
    : DEFAULT_THRESHOLD;
  return thresholdCache!;
}

function tenureYears(foundedDate: string | null, asOfYear: number): number | null {
  if (!foundedDate) return null;
  const founded = new Date(foundedDate);
  if (Number.isNaN(founded.getTime())) return null;
  return Math.max(0, asOfYear - founded.getUTCFullYear());
}

function metricMap(metrics: CompanyMetric[]): Map<string, CompanyMetric> {
  return new Map(metrics.map(metric => [metric.metric_code, metric]));
}

function evidenceId(companyId: number, year: number | null, code: string): string {
  return `kodata:${companyId}:${year ?? 'latest'}:${code}`;
}

function indicator(params: {
  companyId: number;
  code: string;
  label: string;
  value: number | null;
  unit: string;
  percentile?: CompanyPercentile;
  status: IndicatorRow['status'];
  reason?: string | null;
  direction: IndicatorRow['direction'];
  year: number | null;
  formulaVersion?: string;
}): IndicatorRow {
  return {
    code: params.code,
    label: params.label,
    value: params.value,
    unit: params.unit,
    pctl: params.percentile?.pctl ?? null,
    cohort_level: params.percentile?.cohort_level ?? null,
    cohort_n: params.percentile?.cohort_n ?? null,
    status: params.status,
    flag_reason: params.reason ?? null,
    direction: params.direction,
    as_of_year: params.year,
    evidence_ids: [evidenceId(params.companyId, params.year, params.code)],
    formula_version: params.formulaVersion ?? 'v2',
  };
}

export function buildSixBoxChecks(
  master: CompanyMaster,
  latestYearly: CompanyYearly | null,
  percentiles: Map<string, CompanyPercentile>,
  metrics: Map<string, CompanyMetric>,
  supportSummary: SupportSummary,
  asOfFy: number,
): SixBoxCheck[] {
  const threshold = getThreshold();
  const revenue = latestYearly?.revenue ?? null;
  const revenuePctl = percentiles.get('revenue_level')?.pctl ?? null;
  const employment = latestYearly?.pension_enrolled ?? latestYearly?.employees ?? null;
  const employmentPctl = percentiles.get('employment_level')?.pctl ?? null;
  const equity = latestYearly?.equity ?? null;
  const debtRatio = metrics.get('debt_ratio')?.value ?? null;
  const operatingMargin = metrics.get('operating_margin')?.value ?? null;
  const tenure = tenureYears(master.founded_date, asOfFy);
  const statusKnown = Boolean(master.biz_status);
  const statusBad = statusKnown && master.biz_status !== '정상';

  return [
    {
      label: '기업 운영 상태',
      status: master.closed_flag === 1 ? 'red' : !statusKnown ? 'gray' : statusBad ? 'yellow' : 'green',
      value: master.biz_status || '정보 없음',
      note: master.closed_flag === 1 ? '폐업·휴업·청산 여부 확인 필요' : null,
    },
    {
      label: '매출 규모',
      status: revenue === null
        ? 'gray'
        : revenuePctl !== null && revenuePctl < threshold.survival.revenue_pctl_caution
          ? 'yellow'
          : 'green',
      value: revenue === null ? '데이터 없음' : `${(revenue / 1000).toFixed(0)}백만원 (${asOfFy}년)`,
      note: revenuePctl === null ? '동종기업 규모 비교 불가' : `동종기업 매출규모 ${revenuePctl.toFixed(0)}백분위`,
    },
    {
      label: '업력',
      status: tenure === null ? 'gray' : tenure < threshold.survival.tenure_caution_years ? 'yellow' : 'green',
      value: tenure === null ? '정보 없음' : `${tenure}년`,
      note: tenure !== null && tenure < threshold.survival.tenure_caution_years
        ? `${threshold.survival.tenure_caution_years}년 미만`
        : null,
    },
    {
      label: '고용 규모',
      status: employment === null
        ? 'gray'
        : employment < threshold.survival.min_employees_viable
          || (employmentPctl !== null && employmentPctl < threshold.survival.employment_pctl_caution)
          ? 'yellow'
          : 'green',
      value: employment === null ? '데이터 없음' : `${employment}명 (${asOfFy}년)`,
      note: employmentPctl === null ? '동종기업 규모 비교 불가' : `동종기업 고용규모 ${employmentPctl.toFixed(0)}백분위`,
    },
    {
      label: '재무 안정성',
      status: equity !== null && equity <= 0
        ? 'red'
        : debtRatio !== null && debtRatio > threshold.financial.debt_ratio_warning
          ? 'yellow'
          : operatingMargin !== null && operatingMargin < threshold.financial.op_margin_caution_pct
            ? 'yellow'
            : equity === null || debtRatio === null
              ? 'gray'
              : 'green',
      value: equity !== null && equity <= 0
        ? '자본총계 0 이하'
        : debtRatio !== null
          ? `부채비율 ${debtRatio.toFixed(0)}%`
          : '데이터 없음',
      note: operatingMargin !== null && operatingMargin < 0 ? `영업이익률 ${operatingMargin.toFixed(1)}%` : null,
    },
    {
      label: '지원 이력',
      status: supportSummary.total_episodes === 0
        ? 'gray'
        : supportSummary.is_consecutive_3yr
          || supportSummary.total_episodes >= threshold.support_history.repeat_episode_caution
          || supportSummary.overlap_pairs.length > 0
          ? 'yellow'
          : 'green',
      value: supportSummary.total_episodes === 0 ? '이력 없음' : `${supportSummary.total_episodes}개 episode`,
      note: supportSummary.missing_amount_count > 0
        ? `지원금 미상 ${supportSummary.missing_amount_count}건 포함`
        : supportSummary.is_consecutive_3yr
          ? '3개년 이상 연속 수혜'
          : null,
    },
  ];
}

export function buildSurvivalIndicators(
  master: CompanyMaster,
  yearlies: CompanyYearly[],
  percentiles: Map<string, CompanyPercentile>,
  metricsInput: CompanyMetric[],
  asOfFy: number,
): IndicatorRow[] {
  const threshold = getThreshold();
  const metrics = metricMap(metricsInput);
  const latest = yearlies.find(yearly => yearly.fiscal_year === asOfFy) ?? null;
  const revenue = latest?.revenue ?? null;
  const employment = latest?.pension_enrolled ?? latest?.employees ?? null;
  const revenueLevelPctl = percentiles.get('revenue_level');
  const employmentLevelPctl = percentiles.get('employment_level');
  const revenueGrowth = metrics.get('revenue_growth')?.value ?? null;
  const growthPctl = percentiles.get('revenue_growth');
  const tenure = tenureYears(master.founded_date, asOfFy);

  return [
    indicator({
      companyId: master.company_id,
      code: 'revenue_level',
      label: `매출액 (${asOfFy}년)`,
      value: revenue === null ? null : revenue / 1000,
      unit: '백만원',
      percentile: revenueLevelPctl,
      status: revenue === null
        ? 'missing'
        : revenueLevelPctl && revenueLevelPctl.pctl < threshold.survival.revenue_pctl_caution
          ? 'caution'
          : 'ok',
      reason: revenue === null ? '재무 데이터 없음' : null,
      direction: 'higher_is_better',
      year: asOfFy,
      formulaVersion: 'raw-v1',
    }),
    indicator({
      companyId: master.company_id,
      code: 'tenure_years',
      label: '업력',
      value: tenure,
      unit: '년',
      status: tenure === null ? 'missing' : tenure < threshold.survival.tenure_caution_years ? 'caution' : 'ok',
      reason: tenure !== null && tenure < threshold.survival.tenure_caution_years
        ? `${threshold.survival.tenure_caution_years}년 미만`
        : null,
      direction: 'neutral',
      year: asOfFy,
      formulaVersion: 'tenure-v2',
    }),
    indicator({
      companyId: master.company_id,
      code: 'employment_level',
      label: `고용 인원 (${asOfFy}년)`,
      value: employment,
      unit: '명',
      percentile: employmentLevelPctl,
      status: employment === null
        ? 'missing'
        : employment < threshold.survival.min_employees_viable
          ? 'caution'
          : 'ok',
      direction: 'higher_is_better',
      year: asOfFy,
      formulaVersion: 'raw-v1',
    }),
    indicator({
      companyId: master.company_id,
      code: 'revenue_growth',
      label: '매출 성장률 (전년비)',
      value: revenueGrowth,
      unit: '%',
      percentile: growthPctl,
      status: revenueGrowth === null ? 'missing' : revenueGrowth < 0 ? 'caution' : 'ok',
      reason: revenueGrowth === null ? '직전연도 또는 당해연도 매출 없음' : revenueGrowth < 0 ? '매출 감소' : null,
      direction: 'higher_is_better',
      year: asOfFy,
    }),
  ];
}

export function buildReferenceIndicators(
  companyId: number,
  latest: CompanyYearly | null,
  percentiles: Map<string, CompanyPercentile>,
  metricsInput: CompanyMetric[],
  asOfFy: number,
): IndicatorRow[] {
  const threshold = getThreshold();
  const metrics = metricMap(metricsInput);
  const equity = latest?.equity ?? null;
  const debtRatio = metrics.get('debt_ratio')?.value ?? null;
  const operatingMargin = metrics.get('operating_margin')?.value ?? null;
  const rdIntensity = metrics.get('rd_intensity')?.value ?? null;

  return [
    indicator({
      companyId,
      code: 'debt_ratio',
      label: '부채비율',
      value: debtRatio,
      unit: '%',
      percentile: percentiles.get('debt_ratio'),
      status: equity !== null && equity <= 0
        ? 'negative_equity'
        : debtRatio === null
          ? 'missing'
          : debtRatio > threshold.financial.debt_ratio_warning
            ? 'warning'
            : debtRatio > threshold.financial.debt_ratio_caution
              ? 'caution'
              : 'ok',
      reason: equity !== null && equity <= 0 ? '자본총계 0 이하로 비율 미계산' : null,
      direction: 'lower_is_better',
      year: asOfFy,
    }),
    indicator({
      companyId,
      code: 'operating_margin',
      label: '영업이익률',
      value: operatingMargin,
      unit: '%',
      percentile: percentiles.get('operating_margin'),
      status: operatingMargin === null ? 'missing' : operatingMargin < 0 ? 'caution' : 'ok',
      reason: operatingMargin !== null && operatingMargin < 0 ? '영업적자' : null,
      direction: 'higher_is_better',
      year: asOfFy,
    }),
    indicator({
      companyId,
      code: 'rd_intensity',
      label: 'R&D 집약도',
      value: rdIntensity,
      unit: '%',
      percentile: percentiles.get('rd_intensity'),
      status: rdIntensity === null ? 'missing' : 'ok',
      reason: rdIntensity === null ? '연구개발비 또는 매출 데이터 없음' : null,
      direction: 'higher_is_better',
      year: asOfFy,
    }),
  ];
}

function inclusiveOverlapDays(startA: string, endA: string, startB: string, endB: string): number {
  const start = Math.max(Date.parse(startA), Date.parse(startB));
  const end = Math.min(Date.parse(endA), Date.parse(endB));
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function hasConsecutiveYears(years: number[], required: number): boolean {
  if (years.length < required) return false;
  for (let index = 0; index <= years.length - required; index += 1) {
    let consecutive = true;
    for (let offset = 1; offset < required; offset += 1) {
      if (years[index + offset] !== years[index] + offset) consecutive = false;
    }
    if (consecutive) return true;
  }
  return false;
}

export function buildSupportSummary(episodes: SupportEpisode[]): SupportSummary {
  const threshold = getThreshold();
  const yearsReceived = [...new Set(episodes
    .map(episode => episode.selected_date ? Number(episode.selected_date.slice(0, 4)) : episode.source_year)
    .filter(Number.isFinite))]
    .sort((a, b) => a - b);
  const overlapPairs: SupportSummary['overlap_pairs'] = [];

  for (let left = 0; left < episodes.length; left += 1) {
    for (let right = left + 1; right < episodes.length; right += 1) {
      const a = episodes[left];
      const b = episodes[right];
      if (!a.start_date || !a.end_date || !b.start_date || !b.end_date) continue;
      const overlapDays = inclusiveOverlapDays(a.start_date, a.end_date, b.start_date, b.end_date);
      if (overlapDays >= threshold.support_history.overlap_days_threshold) {
        overlapPairs.push({ ep1_id: a.episode_id, ep2_id: b.episode_id, overlap_days: overlapDays });
      }
    }
  }

  return {
    total_episodes: episodes.length,
    total_amount_million: Math.round(episodes.reduce((sum, episode) => sum + (episode.total_amount ?? 0), 0) / 1000),
    missing_amount_count: episodes.filter(episode => episode.total_amount === null).length,
    years_received: yearsReceived,
    is_consecutive_3yr: hasConsecutiveYears(yearsReceived, threshold.support_history.consecutive_years_caution),
    episode_list: episodes.map(episode => ({
      episode_id: episode.episode_id,
      program_name: episode.program_name,
      biz_type: episode.biz_type,
      selected_date: episode.selected_date,
      total_amount_million: Math.round((episode.total_amount ?? 0) / 1000),
      component_count: episode.component_count,
    })),
    overlap_pairs: overlapPairs,
  };
}

export function generateFollowUpQuestions(
  master: CompanyMaster,
  summaryChecks: SixBoxCheck[],
  supportSummary: SupportSummary,
): string[] {
  const questions = summaryChecks
    .filter(check => check.status === 'red' || check.status === 'yellow')
    .map(check => `[${check.status === 'red' ? '필수 확인' : '확인 권장'}] ${check.label}: ${check.note || check.value}`);

  if (supportSummary.overlap_pairs.length > 0) {
    questions.push(`[지원 이력] 30일 이상 기간 중첩 ${supportSummary.overlap_pairs.length}쌍의 목적·비용 중복 여부 확인`);
  }
  if (supportSummary.missing_amount_count > 0) {
    questions.push(`[지원 이력] 지원금 미상 episode ${supportSummary.missing_amount_count}건의 집행액 확인`);
  }
  if (!master.founded_date) questions.push('[기본 정보] 설립일자 확인 필요');
  return questions;
}
