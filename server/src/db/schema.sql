-- DIVE2026 SQLite 스키마
-- 실행: build_gold.py가 자동 적재

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ── 기업 마스터 ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_master (
  company_id     INTEGER PRIMARY KEY,
  region         TEXT,
  founded_date   TEXT,    -- 'YYYY-MM-DD'
  corp_type      TEXT,    -- 법인/개인
  size           TEXT,    -- 대/중기업/소기업/소상공인
  listing        TEXT,
  biz_form       TEXT,
  ksic11         TEXT,    -- KODATA KSIC 11차 (예: 'C31114')
  ksic2          TEXT,    -- 앞 2자리 ('C3')
  ksic3          TEXT,    -- 앞 3자리 ('C31')
  ksic5          TEXT,    -- 앞 5자리 ('C3111')
  ind_name       TEXT,
  main_product   TEXT,
  closed_flag    INTEGER DEFAULT 0,   -- 0=정상, 1=폐업/휴업/청산
  closed_date    TEXT,
  closed_type    TEXT,
  biz_status     TEXT,    -- 정상/폐업/청산/해산/휴업
  observed_at    TEXT,    -- 조회일자
  inno_biz       INTEGER DEFAULT 0,
  main_biz       INTEGER DEFAULT 0,
  venture        INTEGER DEFAULT 0,
  material_parts INTEGER DEFAULT 0,
  net_cert       INTEGER DEFAULT 0,
  nep_cert       INTEGER DEFAULT 0,
  researcher_count INTEGER,
  has_corporate_lab INTEGER DEFAULT 0,
  lab_reg_date   TEXT,
  has_rd_dept    INTEGER DEFAULT 0,
  rd_dept_reg_date TEXT
);

-- ── 기업 연도별 재무/인력 ────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_yearly (
  company_id          INTEGER,
  fiscal_year         INTEGER,
  employees           INTEGER,
  pension_enrolled    INTEGER,   -- 국민연금 가입자수
  pension_hired       INTEGER,
  pension_left        INTEGER,
  avg_salary          INTEGER,   -- 원 단위
  revenue             INTEGER,   -- 천원
  op_profit           INTEGER,   -- 천원
  cost_of_sales       INTEGER,   -- 천원
  net_income          INTEGER,   -- 천원
  op_margin_pct       REAL,      -- %
  assets              INTEGER,   -- 천원
  liabilities         INTEGER,   -- 천원
  equity              INTEGER,   -- 천원
  paid_capital        INTEGER,   -- 천원
  rd_expense          INTEGER,   -- 천원
  patent_reg          INTEGER,
  patent_applied      INTEGER,
  PRIMARY KEY (company_id, fiscal_year)
);

-- ── 파생 지표 ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_metric (
  company_id      INTEGER,
  as_of_fy        INTEGER,
  metric_code     TEXT,
  value           REAL,
  unit            TEXT,
  status          TEXT DEFAULT 'ok',   -- ok / negative_equity / div_zero
  formula_version TEXT DEFAULT 'v1',
  PRIMARY KEY (company_id, as_of_fy, metric_code)
);

-- ── 내부 동종기업 백분위 ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_percentile (
  company_id    INTEGER,
  metric_code   TEXT,
  as_of_fy      INTEGER,
  pctl          REAL,          -- 0~100
  cohort_level  TEXT,          -- ksic3_size / ksic3 / ksic2_size / ksic2 / all
  cohort_n      INTEGER,
  PRIMARY KEY (company_id, metric_code, as_of_fy)
);

-- ── 기술/지식재산 (집약, 최신 기준) ─────────────────────────

CREATE TABLE IF NOT EXISTS company_technology (
  company_id        INTEGER PRIMARY KEY,
  patent_registered INTEGER,
  patent_applied    INTEGER,
  valid_patent_count INTEGER,
  researcher_count  INTEGER,
  has_corporate_lab INTEGER DEFAULT 0,
  has_rd_dept       INTEGER DEFAULT 0,
  inno_biz          INTEGER DEFAULT 0,
  main_biz          INTEGER DEFAULT 0,
  venture           INTEGER DEFAULT 0,
  material_parts    INTEGER DEFAULT 0
);

-- ── NTIS 국가R&D ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ntis_project (
  company_id         INTEGER,
  role               TEXT,       -- lead / sub
  base_year          INTEGER,
  base_date          TEXT,
  project_name       TEXT,
  ministry           TEXT,
  region             TEXT,
  total_start_date   TEXT,
  total_end_date     TEXT,
  term_start_date    TEXT,
  term_end_date      TEXT,
  tech_classification TEXT,
  gov_funding        INTEGER,    -- 원 단위
  private_funding    INTEGER,
  total_funding      INTEGER
);

-- ── 지원 episode / component ────────────────────────────────

CREATE TABLE IF NOT EXISTS support_episode (
  episode_id       TEXT PRIMARY KEY,
  company_id       INTEGER,
  program_code     TEXT,
  program_name     TEXT,
  biz_type         TEXT,
  selected_date    TEXT,
  start_date       TEXT,
  end_date         TEXT,
  result           TEXT,
  total_amount     INTEGER,     -- 천원
  component_count  INTEGER,
  region_sido      TEXT,
  region_sigungu   TEXT,
  source_year      INTEGER,
  as_of_fy         INTEGER,
  id_incomplete    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS support_component (
  row_id           INTEGER PRIMARY KEY,
  episode_id       TEXT,
  company_id       INTEGER,
  support_type     TEXT,
  support_extra_type TEXT,
  support_item     TEXT,
  amount           INTEGER,     -- 천원
  amount_flag      TEXT,        -- ok / missing
  source_year      INTEGER
);

-- ── 한국은행 업종 벤치마크 ──────────────────────────────────

CREATE TABLE IF NOT EXISTS external_industry_benchmark (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset_id      TEXT,
  reference_year  INTEGER,
  ksic_level      TEXT,
  ksic_code       TEXT,
  company_size    TEXT,
  metric_category TEXT,
  metric_code     TEXT,
  metric_value    REAL,
  unit            TEXT,
  source_locator  TEXT
);

-- ── 사상구 지역 산업 맥락 ────────────────────────────────────

CREATE TABLE IF NOT EXISTS regional_industry_context (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset_id           TEXT,
  reference_year       INTEGER,
  region_level         TEXT,
  region_name          TEXT,
  ksic_level           TEXT,
  ksic_code            TEXT,
  ind_name             TEXT,
  employee_band        TEXT,
  establishment_count  INTEGER,
  employee_count       INTEGER,
  source_file          TEXT
);

-- ── 프로그램 문서 / 요건 ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS program_document (
  document_id   TEXT PRIMARY KEY,
  filename      TEXT,
  sha256        TEXT,
  parse_status  TEXT DEFAULT 'pending',
  parsed_at     TEXT,
  parser_version TEXT
);

CREATE TABLE IF NOT EXISTS program_master (
  program_id          TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  agency              TEXT,
  field               TEXT,
  budget_text         TEXT,
  support_per_company_text TEXT,
  deadline            TEXT,
  target_stage_text   TEXT,
  keywords_json       TEXT DEFAULT '[]',
  description         TEXT,
  document_id         TEXT,
  review_status       TEXT DEFAULT 'draft',
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS program_requirement (
  requirement_id  TEXT PRIMARY KEY,
  program_id      TEXT,
  requirement_type TEXT,
  label           TEXT,
  rule_json       TEXT,
  weight          REAL,
  source_page     INTEGER,
  source_text     TEXT,
  review_status   TEXT DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS indicator_evidence (
  evidence_id        TEXT PRIMARY KEY,
  company_id         INTEGER,
  indicator_code     TEXT,
  source_file        TEXT,
  source_sheet_page  TEXT,
  source_row_cell    TEXT,
  reference_year     INTEGER,
  raw_value          TEXT,
  normalized_value   TEXT,
  formula            TEXT,
  formula_version    TEXT,
  external_dataset_id TEXT
);

-- ── 평가 회차 ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS round_master (
  round_id       TEXT PRIMARY KEY,
  program_id     TEXT,
  as_of_date     TEXT,
  as_of_fy       INTEGER,
  status         TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS round_candidate (
  round_id           TEXT,
  company_id         INTEGER,
  application_status TEXT DEFAULT 'pending',
  reviewer_status    TEXT DEFAULT 'pending',
  PRIMARY KEY (round_id, company_id)
);

-- ── 인덱스 ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_yearly_company ON company_yearly(company_id);
CREATE INDEX IF NOT EXISTS idx_metric_company ON company_metric(company_id, as_of_fy);
CREATE INDEX IF NOT EXISTS idx_pctl_company ON company_percentile(company_id);
CREATE INDEX IF NOT EXISTS idx_episode_company ON support_episode(company_id);
CREATE INDEX IF NOT EXISTS idx_component_episode ON support_component(episode_id);
CREATE INDEX IF NOT EXISTS idx_ntis_company ON ntis_project(company_id);
CREATE INDEX IF NOT EXISTS idx_master_ksic ON company_master(ksic3, size);
CREATE INDEX IF NOT EXISTS idx_episode_dates ON support_episode(selected_date, as_of_fy);
CREATE INDEX IF NOT EXISTS idx_bok_code ON external_industry_benchmark(ksic_code, reference_year);
CREATE INDEX IF NOT EXISTS idx_region_code ON regional_industry_context(region_name, ksic_code, reference_year);
CREATE INDEX IF NOT EXISTS idx_requirement_program ON program_requirement(program_id, review_status);
CREATE INDEX IF NOT EXISTS idx_round_candidate_round ON round_candidate(round_id, company_id);
CREATE INDEX IF NOT EXISTS idx_evidence_company ON indicator_evidence(company_id, indicator_code);
