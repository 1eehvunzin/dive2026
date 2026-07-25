import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import type { CompanyMaster, CompanyYearly, CompanyPercentile, CompanyListItem, FinancialPoint } from '../lib/types';

const router = Router();

function buildStage(size: string | null, foundedDate: string | null): string {
  if (!size && !foundedDate) return '미분류';
  const tenure = foundedDate
    ? new Date().getFullYear() - new Date(foundedDate).getFullYear()
    : null;

  if (size === '소상공인' || size === '소기업') {
    if (tenure !== null && tenure < 3) return 'Early';
    if (tenure !== null && tenure < 7) return 'Growth';
    return 'Stable';
  }
  if (size === '중기업') return 'Mid-Size';
  if (size === '중견기업' || size === '대기업') return 'Large';
  return size || '미분류';
}

function formatFunding(amountMillion: number): string {
  if (amountMillion >= 10000) return `${(amountMillion / 10000).toFixed(1)}조원`;
  if (amountMillion >= 1000) return `${(amountMillion / 1000).toFixed(1)}억원`;
  if (amountMillion > 0) return `${amountMillion.toFixed(0)}백만원`;
  return '지원 없음';
}

function buildOneLiner(master: CompanyMaster): string {
  if (master.main_product) {
    const p = master.main_product.slice(0, 30).replace(/\s+/g, ' ').trim();
    return p || master.ind_name || '업종 정보 없음';
  }
  return master.ind_name || '업종 정보 없음';
}

function buildTags(master: CompanyMaster, bizTypes: string[]): string[] {
  const tags: string[] = [];
  if (master.inno_biz) tags.push('이노비즈');
  if (master.venture) tags.push('벤처');
  if (master.main_biz) tags.push('메인비즈');
  if (master.material_parts) tags.push('소재부품');
  if (master.has_corporate_lab) tags.push('기업부설연구소');
  for (const bt of bizTypes) if (bt && !tags.includes(bt)) tags.push(bt);
  return tags.slice(0, 5);
}

function buildStrengths(master: CompanyMaster, latestYearly: CompanyYearly | null): string[] {
  const s: string[] = [];
  if (master.venture) s.push('벤처기업 인증 보유');
  if (master.has_corporate_lab) s.push('기업부설연구소 운영');
  if (latestYearly?.patent_reg && latestYearly.patent_reg > 0) s.push(`특허 ${latestYearly.patent_reg}건 등록`);
  if (latestYearly?.revenue && latestYearly.op_profit !== null && latestYearly.op_profit > 0) s.push('영업이익 흑자');
  return s.slice(0, 3);
}

function buildRisks(master: CompanyMaster, latestYearly: CompanyYearly | null): string[] {
  const r: string[] = [];
  if (master.closed_flag) r.push(`${master.biz_status} — 운영 상태 확인 필요`);
  if (latestYearly?.equity !== null && latestYearly?.equity !== undefined && latestYearly.equity <= 0) {
    r.push('자본잠식 상태');
  } else if (latestYearly?.liabilities && latestYearly?.equity && latestYearly.equity > 0) {
    const dr = latestYearly.liabilities / latestYearly.equity * 100;
    if (dr > 200) r.push(`부채비율 ${Math.round(dr)}% (주의)`);
  }
  if (latestYearly?.op_margin_pct !== null && latestYearly?.op_margin_pct !== undefined && latestYearly.op_margin_pct < 0) {
    r.push('영업적자 기록');
  }
  return r.slice(0, 3);
}

// GET /api/companies?size=소기업&region=부산&page=0&limit=50
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { size, region, search, page = '0', limit = '50' } = req.query as Record<string, string>;

  const pageNum = Math.max(0, parseInt(page, 10) || 0);
  const limitNum = Math.min(200, parseInt(limit, 10) || 50);
  const offset = pageNum * limitNum;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (size) { conditions.push('m.size = ?'); params.push(size); }
  if (region) { conditions.push('m.region = ?'); params.push(region); }
  if (search) {
    conditions.push('(m.ind_name LIKE ? OR m.main_product LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const masters = db.prepare(`
    SELECT * FROM company_master m ${where}
    ORDER BY m.company_id
    LIMIT ? OFFSET ?
  `).all([...params, limitNum, offset]) as CompanyMaster[];

  if (masters.length === 0) {
    return res.json([]);
  }

  const ids = masters.map(m => m.company_id);
  const placeholders = ids.map(() => '?').join(',');

  const yearlies = db.prepare(`
    SELECT * FROM company_yearly
    WHERE company_id IN (${placeholders})
    ORDER BY fiscal_year DESC
  `).all(ids) as CompanyYearly[];

  const pctls = db.prepare(`
    SELECT * FROM company_percentile
    WHERE company_id IN (${placeholders})
  `).all(ids) as CompanyPercentile[];

  // 지원 이력 집계
  const epAmounts = db.prepare(`
    SELECT company_id, SUM(total_amount) as total, GROUP_CONCAT(DISTINCT biz_type) as btypes
    FROM support_episode
    WHERE company_id IN (${placeholders})
    GROUP BY company_id
  `).all(ids) as Array<{ company_id: number; total: number; btypes: string }>;

  // 인덱스 구축
  const yearlyMap = new Map<number, CompanyYearly[]>();
  for (const y of yearlies) {
    if (!yearlyMap.has(y.company_id)) yearlyMap.set(y.company_id, []);
    yearlyMap.get(y.company_id)!.push(y);
  }
  const pctlMap = new Map<number, CompanyPercentile[]>();
  for (const p of pctls) {
    if (!pctlMap.has(p.company_id)) pctlMap.set(p.company_id, []);
    pctlMap.get(p.company_id)!.push(p);
  }
  const epMap = new Map(epAmounts.map(e => [e.company_id, e]));

  const items: CompanyListItem[] = masters.map(master => {
    const cid = master.company_id;
    const ylist = (yearlyMap.get(cid) || []).sort((a, b) => b.fiscal_year - a.fiscal_year);
    const latestY = ylist[0] || null;
    const ep = epMap.get(cid);
    const bizTypes = ep?.btypes ? ep.btypes.split(',') : [];

    const financials: FinancialPoint[] = ylist.slice(0, 5).reverse().map(y => ({
      year: y.fiscal_year,
      revenue: y.revenue !== null ? Math.round(y.revenue / 1000) : null,
      op_profit: y.op_profit !== null ? Math.round(y.op_profit / 1000) : null,
      net_income: y.net_income !== null ? Math.round(y.net_income / 1000) : null,
      assets: y.assets !== null ? Math.round(y.assets / 1000) : null,
      liabilities: y.liabilities !== null ? Math.round(y.liabilities / 1000) : null,
      equity: y.equity !== null ? Math.round(y.equity / 1000) : null,
      op_margin_pct: y.op_margin_pct,
    }));

    const fundingMillion = ep ? Math.round((ep.total || 0) / 1000) : 0;

    const debtRatio = (latestY?.liabilities && latestY?.equity && latestY.equity > 0)
      ? Math.round(latestY.liabilities / latestY.equity * 100) : null;

    const pctlRows = pctlMap.get(cid) || [];
    const revPctl = pctlRows.find(p => p.metric_code === 'revenue_growth')?.pctl ?? 50;
    const matchScore = Math.min(100, Math.round(
      (master.venture ? 10 : 0) +
      (master.inno_biz ? 10 : 0) +
      (master.has_corporate_lab ? 10 : 0) +
      (latestY?.patent_reg ? Math.min(15, latestY.patent_reg * 3) : 0) +
      revPctl * 0.55
    ));

    return {
      id: String(cid),
      name: `기업_${cid}`,
      logoSeed: String(cid).slice(0, 1),
      industry: master.ind_name || '업종 미상',
      stage: buildStage(master.size, master.founded_date),
      location: master.region || '지역 미상',
      founded: master.founded_date ? new Date(master.founded_date).getFullYear() : null,
      employees: latestY?.pension_enrolled ?? latestY?.employees ?? null,
      matchScore,
      fundingTotal: formatFunding(fundingMillion),
      lastRoundValuation: '-',
      ceo: '-',
      oneLiner: buildOneLiner(master),
      tags: buildTags(master, bizTypes),
      scoreBreakdown: [
        { label: '기술역량', score: (master.venture ? 10 : 0) + (master.inno_biz ? 10 : 0), maxScore: 20 },
        { label: '성장성', score: Math.round(revPctl * 0.3), maxScore: 30 },
        { label: '재무안정성', score: debtRatio !== null && debtRatio <= 200 ? 20 : 5, maxScore: 20 },
        { label: '지식재산', score: latestY?.patent_reg ? Math.min(15, latestY.patent_reg * 3) : 0, maxScore: 15 },
      ],
      strengths: buildStrengths(master, latestY),
      risks: buildRisks(master, latestY),
      financials,
      patents: latestY?.patent_reg ?? 0,
      certifications: [
        master.inno_biz && '이노비즈',
        master.venture && '벤처기업',
        master.main_biz && '메인비즈',
        master.material_parts && '소재부품',
      ].filter(Boolean) as string[],
      creditGrade: '-',
      debtRatio,
      currentRatio: null,
      runwayMonths: null,
      report: {
        summary: `${master.ind_name || '업종 미상'} 영위 ${master.size || ''} 기업. 설립: ${master.founded_date?.slice(0, 4) || '미상'}.`,
        market: master.main_product ? `주요 제품: ${master.main_product.slice(0, 50)}` : '제품 정보 없음',
        technology: master.has_corporate_lab ? '기업부설연구소 보유' : 'R&D 인프라 정보 없음',
        team: latestY?.pension_enrolled ? `국민연금 가입자 ${latestY.pension_enrolled}명` : '고용 정보 없음',
        finance: latestY?.revenue ? `매출 ${Math.round(latestY.revenue / 1000)}백만원 (${latestY.fiscal_year})` : '재무 정보 없음',
      },
    };
  });

  return res.json(items);
});

// GET /api/companies/:id — 단일 기업 상세 (기업 목록 포맷)
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const cid = parseInt(req.params['id'] as string, 10);
  if (isNaN(cid)) return res.status(400).json({ error: 'id must be a number' });

  const master = db.prepare('SELECT * FROM company_master WHERE company_id = ?').get(cid) as CompanyMaster | undefined;
  if (!master) return res.status(404).json({ error: 'Company not found' });

  return res.json(master);
});

export default router;
