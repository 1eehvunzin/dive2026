# DIVE2026 backend

기업 2,886개와 부산TP 지원 이력, 한국은행 기업경영분석, 부산 지역 통계, NTIS를 이용해 기업 실사 리포트와 후보 비교 API를 제공한다.

## 데이터베이스

기본 경로는 `server/dive2026.db`다. 다른 DB를 사용할 때만 `DB_PATH`를 절대경로로 지정한다.

```bash
DB_PATH=/absolute/path/to/dive2026.db npm run dev
```

`GET /health`는 DB 스키마와 기업 수를 확인하며, 데이터가 없으면 HTTP 503을 반환한다. DB 파일은 배포 산출물에 포함하지 않으므로 배포 환경에서는 ETL 결과 DB를 별도로 배치해야 한다.

확정된 단위는 다음과 같다.

- 원천 재무 및 지원금: 천원
- API `financial_series`: 백만원
- API `support_total_million`: 백만원
- 평균 급여 API: 백만원
- 백분위: 0~100

## 실행

```bash
npm install
npm run dev
```

기본 포트는 4000이다. 실제 Upstage Document Parse 또는 Solar API가 필요한 공고문 파싱·에이전트 요청을 제외하면, 기업 조회와 리포트·비교·시뮬레이션은 로컬 DB만 사용한다.

## 검증

정적 데이터 계약만 빠르게 확인:

```bash
npm run validate:data
npm run validate:data -- --db /absolute/path/to/dive2026.db
```

실제 DB를 복사한 임시 DB에서 리포트 엔진과 HTTP 계약까지 회귀 검증:

```bash
npm test
```

테스트는 원본 `server/dive2026.db`를 읽기 전용으로 열고, API에서 회차를 생성해야 하는 검증은 운영 DB가 아닌 임시 복사본에서 수행한다. 외부 API는 호출하지 않는다.

주요 회귀 기준:

- 기업 수 2,886개
- 2024 매출 유효율 `2,201 / 2,886 = 76.3%`
- 총 지원금 `264,045,056천원 = 2,640.45억원`
- 한국은행 지표의 의미 기반 `metric_code`
- 기업 2124의 매출 규모 백분위와 성장률 백분위 분리
- `null` 지표의 `ok` 상태 금지
- 재무 API 단위 백만원
- 회차 기준일 이후 재무·지원·NTIS·유효특허 누수 금지
- 유사기업 결과 결정성
- 외부 벤치마크 연결
- 기업 목록/상세 DTO, 회차 정렬, 비교, 관찰 기반 모의투자 계약

## 핵심 API

- `GET /api/companies`: 실제 데이터 필드 기반 정렬·검색
- `GET /api/companies/:id`: 목록과 동일한 요약 DTO
- `GET /api/reports/:companyId`: 공고 없이도 생성되는 기본 실사 리포트
- `POST /api/rounds`: 공고가 있거나 없는 평가 회차 생성
- `GET /api/rounds/:id/candidates`: 회차 후보의 데이터 기반 정렬
- `POST /api/comparisons`: 2~50개 기업의 필드별 비교
- `POST /api/simulations`: 지원 전후 유사 관찰집단의 기술통계

모의투자 결과는 지원 효과의 인과 추정이나 미래 예측이 아니다. 응답의 표본 수, 매칭 수준, 한계 문구를 프론트에서 함께 노출해야 한다.
