import { Router } from 'express';
import { buildReport } from '../lib/report-engine';
import { getDb } from '../db/connection';

const router = Router();

router.get('/:id', (req, res) => {
  const evidenceId = String(req.params.id);
  if (evidenceId.startsWith('btp_support:')) {
    const episodeId = evidenceId.slice('btp_support:'.length);
    const episode = getDb().prepare(`
      SELECT *
      FROM support_episode
      WHERE episode_id = ?
    `).get(episodeId);
    if (!episode) return res.status(404).json({ error: 'Evidence not found' });
    return res.json({
      evidence_id: evidenceId,
      source_file: '부산TP 사업기업목록',
      source_sheet_page: '선정·지원 이력',
      source_row_cell: `episode_id=${episodeId}`,
      raw_value: episode,
      normalized_value: episode,
      formula: null,
      formula_version: 'support-episode-v1',
    });
  }
  const ntisMatch = evidenceId.match(/^ntis:(\d+):([^:]+):summary$/);
  if (ntisMatch) {
    const companyId = Number.parseInt(ntisMatch[1], 10);
    const report = buildReport(companyId);
    if (!report) return res.status(404).json({ error: 'Company not found' });
    return res.json({
      evidence_id: evidenceId,
      source_file: 'NTIS 국가R&D 과제',
      source_sheet_page: '기업별 과제 매칭',
      source_row_cell: `company_id=${companyId}`,
      reference_year: report.ntis_summary.latest_year,
      raw_value: report.ntis_summary,
      normalized_value: report.ntis_summary,
      formula: '기준연도 확인 가능 과제 집계',
      formula_version: 'ntis-summary-v1',
    });
  }
  const match = evidenceId.match(/^kodata:(\d+):(\d+|latest):([a-z0-9_]+)$/);
  if (!match) return res.status(400).json({ error: 'invalid evidence id' });
  const companyId = Number.parseInt(match[1], 10);
  const requestedYear = match[2] === 'latest' ? null : Number.parseInt(match[2], 10);
  const report = buildReport(
    companyId,
    null,
    requestedYear === null ? null : `${requestedYear + 1}-05-01`,
  );
  if (!report) return res.status(404).json({ error: 'Company not found' });
  const evidence = report.evidence.find(item => item.evidence_id === evidenceId);
  if (!evidence) {
    const technologyValues: Record<string, unknown> = {
      patent_registered: report.technology_evidence.patent_registered,
      patent_applied: report.technology_evidence.patent_applied,
      valid_patent_count: report.technology_evidence.valid_patent_count,
      researcher_count: report.technology_evidence.researcher_count,
      corporate_lab: report.technology_evidence.has_corporate_lab,
      rd_department: report.technology_evidence.has_rd_dept,
      rd_intensity: report.technology_evidence.rd_intensity_pct,
    };
    if (!(match[3] in technologyValues)) return res.status(404).json({ error: 'Evidence not found' });
    return res.json({
      evidence_id: evidenceId,
      source_file: 'KODATA 기업데이터',
      source_sheet_page: '기업정보·기술현황',
      source_row_cell: `company_id=${companyId},field=${match[3]}`,
      reference_year: report.data_quality.latest_financial_year,
      raw_value: technologyValues[match[3]],
      normalized_value: technologyValues[match[3]],
      formula: null,
      formula_version: 'raw-v1',
    });
  }
  return res.json(evidence);
});

export default router;
