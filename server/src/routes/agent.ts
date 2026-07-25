import { Router, Request, Response } from 'express';
import { buildReport } from '../lib/report-engine';

const router = Router();

const SOLAR_BASE = 'https://api.upstage.ai/v1/solar';
const SOLAR_MODEL = 'solar-pro';

async function callSolar(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.SOLAR_API_KEY;
  if (!apiKey) throw new Error('SOLAR_API_KEY not set');

  const resp = await fetch(`${SOLAR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: SOLAR_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Solar API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

function buildSystemPrompt(report: ReturnType<typeof buildReport>): string {
  if (!report) return '기업 데이터 없음';

  const p = report.company_profile;
  const survival = report.survival_indicators;
  const tech = report.technology_evidence;
  const support = report.support_summary;
  const checks = report.summary_checks;

  return `당신은 공공 지원사업 평가를 보조하는 AI 분석 에이전트입니다.
아래 기업 실사 리포트 데이터를 기반으로 담당자 질문에 답변하세요.
- 반드시 주어진 데이터 내에서만 답변하세요
- 시장규모·외부 성장률 등 데이터에 없는 수치는 추정하지 마세요
- 최종 선정/탈락 단정은 하지 마세요
- 한국어로, 간결하고 근거 중심으로 작성하세요

[기업 개요]
업종: ${p.ind_name || '미상'} (KSIC: ${p.ksic11 || '미상'})
규모: ${p.size || '미상'} | 지역: ${p.region || '미상'}
업력: ${p.tenure_years !== null ? p.tenure_years + '년' : '미상'} | 상태: ${p.biz_status || '미상'}
주요제품: ${p.main_product || '정보없음'}
인증: ${p.certifications.length > 0 ? p.certifications.join(', ') : '없음'}

[30초 판단판]
${checks.map(c => `${c.status === 'red' ? '🔴' : c.status === 'yellow' ? '🟡' : c.status === 'green' ? '🟢' : '⚪'} ${c.label}: ${c.value}${c.note ? ' (' + c.note + ')' : ''}`).join('\n')}

[생존 지표]
${survival.map(r => `${r.label}: ${r.value !== null ? r.value + r.unit : '데이터없음'}${r.pctl !== null ? ' (동종 ' + r.pctl.toFixed(0) + '백분위)' : ''}`).join('\n')}

[기술 역량]
특허(등록/출원): ${tech.patent_registered ?? '-'}/${tech.patent_applied ?? '-'}건
유효특허: ${tech.valid_patent_count ?? '-'}건 | 연구원: ${tech.researcher_count ?? '-'}명
R&D집약도: ${tech.rd_intensity_pct !== null ? tech.rd_intensity_pct.toFixed(1) + '%' : '데이터없음'}

[지원 이력]
총 ${support.total_episodes}건 (${support.total_amount_million}백만원)
수혜연도: ${support.years_received.join(', ') || '없음'}${support.is_consecutive_3yr ? ' (3년 연속)' : ''}

[데이터 경고]
${report.data_warnings.length > 0 ? report.data_warnings.join('\n') : '없음'}`;
}

// POST /api/agent/chat
router.post('/chat', async (req: Request, res: Response) => {
  const { companyId, question, context } = req.body as {
    companyId: string;
    question: string;
    context?: string;
  };

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  const cid = parseInt(companyId, 10);

  // Solar API 미설정 시 규칙 기반 fallback
  if (!process.env.SOLAR_API_KEY) {
    return res.json({
      answer: `[Solar API 미연동 — 규칙 기반 응답]\n질문: "${question}"\n\n기업 ID ${cid}에 대한 AI 분석을 이용하려면 서버에 SOLAR_API_KEY를 설정해주세요.`,
      fallback: true,
    });
  }

  try {
    const report = isNaN(cid) ? null : buildReport(cid);
    const systemPrompt = report ? buildSystemPrompt(report) : '기업 정보를 찾을 수 없습니다.';

    const userMessage = context
      ? `[참고 문맥]\n${context}\n\n[질문]\n${question}`
      : question;

    const answer = await callSolar(systemPrompt, userMessage);
    return res.json({ answer, fallback: false });
  } catch (err) {
    console.error('[agent] Solar API error:', err);
    return res.status(500).json({ error: 'AI 응답 생성 실패', detail: String(err) });
  }
});

export default router;
