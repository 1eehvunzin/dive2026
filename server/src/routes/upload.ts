import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import type { Program } from '../lib/types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const SOLAR_BASE = 'https://api.upstage.ai/v1';

const EXTRACT_PROMPT = `이 공고문 PDF에서 다음 항목을 추출해 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
{
  "title": "사업명",
  "agency": "주관 기관",
  "field": "지원 분야",
  "budget": "총 사업 예산",
  "supportPerCompany": "기업당 지원 규모",
  "deadline": "접수 마감 (YYYY-MM-DD 형식, 없으면 null)",
  "targetStage": "대상 기업 단계 (예: 소기업, 중소기업, 창업 7년 이내)",
  "keywords": ["평가 키워드 최대 10개"],
  "description": "사업 개요 (2-3문장)",
  "exclusion_rules": ["배제 요건 목록"],
  "evaluation_items": [{"label": "평가항목", "score": 배점숫자}]
}`;

async function parseWithSolarDocument(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.SOLAR_API_KEY;
  if (!apiKey) throw new Error('SOLAR_API_KEY not set');

  // Upstage Document Parse API
  const formData = new FormData();
  const blob = new Blob([Buffer.from(base64, 'base64')], { type: mimeType });
  formData.append('document', blob, 'document.pdf');
  formData.append('output_formats', '["text"]');

  const parseResp = await fetch(`${SOLAR_BASE}/document-digitization`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!parseResp.ok) {
    const err = await parseResp.text();
    throw new Error(`Document parse failed: ${err}`);
  }

  const parseData = await parseResp.json() as { content?: { text?: string } };
  return parseData.content?.text || '';
}

async function extractWithSolar(docText: string): Promise<Partial<Program>> {
  const apiKey = process.env.SOLAR_API_KEY;
  if (!apiKey) throw new Error('SOLAR_API_KEY not set');

  const resp = await fetch(`${SOLAR_BASE}/solar/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'solar-pro',
      messages: [
        { role: 'system', content: '공고문에서 정보를 추출하는 전문가입니다. JSON만 출력합니다.' },
        { role: 'user', content: `${EXTRACT_PROMPT}\n\n[공고문 내용]\n${docText.slice(0, 8000)}` },
      ],
      max_tokens: 2048,
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Solar extraction failed: ${err}`);
  }

  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices?.[0]?.message?.content ?? '{}';

  // JSON 블록 추출
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');
  return JSON.parse(jsonMatch[0]);
}

// POST /api/upload/analyze
router.post('/analyze', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일이 없습니다' });
  }

  const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const base64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype || 'application/pdf';

  // Solar API 미설정 시 fallback
  if (!process.env.SOLAR_API_KEY) {
    const fallback: Program = {
      id: `prog-${Date.now()}`,
      title: req.file.originalname.replace('.pdf', ''),
      agency: '미파악',
      field: '미파악',
      budget: '미파악',
      supportPerCompany: '미파악',
      deadline: '',
      targetStage: '소기업',
      keywords: [],
      description: 'SOLAR_API_KEY 미설정으로 자동 추출 불가. 수동으로 내용을 입력해주세요.',
    };
    return res.json({ program: fallback, fallback: true, sha256 });
  }

  try {
    // 1. 문서 파싱
    const docText = await parseWithSolarDocument(base64, mimeType);

    // 2. 정보 추출
    const extracted = await extractWithSolar(docText);

    const program: Program = {
      id: `prog-${Date.now()}`,
      title: String(extracted.title || ''),
      agency: String(extracted.agency || ''),
      field: String(extracted.field || ''),
      budget: String(extracted.budget || ''),
      supportPerCompany: String(extracted.supportPerCompany || ''),
      deadline: String((extracted as any).deadline || ''),
      targetStage: String(extracted.targetStage || ''),
      keywords: Array.isArray(extracted.keywords) ? extracted.keywords : [],
      description: String(extracted.description || ''),
    };

    return res.json({ program, fallback: false, sha256 });
  } catch (err) {
    console.error('[upload] Solar API error:', err);
    // fallback
    const fallback: Program = {
      id: `prog-${Date.now()}`,
      title: req.file.originalname.replace('.pdf', ''),
      agency: '',
      field: '',
      budget: '',
      supportPerCompany: '',
      deadline: '',
      targetStage: '',
      keywords: [],
      description: `자동 추출 실패: ${String(err).slice(0, 100)}. 수동으로 입력해주세요.`,
    };
    return res.json({ program: fallback, fallback: true, sha256, error: String(err) });
  }
});

export default router;
