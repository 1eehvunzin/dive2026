import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import type { Program, ProgramRequirement } from '../lib/types';

const router = Router();
const REVIEW_STATUSES = new Set(['draft', 'reviewed', 'active']);

type ProgramRow = {
  program_id: string;
  title: string;
  agency: string | null;
  field: string | null;
  budget_text: string | null;
  support_per_company_text: string | null;
  deadline: string | null;
  target_stage_text: string | null;
  keywords_json: string;
  description: string | null;
  document_id: string | null;
  review_status: Program['reviewStatus'];
};

type RequirementRow = {
  requirement_id: string;
  requirement_type: ProgramRequirement['type'];
  label: string;
  rule_json: string | null;
  weight: number | null;
  source_page: number | null;
  source_text: string | null;
  review_status: ProgramRequirement['reviewStatus'];
};

function rowToProgram(row: ProgramRow): Program {
  const requirements = getDb().prepare(`
    SELECT *
    FROM program_requirement
    WHERE program_id = ?
    ORDER BY requirement_type, requirement_id
  `).all(row.program_id) as RequirementRow[];
  return {
    id: row.program_id,
    title: row.title,
    agency: row.agency || '',
    field: row.field || '',
    budget: row.budget_text || '',
    supportPerCompany: row.support_per_company_text || '',
    deadline: row.deadline || '',
    targetStage: row.target_stage_text || '',
    keywords: JSON.parse(row.keywords_json || '[]') as string[],
    description: row.description || '',
    reviewStatus: row.review_status,
    documentId: row.document_id,
    requirements: requirements.map(requirement => ({
      id: requirement.requirement_id,
      type: requirement.requirement_type,
      label: requirement.label,
      rule: requirement.rule_json ? JSON.parse(requirement.rule_json) as Record<string, unknown> : null,
      weight: requirement.weight,
      sourcePage: requirement.source_page,
      sourceText: requirement.source_text,
      reviewStatus: requirement.review_status,
    })),
  };
}

function validateProgram(input: unknown): Omit<Program, 'id'> {
  if (!input || typeof input !== 'object') throw new Error('body must be an object');
  const body = input as Partial<Program>;
  if (!body.title?.trim()) throw new Error('title is required');
  const reviewStatus = body.reviewStatus || 'draft';
  if (!REVIEW_STATUSES.has(reviewStatus)) throw new Error('invalid reviewStatus');
  const requirements = Array.isArray(body.requirements) ? body.requirements : [];
  return {
    title: body.title.trim(),
    agency: String(body.agency || ''),
    field: String(body.field || ''),
    budget: String(body.budget || ''),
    supportPerCompany: String(body.supportPerCompany || ''),
    deadline: String(body.deadline || ''),
    targetStage: String(body.targetStage || ''),
    keywords: Array.isArray(body.keywords) ? body.keywords.map(String).slice(0, 30) : [],
    description: String(body.description || ''),
    reviewStatus,
    documentId: body.documentId || null,
    requirements: requirements.map((requirement, index) => ({
      id: requirement.id || `req-${index + 1}-${crypto.randomUUID()}`,
      type: requirement.type,
      label: String(requirement.label || '').trim(),
      rule: requirement.rule && typeof requirement.rule === 'object' ? requirement.rule : null,
      weight: typeof requirement.weight === 'number' ? requirement.weight : null,
      sourcePage: typeof requirement.sourcePage === 'number' ? requirement.sourcePage : null,
      sourceText: requirement.sourceText ? String(requirement.sourceText) : null,
      reviewStatus: REVIEW_STATUSES.has(requirement.reviewStatus) ? requirement.reviewStatus : 'draft',
    })).filter(requirement => requirement.label),
  };
}

function saveProgram(programId: string, input: Omit<Program, 'id'>): Program {
  const db = getDb();
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(`
      INSERT INTO program_master (
        program_id, title, agency, field, budget_text, support_per_company_text,
        deadline, target_stage_text, keywords_json, description, document_id,
        review_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(program_id) DO UPDATE SET
        title = excluded.title,
        agency = excluded.agency,
        field = excluded.field,
        budget_text = excluded.budget_text,
        support_per_company_text = excluded.support_per_company_text,
        deadline = excluded.deadline,
        target_stage_text = excluded.target_stage_text,
        keywords_json = excluded.keywords_json,
        description = excluded.description,
        document_id = excluded.document_id,
        review_status = excluded.review_status,
        updated_at = excluded.updated_at
    `).run(
      programId,
      input.title,
      input.agency,
      input.field,
      input.budget,
      input.supportPerCompany,
      input.deadline || null,
      input.targetStage,
      JSON.stringify(input.keywords),
      input.description,
      input.documentId || null,
      input.reviewStatus,
      now,
      now,
    );
    db.prepare('DELETE FROM program_requirement WHERE program_id = ?').run(programId);
    const insertRequirement = db.prepare(`
      INSERT INTO program_requirement (
        requirement_id, program_id, requirement_type, label, rule_json,
        weight, source_page, source_text, review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const requirement of input.requirements) {
      insertRequirement.run(
        requirement.id,
        programId,
        requirement.type,
        requirement.label,
        requirement.rule ? JSON.stringify(requirement.rule) : null,
        requirement.weight,
        requirement.sourcePage,
        requirement.sourceText,
        requirement.reviewStatus,
      );
    }
  })();
  const saved = db.prepare('SELECT * FROM program_master WHERE program_id = ?').get(programId) as ProgramRow;
  return rowToProgram(saved);
}

router.get('/', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM program_master ORDER BY updated_at DESC').all() as ProgramRow[];
  res.json(rows.map(rowToProgram));
});

router.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM program_master WHERE program_id = ?').get(req.params.id) as ProgramRow | undefined;
  if (!row) return res.status(404).json({ error: 'Program not found' });
  return res.json(rowToProgram(row));
});

router.post('/', (req: Request, res: Response) => {
  try {
    const input = validateProgram(req.body);
    return res.status(201).json(saveProgram(`prog-${crypto.randomUUID()}`, input));
  } catch (error) {
    return res.status(400).json({ error: String(error instanceof Error ? error.message : error) });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const programId = String(req.params.id);
    const exists = getDb().prepare('SELECT 1 FROM program_master WHERE program_id = ?').get(programId);
    if (!exists) return res.status(404).json({ error: 'Program not found' });
    return res.json(saveProgram(programId, validateProgram(req.body)));
  } catch (error) {
    return res.status(400).json({ error: String(error instanceof Error ? error.message : error) });
  }
});

export default router;
