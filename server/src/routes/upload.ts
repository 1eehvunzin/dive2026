import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getDb } from '../db/connection';
import type { Program, ProgramRequirement } from '../lib/types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const UPSTAGE_BASE = 'https://api.upstage.ai/v1';
const SUPPORTED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.hwp', '.hwpx', '.pptx', '.xlsx',
  '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.heic',
]);
const REQUIREMENT_TYPES = new Set<ProgramRequirement['type']>([
  'eligibility', 'exclusion', 'preference', 'evaluation', 'document', 'obligation',
]);

type DocumentElement = {
  page?: number;
  content?: { text?: string; markdown?: string; html?: string };
};

type DocumentParseResponse = {
  model?: string;
  elements?: DocumentElement[];
  content?: { text?: string; markdown?: string; html?: string };
  usage?: { pages?: number };
};

type ExtractedProgram = {
  title: string;
  agency: string;
  field: string;
  budget: string;
  supportPerCompany: string;
  deadline: string;
  targetStage: string;
  keywords: string[];
  description: string;
  requirements: Array<{
    type: string;
    label: string;
    ruleField: string;
    ruleOperator: string;
    ruleValue: string;
    weight: number;
    sourcePage: number;
    sourceText: string;
  }>;
};

function apiKey(): string | null {
  return process.env.UPSTAGE_API_KEY || process.env.SOLAR_API_KEY || null;
}

function extension(filename: string): string {
  const index = filename.lastIndexOf('.');
  return index < 0 ? '' : filename.slice(index).toLowerCase();
}

function pageMarkedMarkdown(parsed: DocumentParseResponse): string {
  const pageMap = new Map<number, string[]>();
  for (const element of parsed.elements || []) {
    const page = element.page ?? 0;
    const text = element.content?.markdown || element.content?.text || '';
    if (!text.trim()) continue;
    if (!pageMap.has(page)) pageMap.set(page, []);
    pageMap.get(page)!.push(text.trim());
  }
  if (pageMap.size === 0) return parsed.content?.markdown || parsed.content?.text || '';
  return [...pageMap.entries()]
    .sort(([left], [right]) => left - right)
    .map(([page, chunks]) => `--- PAGE ${page} ---\n${chunks.join('\n')}`)
    .join('\n\n');
}

async function parseDocument(buffer: Buffer, filename: string, mimeType: string): Promise<DocumentParseResponse> {
  const key = apiKey();
  if (!key) throw new Error('UPSTAGE_API_KEY_NOT_SET');
  const form = new FormData();
  form.append('document', new Blob([buffer], { type: mimeType }), filename);
  form.append('model', 'document-parse');
  form.append('mode', 'auto');
  form.append('output_formats', '["markdown","text"]');
  form.append('ocr', 'auto');
  form.append('coordinates', 'true');
  form.append('merge_multipage_tables', 'true');
  const response = await fetch(`${UPSTAGE_BASE}/document-digitization`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!response.ok) throw new Error(`DOCUMENT_PARSE_${response.status}`);
  return response.json() as Promise<DocumentParseResponse>;
}

const PROGRAM_SCHEMA = {
  name: 'government_support_program',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      agency: { type: 'string' },
      field: { type: 'string' },
      budget: { type: 'string' },
      supportPerCompany: { type: 'string' },
      deadline: { type: 'string' },
      targetStage: { type: 'string' },
      keywords: { type: 'array', items: { type: 'string' } },
      description: { type: 'string' },
      requirements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['eligibility', 'exclusion', 'preference', 'evaluation', 'document', 'obligation'],
            },
            label: { type: 'string' },
            ruleField: { type: 'string' },
            ruleOperator: {
              type: 'string',
              enum: ['eq', 'in', 'starts_with', 'gte', 'lte', 'manual_review'],
            },
            ruleValue: { type: 'string' },
            weight: { type: 'number' },
            sourcePage: { type: 'integer' },
            sourceText: { type: 'string' },
          },
          required: [
            'type', 'label', 'ruleField', 'ruleOperator', 'ruleValue',
            'weight', 'sourcePage', 'sourceText',
          ],
          additionalProperties: false,
        },
      },
    },
    required: [
      'title', 'agency', 'field', 'budget', 'supportPerCompany', 'deadline',
      'targetStage', 'keywords', 'description', 'requirements',
    ],
    additionalProperties: false,
  },
};

async function structureWithSolar(markdown: string): Promise<ExtractedProgram> {
  const key = apiKey();
  if (!key) throw new Error('UPSTAGE_API_KEY_NOT_SET');
  const response = await fetch(`${UPSTAGE_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'solar-pro3',
      messages: [
        {
          role: 'system',
          content: [
            '부산 공공 지원사업 공고문을 심사 규칙으로 구조화한다.',
            '원문에 없는 값을 추정하지 않는다.',
            '배점이 없으면 weight=0, 페이지를 특정할 수 없으면 sourcePage=0으로 둔다.',
            '자동 판정할 수 없는 조건은 operator=manual_review로 둔다.',
            'ruleField, ruleOperator, ruleValue는 한 요건의 자동 판정 규칙이다.',
            'sourceText에는 판단 근거가 되는 짧은 원문을 넣는다.',
          ].join('\n'),
        },
        { role: 'user', content: markdown.slice(0, 120_000) },
      ],
      reasoning_effort: 'medium',
      temperature: 0.2,
      max_tokens: 8_000,
      response_format: { type: 'json_schema', json_schema: PROGRAM_SCHEMA },
    }),
  });
  if (!response.ok) throw new Error(`SOLAR_STRUCTURE_${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('SOLAR_EMPTY_RESPONSE');
  return JSON.parse(content) as ExtractedProgram;
}

export function normalizeExtracted(
  extracted: ExtractedProgram,
  documentId: string,
): Omit<Program, 'id'> {
  const hasExplicitScore = (text: string): boolean =>
    /(?:배점|점수|득점|총점)|(?:^|[^\d])\d+(?:\.\d+)?\s*점(?:[^\w]|$)/u.test(text);

  return {
    title: extracted.title || '',
    agency: extracted.agency || '',
    field: extracted.field || '',
    budget: extracted.budget || '',
    supportPerCompany: extracted.supportPerCompany || '',
    deadline: extracted.deadline || '',
    targetStage: extracted.targetStage || '',
    keywords: Array.isArray(extracted.keywords) ? extracted.keywords.map(String).slice(0, 30) : [],
    description: extracted.description || '',
    reviewStatus: 'draft',
    documentId,
    requirements: (extracted.requirements || []).map((requirement, index) => ({
      id: `req-${index + 1}-${crypto.randomUUID()}`,
      type: REQUIREMENT_TYPES.has(requirement.type as ProgramRequirement['type'])
        ? requirement.type as ProgramRequirement['type']
        : 'obligation',
      label: String(requirement.label || '').trim(),
      rule: requirement.ruleOperator === 'manual_review'
        ? null
        : {
            field: requirement.ruleField || '',
            operator: requirement.ruleOperator || '',
            value: requirement.ruleValue ?? '',
          },
      // LLM이 퍼센트나 목록 순서를 배점으로 오인할 수 있다. 근거문에 실제
      // '배점/점수/N점'이 있을 때만 자동 추출값을 보존한다.
      weight: hasExplicitScore(String(requirement.sourceText || ''))
        && Number.isFinite(requirement.weight)
        && requirement.weight > 0
        ? requirement.weight
        : null,
      sourcePage: Number.isInteger(requirement.sourcePage) && requirement.sourcePage > 0
        ? requirement.sourcePage
        : null,
      sourceText: String(requirement.sourceText || '').trim() || null,
      reviewStatus: 'draft' as const,
    })).filter(requirement => requirement.label),
  };
}

router.post('/parse', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  if (!SUPPORTED_EXTENSIONS.has(extension(req.file.originalname))) {
    return res.status(415).json({ error: 'unsupported file type' });
  }

  const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const existing = getDb().prepare('SELECT * FROM program_document WHERE sha256 = ?').get(sha256) as {
    document_id: string;
    parse_status: string;
  } | undefined;
  const documentId = existing?.document_id || `doc-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO program_document (document_id, filename, sha256, parse_status, parsed_at, parser_version)
    VALUES (?, ?, ?, 'processing', NULL, 'document-parse')
    ON CONFLICT(document_id) DO UPDATE SET parse_status = 'processing'
  `).run(documentId, req.file.originalname, sha256);

  if (!apiKey()) {
    getDb().prepare(`
      UPDATE program_document SET parse_status = 'manual_required', parsed_at = ? WHERE document_id = ?
    `).run(now, documentId);
    return res.json({
      fallback: true,
      documentId,
      sha256,
      program: {
        title: req.file.originalname.replace(/\.[^.]+$/, ''),
        agency: '',
        field: '',
        budget: '',
        supportPerCompany: '',
        deadline: '',
        targetStage: '',
        keywords: [],
        description: 'API 키가 없어 수동 검토가 필요합니다.',
        reviewStatus: 'draft',
        documentId,
        requirements: [],
      } satisfies Omit<Program, 'id'>,
    });
  }

  try {
    const parsed = await parseDocument(req.file.buffer, req.file.originalname, req.file.mimetype);
    const markdown = pageMarkedMarkdown(parsed);
    if (!markdown.trim()) throw new Error('DOCUMENT_PARSE_EMPTY');
    const extracted = await structureWithSolar(markdown);
    const program = normalizeExtracted(extracted, documentId);
    getDb().prepare(`
      UPDATE program_document
      SET parse_status = 'parsed', parsed_at = ?, parser_version = ?
      WHERE document_id = ?
    `).run(now, parsed.model || 'document-parse', documentId);
    return res.json({
      fallback: false,
      documentId,
      sha256,
      parser: parsed.model || 'document-parse',
      pages: parsed.usage?.pages ?? null,
      program,
    });
  } catch (error) {
    getDb().prepare(`
      UPDATE program_document SET parse_status = 'failed', parsed_at = ? WHERE document_id = ?
    `).run(now, documentId);
    return res.status(502).json({
      error: 'program document analysis failed',
      code: error instanceof Error ? error.message : 'UNKNOWN',
      documentId,
      sha256,
    });
  }
});

export default router;
