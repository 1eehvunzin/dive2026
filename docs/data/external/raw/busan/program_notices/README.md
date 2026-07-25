# 부산 지원사업 공고 검증 원본

## 확보 파일

| 파일 | 기관 | 공고 | 페이지 | SHA-256 |
|---|---|---|---:|---|
| `btp_2026_rnd_equipment_support_2nd_notice.pdf` | 부산광역시·부산테크노파크 | 2026년 부산 연구개발장비 공동활용 지원사업 모집 공고(2차) | 12 | `d716c0776fd789291984075da9026e6fc9847b5b075fea7060e89fa7c3816cf6` |

## 출처

- 부산테크노파크 원문 공고 페이지:
  <https://www.btp.or.kr/kor/CMS/Board/Board.do?board_seq=9582071&mCode=MN013&mgr_seq=16&mode=view>
- 정부 기업마당 공고 페이지:
  <https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000123478>
- 내려받은 PDF:
  <https://www.bizinfo.go.kr/cmm/fms/fileDown.do?atchFileId=FILE_000000000761037&fileSn=1>

부산테크노파크 원문 페이지는 공고 원본을 HWPX로 제공한다. 이 폴더의 PDF는
같은 공고를 정부 기업마당에서 제공하는 본문출력 PDF이며, PDF 생성 메타데이터의
생성일은 2026-06-23이다.

## Upstage 실연동 검증

- 공식 문서: <https://console.upstage.ai/api/docs/for-agents/raw>
- 실행일: 2026-07-25
- 입력 파일 SHA-256:
  `d716c0776fd789291984075da9026e6fc9847b5b075fea7060e89fa7c3816cf6`
- 1단계: `POST /v1/document-digitization`, 모델 별칭 `document-parse`
- 실제 파서 버전: `document-parse-260128`
- 문서 처리량: 12쪽
- 2단계: `POST /v1/chat/completions`, 모델 별칭 `solar-pro3`,
  JSON Schema structured output
- 결과: `data/processed/program_notice_validation.json`
- 결과 상태: `fallback=false`, 공고 요구사항 23건 구조화

API 키 값은 파일 또는 로그에 기록하지 않았다.

## 검증 결과에서 확인한 주의점

- 제목, 수행기관, 접수 마감일, 기업당 지원 한도, 부산 소재 요건은 원문과
  일치했다.
- 배점이 없는 공고인데 다수 요구사항의 `weight`가 `1`로 생성됐다. 이 값은 실제
  배점이 아니므로 자동 평가에 사용하면 안 되며, 원문에 명시된 배점이 없으면
  서버 정규화 단계에서 반드시 `null`로 강제해야 한다.
- `manual_review` 조건은 API 응답에서 `rule=null`로 정규화돼 수동 검토 대상임을
  구분할 수 있다.
- 원문 근거 문장과 페이지가 생성됐지만, 운영 반영 전 Document Parse 요소의
  페이지 좌표와 대조하는 후처리 검증이 필요하다.
- 같은 의미의 중복 지원 제외요건이 신청 제외 조건과 사후 환수 조건에 각각
  검출됐다. 요구사항의 `적용 시점`을 별도 필드로 두거나 중복 병합 정책이 필요하다.
