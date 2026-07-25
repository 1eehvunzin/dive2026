import fs from 'fs';
import path from 'path';
import type {
  CompanyMaster,
  CompanyMetric,
  CompanyPercentile,
  CompanyYearly,
  IndicatorRow,
  ObservedChangeAfterSupport,
  OfficerBrief,
  SixBoxCheck,
  SupportEpisode,
  SupportPurposeRepeat,
  SupportSummary,
  SupportSummaryItem,
} from './types';
import { getDb } from '../db/connection';

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

/** 폐업 예측 AUC (구현계획 v3.3 실측). 참고지표는 0. */
const INDICATOR_META: Record<string, { auc: number | null; weight: number }> = {
  revenue_level: { auc: 0.704, weight: 1 },
  tenure_years: { auc: 0.671, weight: 1 },
  employment_level: { auc: 0.609, weight: 1 },
  financial_missing: { auc: 0.576, weight: 0.5 },
  revenue_growth: { auc: 0.475, weight: 0 },
  operating_margin: { auc: 0.558, weight: 0 },
  debt_ratio: { auc: 0.498, weight: 0 },
  rd_intensity: { auc: null, weight: 0 },
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

function formatMillion(value: number | null, unit = '백만원'): string {
  if (value === null || !Number.isFinite(value)) return '자료 없음';
  if (Math.abs(value) >= 100) {
    return `${(value / 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억원`;
  }
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${unit === '백만원' ? '백만원' : unit}`;
}

function formatPct(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return '자료 없음';
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: digits })}%`;
}

/** 자본이 거의 소진된 경우 부채비율 절대값을 그대로 강조하면 오해를 줌. */
function interpretDebtRatio(
  debtRatio: number | null,
  equityThousand: number | null,
  assetsThousand: number | null,
): { display: string; severe: boolean; nearZeroEquity: boolean } {
  if (equityThousand !== null && equityThousand <= 0) {
    return { display: '자본총계 0 이하(자본잠식)', severe: true, nearZeroEquity: true };
  }
  if (debtRatio === null) {
    return { display: '자료 없음', severe: false, nearZeroEquity: false };
  }
  const equityMillion = equityThousand === null ? null : equityThousand / 1000;
  const equityShare = (
    equityThousand !== null
    && assetsThousand !== null
    && assetsThousand > 0
  )
    ? equityThousand / assetsThousand
    : null;
  const nearZeroEquity = (
    (equityMillion !== null && equityMillion > 0 && equityMillion < 50)
    || (equityShare !== null && equityShare < 0.05)
    || debtRatio >= 1_000
  );
  if (nearZeroEquity) {
    return {
      display: `자본 소진 임박 · 자본총계 ${formatMillion(equityMillion)} · 산출 부채비율 ${formatPct(debtRatio, 0)}`,
      severe: true,
      nearZeroEquity: true,
    };
  }
  return {
    display: `부채비율 ${formatPct(debtRatio, 0)}`,
    severe: debtRatio > getThreshold().financial.debt_ratio_warning,
    nearZeroEquity: false,
  };
}

function isAwardedResult(result: string | null): boolean {
  if (!result) return false;
  return result === '지원대상' || result.includes('지원대상') || result === '선정';
}

function normalizePurpose(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || value === '기타' || value === '판단제외') return value || null;
  const map: Record<string, string> = {
    '시제품제작': '시제품',
    '제품고급화': '시제품',
    '인력양성(역량개발지원)': '인력양성',
    '일자리창출(인건비지원)': '고용',
    '일자리창출or인력양성': '인력양성',
    '마케팅': '마케팅/수출',
    '수출지원': '마케팅/수출',
    '전시회': '마케팅/수출',
    '인증지원': '인증',
    '특허지원': '지식재산',
    '공동기술개발': '기술/R&D',
    '기술지도': '기술/R&D',
    '기술지원': '기술/R&D',
    'RnD': '기술/R&D',
    '사업화지원': '사업화',
    '패키지지원': '패키지',
    '스마트공장': '스마트공장',
    '기반구축': '기반구축',
    '실증사업화': '사업화',
  };
  return map[value] ?? value;
}

function purposeSimilarity(a: string | null, b: string | null): 'same' | 'similar' | 'different' | 'unknown' {
  if (!a || !b) return 'unknown';
  if (a === b) return 'same';
  const groups = [
    ['시제품', '사업화', '패키지'],
    ['마케팅/수출', '마케팅'],
    ['기술/R&D', '지식재산', '인증'],
    ['인력양성', '고용'],
  ];
  for (const group of groups) {
    if (group.includes(a) && group.includes(b)) return 'similar';
  }
  return 'different';
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
  const meta = INDICATOR_META[params.code];
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
    auc: meta?.auc ?? null,
    weight: meta?.weight ?? null,
  };
}

function check(
  code: string,
  label: string,
  status: SixBoxCheck['status'],
  value: string,
  note: string | null = null,
  interpretation: string | null = null,
): SixBoxCheck {
  return { code, label, status, value, note, interpretation };
}

type ComponentRow = {
  row_id: number;
  episode_id: string;
  support_type: string | null;
  support_item: string | null;
  amount: number | null;
  amount_flag: string | null;
};

function loadComponents(episodeIds: string[]): Map<string, ComponentRow[]> {
  const map = new Map<string, ComponentRow[]>();
  if (episodeIds.length === 0) return map;
  const placeholders = episodeIds.map(() => '?').join(',');
  const rows = getDb().prepare(`
    SELECT row_id, episode_id, support_type, support_item, amount, amount_flag
    FROM support_component
    WHERE episode_id IN (${placeholders})
  `).all(...episodeIds) as ComponentRow[];
  for (const row of rows) {
    const list = map.get(row.episode_id) ?? [];
    list.push(row);
    map.set(row.episode_id, list);
  }
  return map;
}

function episodeYear(episode: SupportEpisode): number | null {
  if (episode.selected_date) {
    const year = Number(episode.selected_date.slice(0, 4));
    return Number.isFinite(year) ? year : null;
  }
  return episode.source_year ?? episode.as_of_fy ?? null;
}

export function buildSupportSummary(
  episodes: SupportEpisode[],
  asOfFy?: number,
): SupportSummary {
  const threshold = getThreshold();
  const componentMap = loadComponents(episodes.map(episode => episode.episode_id));
  const recentCutoff = (asOfFy ?? Math.max(...episodes.map(e => episodeYear(e) ?? 0), 0)) - 2;

  const episodeList: SupportSummaryItem[] = episodes.map(episode => {
    const components = componentMap.get(episode.episode_id) ?? [];
    const primaryType = components.find(item => item.support_type)?.support_type
      ?? episode.biz_type;
    const purpose = normalizePurpose(primaryType);
    const amountMillion = episode.total_amount === null
      ? null
      : Math.round(episode.total_amount / 100) / 10;
    let amountFlag: SupportSummaryItem['amount_flag'] = 'ok';
    if (amountMillion === null || components.some(item => item.amount_flag === 'missing')) {
      amountFlag = 'missing';
    } else if (amountMillion === 0) {
      amountFlag = 'zero';
    } else if (components.some(item => item.amount === 0)) {
      amountFlag = 'mixed';
    }

    return {
      episode_id: episode.episode_id,
      program_name: episode.program_name,
      program_code: episode.program_code,
      biz_type: episode.biz_type,
      support_purpose: purpose,
      selected_date: episode.selected_date,
      start_date: episode.start_date,
      end_date: episode.end_date,
      result: episode.result,
      total_amount_million: amountMillion,
      component_count: episode.component_count || components.length || 1,
      is_awarded: isAwardedResult(episode.result),
      amount_flag: amountFlag,
      components: components.map(item => ({
        row_id: item.row_id,
        support_type: item.support_type,
        support_item: item.support_item,
        amount_million: item.amount === null ? null : Math.round(item.amount / 100) / 10,
        amount_flag: item.amount_flag,
      })),
    };
  });

  const awarded = episodeList.filter(item => item.is_awarded);
  const nonAwarded = episodeList.filter(item => !item.is_awarded);
  const recentAwarded = awarded.filter(item => {
    const year = item.selected_date
      ? Number(item.selected_date.slice(0, 4))
      : null;
    return year !== null && year >= recentCutoff;
  });

  const yearsReceived = [...new Set(
    awarded
      .map(item => item.selected_date ? Number(item.selected_date.slice(0, 4)) : null)
      .filter((year): year is number => year !== null && Number.isFinite(year)),
  )].sort((a, b) => a - b);

  const overlapPairs: SupportSummary['overlap_pairs'] = [];
  for (let left = 0; left < episodeList.length; left += 1) {
    for (let right = left + 1; right < episodeList.length; right += 1) {
      const a = episodeList[left];
      const b = episodeList[right];
      if (!a.is_awarded || !b.is_awarded) continue;
      if (!a.start_date || !a.end_date || !b.start_date || !b.end_date) continue;
      const overlapDays = inclusiveOverlapDays(a.start_date, a.end_date, b.start_date, b.end_date);
      if (overlapDays >= threshold.support_history.overlap_days_threshold) {
        overlapPairs.push({
          ep1_id: a.episode_id,
          ep2_id: b.episode_id,
          overlap_days: overlapDays,
          purpose_relation: purposeSimilarity(a.support_purpose, b.support_purpose),
        });
      }
    }
  }

  const purposeGroups = new Map<string, SupportSummaryItem[]>();
  for (const item of awarded) {
    const key = item.support_purpose || item.biz_type || '목적 미상';
    purposeGroups.set(key, [...(purposeGroups.get(key) ?? []), item]);
  }
  const samePurposeRepeats: SupportPurposeRepeat[] = [...purposeGroups.entries()]
    .filter(([, items]) => items.length >= 2)
    .map(([purpose, items]) => ({
      purpose,
      episode_count: items.length,
      years: [...new Set(
        items
          .map(item => item.selected_date ? Number(item.selected_date.slice(0, 4)) : null)
          .filter((year): year is number => year !== null),
      )].sort((a, b) => a - b),
      total_amount_million: Math.round(
        items.reduce((sum, item) => sum + (item.total_amount_million ?? 0), 0) * 10,
      ) / 10,
      program_names: [...new Set(
        items.map(item => item.program_name).filter((name): name is string => Boolean(name)),
      )],
    }))
    .sort((a, b) => b.episode_count - a.episode_count);

  const missingAmountCount = episodeList.filter(item => item.amount_flag === 'missing').length;
  const zeroAmountCount = episodeList.filter(item => item.amount_flag === 'zero').length;
  const totalAmount = Math.round(
    episodeList.reduce((sum, item) => sum + (item.total_amount_million ?? 0), 0) * 10,
  ) / 10;
  const awardedAmount = Math.round(
    awarded.reduce((sum, item) => sum + (item.total_amount_million ?? 0), 0) * 10,
  ) / 10;

  const badges: string[] = [];
  if (awarded.length === 0) badges.push('이력 없음');
  else if (recentAwarded.length === 1) badges.push('단일 수혜');
  else if (recentAwarded.length >= 2) badges.push('반복 수혜');
  if (overlapPairs.length > 0) badges.push('중첩 있음');
  if (samePurposeRepeats.length > 0) badges.push('동일 목적 반복');
  if (missingAmountCount > 0 || zeroAmountCount > 0) badges.push('금액 확인 필요');
  if (nonAwarded.length > 0) badges.push(`탈락·포기 ${nonAwarded.length}건`);

  return {
    total_episodes: episodeList.length,
    awarded_episodes: awarded.length,
    rejected_or_withdrawn: nonAwarded.length,
    recent_3yr_awarded: recentAwarded.length,
    total_amount_million: totalAmount,
    awarded_amount_million: awardedAmount,
    missing_amount_count: missingAmountCount,
    zero_amount_count: zeroAmountCount,
    years_received: yearsReceived,
    is_consecutive_3yr: hasConsecutiveYears(
      yearsReceived,
      threshold.support_history.consecutive_years_caution,
    ),
    same_purpose_repeats: samePurposeRepeats,
    badges,
    episode_list: episodeList,
    overlap_pairs: overlapPairs,
  };
}

export function buildObservedChangesAfterSupport(
  yearlies: CompanyYearly[],
  supportSummary: SupportSummary,
): ObservedChangeAfterSupport[] {
  const byYear = new Map(yearlies.map(row => [row.fiscal_year, row]));
  const awarded = supportSummary.episode_list.filter(item => item.is_awarded);
  const overlappingIds = new Set(
    supportSummary.overlap_pairs.flatMap(pair => [pair.ep1_id, pair.ep2_id]),
  );

  return awarded.map(episode => {
    const selectYear = episode.selected_date
      ? Number(episode.selected_date.slice(0, 4))
      : null;
    if (selectYear === null) {
      return {
        episode_id: episode.episode_id,
        program_name: episode.program_name,
        selected_date: episode.selected_date,
        pre_fy: null,
        post_fy: null,
        revenue_change_pct: null,
        employment_change: null,
        new_patent_count: null,
        status: 'insufficient' as const,
        note: '선정일 없어 전후 비교 불가',
      };
    }

    const preFy = selectYear - 1;
    const postFy = selectYear;
    const pre = byYear.get(preFy);
    const post = byYear.get(postFy);
    if (!pre || !post) {
      return {
        episode_id: episode.episode_id,
        program_name: episode.program_name,
        selected_date: episode.selected_date,
        pre_fy: pre ? preFy : null,
        post_fy: post ? postFy : null,
        revenue_change_pct: null,
        employment_change: null,
        new_patent_count: null,
        status: 'insufficient' as const,
        note: '전후 연도 재무·고용 관측 부족',
      };
    }

    const revenueChange = (
      pre.revenue !== null && pre.revenue > 0 && post.revenue !== null
    )
      ? Math.round(((post.revenue - pre.revenue) / pre.revenue) * 1000) / 10
      : null;
    const empPre = pre.pension_enrolled ?? pre.employees;
    const empPost = post.pension_enrolled ?? post.employees;
    const employmentChange = (
      empPre !== null && empPost !== null
    ) ? empPost - empPre : null;
    const newPatent = (
      pre.patent_reg !== null && post.patent_reg !== null
    ) ? Math.max(0, post.patent_reg - pre.patent_reg) : null;

    const improvements = [
      revenueChange !== null && revenueChange > 0,
      employmentChange !== null && employmentChange > 0,
      newPatent !== null && newPatent > 0,
    ].filter(Boolean).length;
    const observables = [
      revenueChange !== null,
      employmentChange !== null,
      newPatent !== null,
    ].filter(Boolean).length;

    let status: ObservedChangeAfterSupport['status'] = 'unchanged';
    if (overlappingIds.has(episode.episode_id)) status = 'overlapped';
    else if (observables === 0) status = 'insufficient';
    else if (improvements >= 2) status = 'improved';
    else if (improvements === 1) status = 'partial';
    else status = 'unchanged';

    return {
      episode_id: episode.episode_id,
      program_name: episode.program_name,
      selected_date: episode.selected_date,
      pre_fy: preFy,
      post_fy: postFy,
      revenue_change_pct: revenueChange,
      employment_change: employmentChange,
      new_patent_count: newPatent,
      status,
      note: status === 'overlapped'
        ? '다른 지원과 수행기간 중첩'
        : null,
    };
  });
}

export function buildSixBoxChecks(
  master: CompanyMaster,
  latestYearly: CompanyYearly | null,
  percentiles: Map<string, CompanyPercentile>,
  metrics: Map<string, CompanyMetric>,
  supportSummary: SupportSummary,
  asOfFy: number,
  programGate: 'eligible' | 'ineligible' | 'needs_review' | 'no_program' = 'no_program',
  observedChanges: ObservedChangeAfterSupport[] = [],
): SixBoxCheck[] {
  const threshold = getThreshold();
  const revenue = latestYearly?.revenue ?? null;
  const revenuePctl = percentiles.get('revenue_level')?.pctl ?? null;
  const employment = latestYearly?.pension_enrolled ?? latestYearly?.employees ?? null;
  const employmentPctl = percentiles.get('employment_level')?.pctl ?? null;
  const equity = latestYearly?.equity ?? null;
  const assets = latestYearly?.assets ?? null;
  const debtRatio = metrics.get('debt_ratio')?.value ?? null;
  const operatingMargin = metrics.get('operating_margin')?.value ?? null;
  const revenueGrowth = metrics.get('revenue_growth')?.value ?? null;
  const tenure = tenureYears(master.founded_date, asOfFy);
  const debtView = interpretDebtRatio(debtRatio, equity, assets);

  // 1) 생존 위험 — 폐업 예측력이 검증된 축 + 운영상태
  const survivalSignals: string[] = [];
  let survivalStatus: SixBoxCheck['status'] = 'green';
  if (master.closed_flag === 1 || (master.biz_status && master.biz_status !== '정상')) {
    survivalStatus = 'red';
    survivalSignals.push(master.biz_status || '비정상 상태');
  }
  if (revenue === null) {
    if (survivalStatus !== 'red') survivalStatus = 'gray';
    survivalSignals.push('매출 자료 없음');
  } else if (revenuePctl !== null && revenuePctl < threshold.survival.revenue_pctl_caution) {
    if (survivalStatus === 'green') survivalStatus = 'yellow';
    survivalSignals.push(`매출 규모 동종 하위 ${revenuePctl.toFixed(0)}%`);
  }
  if (tenure !== null && tenure < threshold.survival.tenure_caution_years) {
    if (survivalStatus === 'green') survivalStatus = 'yellow';
    survivalSignals.push(`업력 ${tenure}년`);
  }
  if (employment !== null) {
    if (
      employment < threshold.survival.min_employees_viable
      || (employmentPctl !== null && employmentPctl < threshold.survival.employment_pctl_caution)
    ) {
      if (survivalStatus === 'green') survivalStatus = 'yellow';
      survivalSignals.push(
        employmentPctl !== null
          ? `고용 동종 하위 ${employmentPctl.toFixed(0)}% (${employment}명)`
          : `고용 ${employment}명`,
      );
    }
  } else {
    survivalSignals.push('고용 자료 없음');
    if (survivalStatus === 'green') survivalStatus = 'gray';
  }

  // 2) 사업수행 기반
  const capacityMet: string[] = [];
  const capacityGap: string[] = [];
  if (employment !== null && employment >= threshold.survival.min_employees_viable) {
    capacityMet.push(`인력 ${employment}명`);
  } else if (employment !== null) {
    capacityGap.push(`인력 ${employment}명`);
  } else {
    capacityGap.push('인력 미확인');
  }
  if (master.has_corporate_lab === 1 || master.has_rd_dept === 1 || (master.researcher_count ?? 0) > 0) {
    capacityMet.push(
      [
        master.has_corporate_lab === 1 ? '부설연구소' : null,
        master.has_rd_dept === 1 ? '전담부서' : null,
        master.researcher_count ? `연구원 ${master.researcher_count}명` : null,
      ].filter(Boolean).join('·') || 'R&D 조직',
    );
  } else {
    capacityGap.push('R&D 조직 미확인');
  }
  if (equity !== null && equity > 0 && !debtView.nearZeroEquity) {
    capacityMet.push('자본 여력 확인');
  } else if (equity !== null) {
    capacityGap.push(debtView.display);
  } else {
    capacityGap.push('자본 자료 없음');
  }
  let capacityStatus: SixBoxCheck['status'] = 'green';
  let capacityValue = '충분 근거';
  if (employment === null && equity === null && capacityMet.length === 0) {
    capacityStatus = 'gray';
    capacityValue = '데이터 부족';
  } else if (debtView.nearZeroEquity || (equity !== null && equity <= 0)) {
    // 인력·R&D가 있어도 자본 소진이면 집행 여력 보완 필요
    capacityStatus = 'yellow';
    capacityValue = capacityMet.length >= 1 ? '보완 필요' : '근거 부족';
  } else if (capacityMet.length >= 2 && capacityGap.length === 0) {
    capacityStatus = 'green';
    capacityValue = '충분 근거';
  } else if (capacityMet.length >= 2) {
    capacityStatus = 'green';
    capacityValue = '충분 근거';
  } else if (capacityMet.length === 1) {
    capacityStatus = 'yellow';
    capacityValue = '보완 필요';
  } else {
    capacityStatus = 'yellow';
    capacityValue = '근거 부족';
  }

  // 3) 재무 신호 (참고 — 생존점수 비반영)
  const financeSignals: string[] = [];
  let financeStatus: SixBoxCheck['status'] = 'green';
  if (debtView.severe || debtView.nearZeroEquity) {
    financeStatus = debtView.nearZeroEquity || (equity !== null && equity <= 0) ? 'red' : 'yellow';
    financeSignals.push(debtView.display);
  } else if (debtRatio !== null && debtRatio > threshold.financial.debt_ratio_caution) {
    financeStatus = 'yellow';
    financeSignals.push(debtView.display);
  }
  if (operatingMargin !== null && operatingMargin < threshold.financial.op_margin_caution_pct) {
    if (financeStatus === 'green') financeStatus = 'yellow';
    if (operatingMargin < -20) financeStatus = financeStatus === 'red' ? 'red' : 'yellow';
    financeSignals.push(`영업이익률 ${formatPct(operatingMargin)}`);
  }
  if (revenueGrowth !== null && revenueGrowth <= -30) {
    if (financeStatus === 'green') financeStatus = 'yellow';
    financeSignals.push(`매출 전년비 ${formatPct(revenueGrowth)}`);
  }
  if (financeSignals.length === 0) {
    if (debtRatio === null && operatingMargin === null) {
      financeStatus = 'gray';
      financeSignals.push('재무 지표 부족');
    } else {
      financeSignals.push(debtView.display);
      if (operatingMargin !== null) financeSignals.push(`영업이익률 ${formatPct(operatingMargin)}`);
    }
  }

  // 4) 과거 지원 후 관찰 변화
  let changeStatus: SixBoxCheck['status'] = 'gray';
  let changeValue = '이력 없음';
  let changeNote: string | null = 'BTP 지원대상 이력 없음';
  if (observedChanges.length > 0) {
    const improved = observedChanges.filter(item => item.status === 'improved').length;
    const partial = observedChanges.filter(item => item.status === 'partial').length;
    const insufficient = observedChanges.filter(item => item.status === 'insufficient' || item.status === 'overlapped').length;
    if (improved > 0) {
      changeStatus = 'green';
      changeValue = `변화 관찰 ${improved}건`;
    } else if (partial > 0) {
      changeStatus = 'yellow';
      changeValue = `일부 관찰 ${partial}건`;
    } else if (insufficient === observedChanges.length) {
      changeStatus = 'gray';
      changeValue = '산출 불가';
    } else {
      changeStatus = 'yellow';
      changeValue = '변화 미확인';
    }
    changeNote = null;
  }

  // 5) 지원 집중 / 중복수혜
  let supportStatus: SixBoxCheck['status'] = 'green';
  let supportValue: string;
  const supportNotes: string[] = [];
  if (supportSummary.awarded_episodes === 0) {
    supportStatus = 'gray';
    supportValue = '지원대상 0건';
    supportNotes.push(
      supportSummary.rejected_or_withdrawn > 0
        ? `탈락·포기 ${supportSummary.rejected_or_withdrawn}건만 존재`
        : '최초 신청 가능',
    );
  } else {
    supportValue = `지원대상 ${supportSummary.awarded_episodes}건 · 최근3년 ${supportSummary.recent_3yr_awarded}건`;
    if (
      supportSummary.overlap_pairs.length > 0
      || supportSummary.same_purpose_repeats.length > 0
      || supportSummary.recent_3yr_awarded >= threshold.support_history.repeat_episode_caution
      || supportSummary.is_consecutive_3yr
    ) {
      supportStatus = 'yellow';
    }
    if (supportSummary.overlap_pairs.length > 0) {
      supportNotes.push(`기간 중첩 ${supportSummary.overlap_pairs.length}쌍`);
    }
    if (supportSummary.same_purpose_repeats.length > 0) {
      const top = supportSummary.same_purpose_repeats[0];
      supportNotes.push(`동일 목적(${top.purpose}) ${top.episode_count}회`);
    }
    if (supportSummary.missing_amount_count > 0) {
      supportNotes.push(`금액 미상 ${supportSummary.missing_amount_count}건`);
    }
  }

  // 6) 데이터 신뢰도
  const missing: string[] = [];
  if (revenue === null) missing.push('매출');
  if (equity === null) missing.push('자본');
  if (employment === null) missing.push('고용');
  if (!master.founded_date) missing.push('설립일');
  let dataStatus: SixBoxCheck['status'] = 'green';
  if (missing.length >= 2) dataStatus = 'red';
  else if (missing.length === 1) dataStatus = 'yellow';
  if (latestYearly && latestYearly.liabilities !== null && latestYearly.liabilities < 0) {
    dataStatus = dataStatus === 'green' ? 'yellow' : dataStatus;
    missing.push('부채 부호 이상');
  }

  // 공고 요건 (있으면 별도 칸 — 6칸 유지를 위해 data와 분리 시 첫 칸 교체)
  const eligibility = (() => {
    if (programGate === 'no_program') {
      return check('eligibility', '공고 요건', 'gray', '공고 미등록', null);
    }
    if (programGate === 'eligible') {
      return check('eligibility', '공고 요건', 'green', '요건 충족', null);
    }
    if (programGate === 'ineligible') {
      return check('eligibility', '공고 요건', 'red', '요건 재검토', '자격·배제 조항 대조 필요');
    }
    return check('eligibility', '공고 요건', 'yellow', '추가 확인', '서류·현장 확인 항목 있음');
  })();

  // 레거시 테스트 호환: label '매출 규모' 유지
  const revenueSizeCheck = check(
    'revenue_scale',
    '매출 규모',
    revenue === null
      ? 'gray'
      : revenuePctl !== null && revenuePctl < threshold.survival.revenue_pctl_caution
        ? 'yellow'
        : 'green',
    revenue === null ? '데이터 없음' : `${formatMillion(revenue / 1000)} (${asOfFy}년)`,
    revenuePctl === null ? '동종기업 규모 비교 불가' : `동종기업 매출규모 ${revenuePctl.toFixed(0)}백분위`,
  );

  return [
    eligibility,
    check(
      'survival',
      '생존 위험',
      survivalStatus,
      survivalSignals[0] || '특이신호 없음',
      survivalSignals.slice(1).join(' · ') || null,
    ),
    check(
      'capacity',
      '사업수행 기반',
      capacityStatus,
      capacityValue,
      [...capacityMet, ...capacityGap.map(item => `미흡: ${item}`)].join(' · ') || null,
    ),
    check(
      'post_support',
      '지원 후 관찰',
      changeStatus,
      changeValue,
      changeNote,
    ),
    check(
      'support_focus',
      '지원 집중',
      supportStatus,
      supportValue,
      supportNotes.join(' · ') || null,
    ),
    check(
      'data_quality',
      '데이터 신뢰도',
      dataStatus,
      missing.length === 0 ? '높음' : missing.length === 1 ? '보통' : '낮음',
      missing.length > 0 ? `확인 필요: ${missing.join(', ')}` : `${asOfFy}년 핵심 필드 확인`,
    ),
    check(
      'finance',
      '재무 신호',
      financeStatus,
      financeSignals[0] || '특이신호 없음',
      financeSignals.slice(1).join(' · ') || null,
    ),
    revenueSizeCheck,
  ];
}

export function buildOfficerBrief(
  summaryChecks: SixBoxCheck[],
  supportSummary: SupportSummary,
  latestYearly: CompanyYearly | null,
  asOfFy: number,
): OfficerBrief {
  const core = summaryChecks.filter(item =>
    ['survival', 'capacity', 'support_focus', 'data_quality', 'eligibility', 'finance'].includes(item.code),
  );
  const signalCounts = {
    red: core.filter(item => item.status === 'red').length,
    yellow: core.filter(item => item.status === 'yellow').length,
    green: core.filter(item => item.status === 'green').length,
    gray: core.filter(item => item.status === 'gray').length,
  };

  const lines: string[] = [];
  const survival = summaryChecks.find(item => item.code === 'survival');
  const capacity = summaryChecks.find(item => item.code === 'capacity');
  const support = summaryChecks.find(item => item.code === 'support_focus');
  const data = summaryChecks.find(item => item.code === 'data_quality');
  const finance = summaryChecks.find(item => item.code === 'finance');

  if (survival) {
    lines.push(
      `생존 위험: ${statusLabel(survival.status)} — ${survival.value}${survival.note ? ` · ${survival.note}` : ''}`,
    );
  }
  if (finance && (finance.status === 'red' || finance.status === 'yellow')) {
    lines.push(
      `재무 신호: ${finance.value}${finance.note ? ` · ${finance.note}` : ''}`,
    );
  }
  if (capacity) {
    lines.push(`사업수행 기반: ${capacity.value}${capacity.note ? ` — ${capacity.note}` : ''}`);
  }
  if (support) {
    lines.push(
      `지원: ${support.value}${support.note ? ` — ${support.note}` : ''}`
      + (supportSummary.awarded_amount_million > 0
        ? ` · 확인 지원금 ${formatMillion(supportSummary.awarded_amount_million)}`
        : ''),
    );
  }
  if (data) {
    lines.push(`데이터 신뢰도: ${data.value}${data.note ? ` — ${data.note}` : ''}`);
  }
  if (latestYearly?.revenue != null) {
    lines.push(
      `기준 ${asOfFy}년 매출 ${formatMillion(latestYearly.revenue / 1000)}`
      + (latestYearly.op_margin_pct != null ? ` · 영업이익률 ${formatPct(latestYearly.op_margin_pct)}` : ''),
    );
  }

  const priority_checks = core
    .filter(item => item.status === 'red' || item.status === 'yellow')
    .map(item => `${item.label}: ${item.value}`);

  return { lines, priority_checks, signal_counts: signalCounts };
}

function statusLabel(status: SixBoxCheck['status']): string {
  if (status === 'red') return '긴급';
  if (status === 'yellow') return '주의';
  if (status === 'gray') return '확인 대기';
  return '특이신호 없음';
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
  const latest = yearlies.find(yearly => yearly.fiscal_year === asOfFy)
    ?? yearlies[yearlies.length - 1]
    ?? null;
  const revenue = latest?.revenue ?? null;
  const employment = latest?.pension_enrolled ?? latest?.employees ?? null;
  const revenueLevelPctl = percentiles.get('revenue_level');
  const employmentLevelPctl = percentiles.get('employment_level');
  const tenure = tenureYears(master.founded_date, asOfFy);
  const effectiveFy = latest?.fiscal_year ?? asOfFy;

  // 매출 성장률은 생존 예측력이 없어 참고지표로 분리 (테스트 호환을 위해 여기에도 유지하되 weight=0)
  const revenueGrowth = metrics.get('revenue_growth')?.value ?? null;
  const growthPctl = percentiles.get('revenue_growth');

  return [
    indicator({
      companyId: master.company_id,
      code: 'revenue_level',
      label: `매출액 (${effectiveFy}년)`,
      value: revenue === null ? null : revenue / 1000,
      unit: '백만원',
      percentile: revenueLevelPctl,
      status: revenue === null
        ? 'missing'
        : revenueLevelPctl && revenueLevelPctl.pctl < threshold.survival.revenue_pctl_caution
          ? 'caution'
          : 'ok',
      reason: revenue === null
        ? '재무 데이터 없음'
        : revenueLevelPctl
          ? `동종 ${revenueLevelPctl.cohort_level} n=${revenueLevelPctl.cohort_n}`
          : null,
      direction: 'higher_is_better',
      year: effectiveFy,
      formulaVersion: 'raw-v1',
    }),
    indicator({
      companyId: master.company_id,
      code: 'tenure_years',
      label: '업력',
      value: tenure,
      unit: '년',
      status: tenure === null
        ? 'missing'
        : tenure < threshold.survival.tenure_caution_years
          ? 'caution'
          : 'ok',
      reason: tenure !== null && tenure < threshold.survival.tenure_caution_years
        ? `${threshold.survival.tenure_caution_years}년 미만`
        : null,
      direction: 'neutral',
      year: effectiveFy,
      formulaVersion: 'tenure-v2',
    }),
    indicator({
      companyId: master.company_id,
      code: 'employment_level',
      label: `고용 인원 (${effectiveFy}년)`,
      value: employment,
      unit: '명',
      percentile: employmentLevelPctl,
      status: employment === null
        ? 'missing'
        : employment < threshold.survival.min_employees_viable
          || (employmentLevelPctl != null
            && employmentLevelPctl.pctl < threshold.survival.employment_pctl_caution)
          ? 'caution'
          : 'ok',
      reason: employment === null
        ? '고용 데이터 없음'
        : employmentLevelPctl != null
          ? `동종 ${employmentLevelPctl.cohort_level} n=${employmentLevelPctl.cohort_n}`
          : null,
      direction: 'higher_is_better',
      year: effectiveFy,
      formulaVersion: 'raw-v1',
    }),
    // 하위 호환: 프론트/테스트가 survival에서 growth를 찾을 수 있게 유지. weight=0 참고.
    indicator({
      companyId: master.company_id,
      code: 'revenue_growth',
      label: '매출 성장률 (전년비)',
      value: revenueGrowth,
      unit: '%',
      percentile: growthPctl,
      status: revenueGrowth === null ? 'missing' : revenueGrowth < 0 ? 'caution' : 'ok',
      reason: revenueGrowth === null
        ? '직전연도 또는 당해연도 매출 없음'
        : revenueGrowth < 0
          ? '매출 감소'
          : null,
      direction: 'higher_is_better',
      year: effectiveFy,
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
  const assets = latest?.assets ?? null;
  const debtRatio = metrics.get('debt_ratio')?.value ?? null;
  const operatingMargin = metrics.get('operating_margin')?.value ?? null;
  const rdIntensity = metrics.get('rd_intensity')?.value ?? null;
  const debtView = interpretDebtRatio(debtRatio, equity, assets);
  const effectiveFy = latest?.fiscal_year ?? asOfFy;

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
          : debtView.nearZeroEquity || debtRatio > threshold.financial.debt_ratio_warning
            ? 'warning'
            : debtRatio > threshold.financial.debt_ratio_caution
              ? 'caution'
              : 'ok',
      reason: equity !== null && equity <= 0
        ? '자본총계 0 이하'
        : debtView.nearZeroEquity
          ? debtView.display
          : null,
      direction: 'lower_is_better',
      year: effectiveFy,
    }),
    indicator({
      companyId,
      code: 'operating_margin',
      label: '영업이익률',
      value: operatingMargin,
      unit: '%',
      percentile: percentiles.get('operating_margin'),
      status: operatingMargin === null
        ? 'missing'
        : operatingMargin < 0
          ? 'caution'
          : 'ok',
      reason: operatingMargin !== null && operatingMargin < 0
        ? '영업적자'
        : null,
      direction: 'higher_is_better',
      year: effectiveFy,
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
      year: effectiveFy,
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

export function generateFollowUpQuestions(
  master: CompanyMaster,
  summaryChecks: SixBoxCheck[],
  supportSummary: SupportSummary,
  observedChanges: ObservedChangeAfterSupport[] = [],
): string[] {
  const questions: string[] = [];

  for (const checkItem of summaryChecks) {
    if (checkItem.status !== 'red' && checkItem.status !== 'yellow') continue;
    const priority = checkItem.status === 'red' ? '필수 확인' : '중점 확인';

    if (checkItem.code === 'survival' || checkItem.label === '매출 규모') {
      questions.push(
        `[${priority}] ${checkItem.value}. 신청서 매출·성장 가정을 수주처·계약잔액·세금계산서와 대조하고, 지원기간 중 자부담 조달 가능 여부를 확인하세요.`,
      );
    } else if (checkItem.code === 'finance' || checkItem.label === '재무 안정성') {
      questions.push(
        `[${priority}] ${checkItem.value}. 최근 차입 명세·원리금 상환일정·자본총계 변동을 확인해 지원기간 중 상환·손실흡수 여력을 점검하세요.`,
      );
    } else if (checkItem.code === 'capacity') {
      questions.push(
        `[${priority}] 사업수행 기반 ${checkItem.value}. 전담인력 배치·투입시간과 4대보험 가입자명부를 대조하세요.`,
      );
    } else if (checkItem.code === 'eligibility') {
      questions.push(
        `[${priority}] 공고 요건 ${checkItem.value}. 자격·배제 조항을 원문 기준으로 재확인하세요.`,
      );
    } else if (checkItem.code === 'data_quality') {
      questions.push(
        `[${priority}] 데이터 ${checkItem.value}. 결측 연도 가결산·증빙 제출을 요청하세요.`,
      );
    }
  }

  if (supportSummary.overlap_pairs.length > 0) {
    const episodeMap = new Map(supportSummary.episode_list.map(item => [item.episode_id, item]));
    const names = supportSummary.overlap_pairs.slice(0, 2).map(pair => {
      const left = episodeMap.get(pair.ep1_id);
      const right = episodeMap.get(pair.ep2_id);
      return `${left?.program_name || left?.biz_type || '사업 1'} ↔ ${right?.program_name || right?.biz_type || '사업 2'} (${pair.overlap_days}일)`;
    }).join(', ');
    questions.push(
      `[중복수혜 필수 확인] 수행기간 중첩 ${supportSummary.overlap_pairs.length}쌍: ${names}. 협약서의 사업목적·수행인력·비용항목·집행기간을 나란히 대조하세요.`,
    );
  }

  if (supportSummary.same_purpose_repeats.length > 0) {
    const top = supportSummary.same_purpose_repeats[0];
    questions.push(
      `[중복수혜 필수 확인] 동일 목적(${top.purpose}) ${top.episode_count}회. 직전 지원 산출물과 이번 사업 단계의 차이를 확인하세요.`,
    );
  }

  if (supportSummary.missing_amount_count > 0) {
    const names = supportSummary.episode_list
      .filter(episode => episode.amount_flag === 'missing')
      .map(episode => episode.program_name || episode.biz_type || '사업명 확인 필요')
      .slice(0, 3)
      .join(', ');
    questions.push(
      `[중복수혜 필수 확인] 금액 미확인 ${supportSummary.missing_amount_count}건(${names}). 협약서·정산서에서 정부지원금·기업부담금·집행액을 확인하세요.`,
    );
  }

  if (supportSummary.zero_amount_count > 0) {
    questions.push(
      `[중복수혜 필수 확인] 원천금액 0원 ${supportSummary.zero_amount_count}건. 비금전 지원인지 미입력인지 확인하고, 현물·서비스라면 지원항목과 환산가액을 기록하세요.`,
    );
  }

  const weakOutcomes = observedChanges.filter(
    item => item.status === 'unchanged' || item.status === 'insufficient',
  );
  if (weakOutcomes.length > 0) {
    questions.push(
      `[성과 확인] 직전 지원 ${weakOutcomes.length}건에서 매출·고용·신규특허 개선이 관측되지 않았습니다. 산출물과 후속 성과를 증빙으로 요청하세요.`,
    );
  }

  if (!master.founded_date) {
    questions.push(
      '[자격요건 필수 확인] 법인등기부·사업자등록증의 설립일을 확인해 공고의 업력 기준일로 다시 계산하세요.',
    );
  }

  // 중복 제거
  return [...new Set(questions)];
}
