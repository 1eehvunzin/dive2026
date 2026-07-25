export type Program = {
  id: string
  title: string
  agency: string
  field: string
  budget: string
  supportPerCompany: string
  deadline: string
  targetStage: string
  keywords: string[]
  description: string
  reviewStatus?: "draft" | "reviewed" | "active"
  documentId?: string | null
  requirements?: {
    id: string
    type: "eligibility" | "exclusion" | "preference" | "evaluation" | "document" | "obligation"
    label: string
    rule: Record<string, unknown> | null
    weight: number | null
    sourcePage: number | null
    sourceText: string | null
    reviewStatus: "draft" | "reviewed" | "active"
  }[]
}

export type FinancialPoint = {
  year: string
  revenue: number | null
  operatingProfit: number | null
  employees: number | null
}

export type ScoreBreakdown = {
  label: string
  score: number
  weight: number
}

export type Company = {
  id: string
  name: string
  logoSeed: string
  industry: string
  location: string
  founded: number | null
  employees: number | null
  supportTotal: string
  financialUnit: "억원" | "백만원"
  oneLiner: string
  tags: string[]
  scoreBreakdown: ScoreBreakdown[]
  strengths: string[]
  risks: string[]
  financials: FinancialPoint[]
  patents: number | null
  certifications: string[]
  creditGrade: string | null
  debtRatio: number | null
  currentRatio: number | null
  revenueGrowthPct?: number | null
  /** null은 '흑자 지속'이 아니라 원천 필드 부재/산출 불가를 뜻한다. */
  runwayMonths: number | null
  programFitScore?: number | null
  programFitReasons?: string[]
  report: {
    summary: string
    market: string
    technology: string
    team: string
    finance: string
  }
  /** 동종 업종 내 백분위 (선택적 — 백엔드 리포트 API 연동 후 채워짐) */
  survivalPercentiles?: {
    label: string
    pctl: number
    cohortLabel?: string
    /** 원 지표값이 클수록 유리한지 여부. 부채비율 등은 false. */
    higherIsBetter?: boolean
  }[]
  /** 지원 이력 타임라인 (선택적) */
  supportHistory?: { year: number; program: string; amount: number | null }[]
  /** 업종 평균 대비 벤치마크 (선택적) */
  industryBenchmarks?: {
    label: string
    company: number
    industry: number
    unit: string
    /** 외부 벤치마크의 연도·업종·기업규모 범위. */
    context?: string
    /** 원 지표값이 클수록 유리한지 여부. 비교색의 의미를 결정한다. */
    higherIsBetter?: boolean
  }[]
  /** 실제 리포트 API에서 내려온 실사·공고 검토 정보 */
  dueDiligence?: {
    asOfYear: number
    roundId?: string | null
    dataQuality: "high" | "medium" | "low"
    officerBrief?: {
      lines: string[]
      priorityChecks: string[]
      signalCounts: { red: number; yellow: number; green: number; gray: number }
    }
    summaryChecks: {
      code?: string
      label: string
      status: "green" | "yellow" | "red" | "gray"
      value: string
      note: string | null
      interpretation?: string | null
    }[]
    survivalIndicators?: Array<{
      code: string
      label: string
      value: number | null
      unit: string
      pctl: number | null
      cohortLabel?: string | null
      status: string
      flagReason: string | null
      auc?: number | null
      weight?: number | null
    }>
    referenceIndicators?: Array<{
      code: string
      label: string
      value: number | null
      unit: string
      pctl: number | null
      cohortLabel?: string | null
      status: string
      flagReason: string | null
      auc?: number | null
      weight?: number | null
    }>
    requirementResults: {
      label: string
      status: "met" | "not_met" | "unknown"
      reason: string
      weight: number | null
    }[]
    dataWarnings: string[]
    followUpQuestions: string[]
    ntisProjectCount: number
    ntisFundingWon: number
    evidenceIds: string[]
    evidenceItems?: Array<{
      evidenceId: string
      sourceFile: string
      sourceSheet: string | null
      sourceCell: string | null
      referenceYear: number | null
      rawValue: string | number | null
      normalizedValue: string | number | null
      formula: string | null
      formulaVersion: string
      externalDatasetId: string | null
      label?: string
    }>
    supportAudit: {
      totalEpisodes: number
      awardedEpisodes: number
      rejectedOrWithdrawn: number
      recent3yrAwarded: number
      confirmedAmountMillion: number
      awardedAmountMillion: number
      missingAmountCount: number
      zeroAmountCount: number
      yearsReceived: number[]
      badges: string[]
      samePurposeRepeats: Array<{
        purpose: string
        episodeCount: number
        years: number[]
        totalAmountMillion: number
        programNames: string[]
      }>
      repeatedPrograms: {
        program: string
        count: number
        episodeIds: string[]
      }[]
      overlapPairs: {
        firstProgram: string
        secondProgram: string
        overlapDays: number
        purposeRelation?: string
        firstAmountMillion: number | null
        secondAmountMillion: number | null
        evidenceIds: string[]
      }[]
      episodes: {
        evidenceId: string
        selectedDate: string | null
        startDate?: string | null
        endDate?: string | null
        program: string
        businessType: string | null
        supportPurpose?: string | null
        result?: string | null
        isAwarded?: boolean
        amountMillion: number | null
        amountFlag?: string
        components?: Array<{
          supportType: string | null
          supportItem: string | null
          amountMillion: number | null
        }>
      }[]
    }
    observedChanges?: Array<{
      episodeId: string
      programName: string | null
      selectedDate: string | null
      preFy: number | null
      postFy: number | null
      revenueChangePct: number | null
      employmentChange: number | null
      newPatentCount: number | null
      status: string
      note: string | null
    }>
    financialDetails: {
      year: number
      netIncomeMillion: number | null
      assetsMillion: number | null
      liabilitiesMillion: number | null
      equityMillion: number | null
      operatingMarginPct: number | null
    }[]
    employmentDetails: {
      year: number
      enrolled: number | null
      hired: number | null
      left: number | null
      averageSalaryMillion: number | null
    }[]
    technology: {
      corporateLab: boolean
      rdDepartment: boolean
      researcherCount: number | null
      patentRegistered: number | null
      patentApplied: number | null
      validPatentCount: number | null
      rdIntensityPct: number | null
    }
    similarCompanies: {
      companyId: number
      industry: string
      size: string
      region: string
      distance: number
      comparedMetrics: string[]
    }[]
    regionalContext: {
      status: "ok" | "not_applicable" | "not_available"
      reason: string | null
      regionName: string | null
      referenceYear: number | null
      establishmentCount: number | null
      employeeCount: number | null
      employeesPerEstablishment: number | null
    }
  }
}

export const programs: Program[] = [
  {
    id: "prog-2026-ai",
    title: "2026 AI 융합 유망기업 성장바우처 지원사업",
    agency: "한국산업기술진흥원",
    field: "인공지능 · 데이터",
    budget: "120억 원",
    supportPerCompany: "최대 3억 원",
    deadline: "2026-08-31",
    targetStage: "Series A ~ B",
    keywords: ["인공지능", "데이터", "SaaS", "제조 AI"],
    description:
      "AI 기술을 핵심 사업모델로 보유한 성장기 기업을 대상으로 R&D, 사업화, 글로벌 진출을 종합 지원한다. 기술성과 사업화 가능성, 고용창출 효과를 중점 평가한다.",
  },
]

export const companies: Company[] = [
  {
    id: "co-nimbus",
    name: "님버스에이아이",
    logoSeed: "N",
    industry: "제조 AI · 예지보전",
    location: "경기 성남",
    founded: 2021,
    employees: 48,
    supportTotal: "1억 원",
    financialUnit: "억원",
    oneLiner: "설비 센서 데이터를 실시간 분석해 고장을 예측하는 산업용 예지보전 AI 플랫폼",
    tags: ["제조 AI", "예지보전", "B2B SaaS", "엣지컴퓨팅"],
    scoreBreakdown: [
      { label: "기술 적합성", score: 96, weight: 30 },
      { label: "사업화 가능성", score: 92, weight: 25 },
      { label: "고용 창출", score: 90, weight: 20 },
      { label: "재무 건전성", score: 95, weight: 15 },
      { label: "정책 부합도", score: 98, weight: 10 },
    ],
    strengths: [
      "국내 대형 제조사 3곳과 유료 PoC를 정식 계약으로 전환",
      "엣지 추론 기술 특허 7건 보유로 경쟁사 대비 지연시간 40% 우위",
      "최근 12개월 매출 3.1배 성장, 순유지율(NRR) 138%",
    ],
    risks: [
      "핵심 매출이 제조 대기업에 집중되어 고객 다변화 필요",
      "해외 진출 초기 단계로 글로벌 레퍼런스 부족",
    ],
    financials: [
      { year: "2021", revenue: 12, operatingProfit: -8, employees: 14 },
      { year: "2022", revenue: 34, operatingProfit: -5, employees: 27 },
      { year: "2023", revenue: 78, operatingProfit: 4, employees: 39 },
      { year: "2024", revenue: 142, operatingProfit: 21, employees: 48 },
    ],
    patents: 7,
    certifications: ["벤처기업 인증", "기업부설연구소", "ISO 27001"],
    creditGrade: null,
    debtRatio: 45,
    currentRatio: null,
    runwayMonths: null,
    report: {
      summary:
        "님버스에이아이는 제조 설비의 센서 데이터를 실시간 수집·분석하여 고장을 사전에 예측하는 예지보전 AI 솔루션을 제공한다. 2021년 설립 이후 국내 주요 제조사를 중심으로 레퍼런스를 빠르게 확보했으며, 반복 매출 기반의 SaaS 모델로 안정적인 성장세를 보이고 있다.",
      market:
        "글로벌 예지보전 시장은 연평균 25% 성장하여 2028년 약 230억 달러 규모에 이를 것으로 전망된다. 국내에서도 스마트팩토리 고도화 정책에 따라 수요가 빠르게 확대되고 있으며, 님버스에이아이는 국내 예지보전 SaaS 시장에서 선도적 지위를 확보하고 있다.",
      technology:
        "자체 개발한 경량 이상탐지 모델을 엣지 디바이스에서 구동해 네트워크 지연 없이 실시간 추론이 가능하다. 설비 유형별 사전학습 모델 라이브러리를 보유해 신규 고객 온보딩 기간을 평균 6주에서 2주로 단축했다.",
      team:
        "최근 고용 인원은 48명이다. 대표자 이력과 학력·경력 구성은 현재 원천데이터에 없어 평가하지 않는다.",
      finance:
        "2024년 매출 142억 원, 영업이익 21억 원으로 최근 사업규모와 영업 수익성을 함께 확인한다.",
    },
    survivalPercentiles: [
      { label: "매출 규모", pctl: 72, cohortLabel: "소프트웨어개발 소기업 (n=214)" },
      { label: "고용 증가율", pctl: 85, cohortLabel: "소프트웨어개발 소기업 (n=214)" },
      { label: "영업이익률", pctl: 68, cohortLabel: "소프트웨어개발 소기업 (n=214)" },
      { label: "특허 보유", pctl: 79, cohortLabel: "소프트웨어개발 소기업 (n=214)" },
    ],
    supportHistory: [
      { year: 2022, program: "TIPS R&D", amount: 5000 },
      { year: 2023, program: "혁신바우처", amount: 2000 },
      { year: 2024, program: "수출바우처", amount: 3000 },
    ],
    industryBenchmarks: [
      { label: "영업이익률 (%)", company: 14.8, industry: 6.2, unit: "%" },
      { label: "매출성장률 (%)", company: 82, industry: 18, unit: "%" },
      { label: "직원 1인당 매출 (억)", company: 2.96, industry: 1.74, unit: "억원/인" },
      { label: "R&D 집약도 (%)", company: 12.3, industry: 5.8, unit: "%" },
    ],
  },
  {
    id: "co-verdant",
    name: "버던트바이오",
    logoSeed: "V",
    industry: "바이오 · 대체단백",
    location: "대전 유성",
    founded: 2019,
    employees: 76,
    supportTotal: "7천만 원",
    financialUnit: "억원",
    oneLiner: "정밀발효 기술로 동물성 단백질을 대체하는 지속가능 식품소재 개발 기업",
    tags: ["바이오", "정밀발효", "푸드테크", "ESG"],
    scoreBreakdown: [
      { label: "기술 적합성", score: 91, weight: 30 },
      { label: "사업화 가능성", score: 84, weight: 25 },
      { label: "고용 창출", score: 88, weight: 20 },
      { label: "재무 건전성", score: 82, weight: 15 },
      { label: "정책 부합도", score: 95, weight: 10 },
    ],
    strengths: [
      "정밀발효 수율을 2년 만에 3배 개선한 독자 균주 라이브러리 확보",
      "국내외 식품 대기업과 공동개발 계약 5건 체결",
      "ESG·식량안보 정책과 높은 부합도로 정부 과제 연속 선정",
    ],
    risks: [
      "대규모 양산 설비 투자로 자본 소요가 크고 손익분기 도달까지 시간 필요",
      "규제 승인 일정에 따라 상용화 시점 변동 가능성",
    ],
    financials: [
      { year: "2021", revenue: 8, operatingProfit: -22, employees: 41 },
      { year: "2022", revenue: 19, operatingProfit: -28, employees: 58 },
      { year: "2023", revenue: 41, operatingProfit: -19, employees: 69 },
      { year: "2024", revenue: 73, operatingProfit: -9, employees: 76 },
    ],
    patents: 12,
    certifications: ["벤처기업 인증", "이노비즈", "기업부설연구소"],
    creditGrade: null,
    debtRatio: 92,
    currentRatio: null,
    runwayMonths: null,
    report: {
      summary:
        "버던트바이오는 정밀발효 기술을 활용해 동물성 단백질을 대체하는 식품소재를 개발한다. 지속가능성과 식량안보라는 거대 트렌드에 부합하며, 국내외 식품 대기업과의 공동개발을 통해 상용화 경로를 구축하고 있다.",
      market:
        "글로벌 대체단백 시장은 2030년 약 850억 달러 규모로 성장할 전망이다. 정밀발효 기반 소재는 맛과 기능성 재현이 우수해 프리미엄 세그먼트에서 빠르게 채택되고 있다.",
      technology:
        "고효율 균주 스크리닝 플랫폼과 발효 공정 최적화 노하우를 결합해 경쟁사 대비 높은 수율을 달성했다. 12건의 특허로 핵심 공정을 보호하고 있다.",
      team:
        "최근 고용 인원은 76명이다. 대표자 이력과 인력의 학력·경력 구성은 현재 원천데이터에 없어 평가하지 않는다.",
      finance:
        "2024년 매출 73억 원, 영업손실 9억 원으로 매출 대비 손실 규모와 회복 추이를 우선 확인한다.",
    },
  },
  {
    id: "co-loop",
    name: "루프모빌리티",
    logoSeed: "L",
    industry: "모빌리티 · 물류로봇",
    location: "서울 강남",
    founded: 2020,
    employees: 61,
    supportTotal: "5천만 원",
    financialUnit: "억원",
    oneLiner: "실내 물류센터용 자율주행 운반로봇과 관제 소프트웨어를 공급하는 물류 자동화 기업",
    tags: ["로보틱스", "물류자동화", "자율주행", "B2B"],
    scoreBreakdown: [
      { label: "기술 적합성", score: 87, weight: 30 },
      { label: "사업화 가능성", score: 86, weight: 25 },
      { label: "고용 창출", score: 84, weight: 20 },
      { label: "재무 건전성", score: 80, weight: 15 },
      { label: "정책 부합도", score: 86, weight: 10 },
    ],
    strengths: [
      "물류센터 3곳에서 로봇 120대 상용 운영 중",
      "하드웨어+SaaS 결합 모델로 반복 매출 비중 45%",
      "물류 인력난 심화로 도입 수요 구조적 증가",
    ],
    risks: [
      "하드웨어 원가 관리와 공급망 리스크 존재",
      "대기업 물류 자회사와의 경쟁 심화 가능성",
    ],
    financials: [
      { year: "2021", revenue: 21, operatingProfit: -12, employees: 25 },
      { year: "2022", revenue: 48, operatingProfit: -9, employees: 42 },
      { year: "2023", revenue: 89, operatingProfit: -2, employees: 54 },
      { year: "2024", revenue: 134, operatingProfit: 8, employees: 61 },
    ],
    patents: 5,
    certifications: ["벤처기업 인증", "기업부설연구소"],
    creditGrade: null,
    debtRatio: 124,
    currentRatio: null,
    runwayMonths: null,
    report: {
      summary:
        "루프모빌리티는 실내 물류센터를 위한 자율주행 운반로봇과 관제 소프트웨어를 제공한다. 물류 인력난과 이커머스 성장을 배경으로 자동화 수요가 구조적으로 증가하는 시장에 위치해 있다.",
      market:
        "국내 물류 자동화 시장은 연평균 18% 성장하고 있으며, 중견 물류사의 자동화 전환이 본격화되고 있다. 하드웨어와 소프트웨어를 함께 제공하는 통합 솔루션에 대한 선호가 높다.",
      technology:
        "자체 SLAM 기반 자율주행과 다중 로봇 협업 관제 기술을 보유했다. 기존 창고 구조를 크게 변경하지 않고도 도입 가능한 점이 강점이다.",
      team:
        "최근 고용 인원은 61명이다. 대표자 이력과 직무별 인력 구성은 현재 원천데이터에 없어 평가하지 않는다.",
      finance:
        "2024년 매출 134억 원, 영업이익 8억 원으로 영업 수익성과 자본 완충력을 함께 확인한다.",
    },
  },
  {
    id: "co-quanta",
    name: "콴타시큐어",
    logoSeed: "Q",
    industry: "보안 · 데이터",
    location: "서울 마포",
    founded: 2022,
    employees: 23,
    supportTotal: "3천만 원",
    financialUnit: "억원",
    oneLiner: "AI 기반 이상행위 탐지로 내부 데이터 유출을 방지하는 보안 솔루션 스타트업",
    tags: ["보안", "AI", "데이터유출방지", "SaaS"],
    scoreBreakdown: [
      { label: "기술 적합성", score: 84, weight: 30 },
      { label: "사업화 가능성", score: 72, weight: 25 },
      { label: "고용 창출", score: 74, weight: 20 },
      { label: "재무 건전성", score: 70, weight: 15 },
      { label: "정책 부합도", score: 88, weight: 10 },
    ],
    strengths: [
      "행위기반 탐지 정확도가 룰기반 대비 오탐률 60% 감소",
      "공공기관 보안 요구사항에 부합하는 온프레미스 지원",
      "정보보호 정책 강화 흐름과 수요 부합",
    ],
    risks: [
      "초기 단계로 레퍼런스와 매출 규모가 제한적",
      "대형 보안기업 대비 브랜드 인지도 낮음",
    ],
    financials: [
      { year: "2021", revenue: 2, operatingProfit: -6, employees: 8 },
      { year: "2022", revenue: 9, operatingProfit: -11, employees: 15 },
      { year: "2023", revenue: 21, operatingProfit: -7, employees: 20 },
      { year: "2024", revenue: 38, operatingProfit: -1, employees: 23 },
    ],
    patents: 3,
    certifications: ["벤처기업 인증", "GS인증 1등급"],
    creditGrade: null,
    debtRatio: 58,
    currentRatio: null,
    runwayMonths: null,
    report: {
      summary:
        "콴타시큐어는 AI 이상행위 탐지 기술로 내부자에 의한 데이터 유출을 방지하는 보안 솔루션을 제공한다. 강화되는 정보보호 규제 환경에서 수요가 확대되고 있는 초기 성장 기업이다.",
      market:
        "데이터 유출 방지(DLP) 및 내부위협 탐지 시장은 규제 강화와 함께 두 자릿수 성장을 지속하고 있다. 공공·금융 부문의 온프레미스 수요가 견조하다.",
      technology:
        "사용자·엔티티 행위분석(UEBA) 모델로 룰기반 대비 오탐을 크게 낮췄다. 온프레미스와 클라우드를 모두 지원해 규제 산업 적용이 용이하다.",
      team:
        "최근 고용 인원은 23명이다. 대표자 이력과 보안 전문인력 구성은 현재 원천데이터에 없어 평가하지 않는다.",
      finance:
        "2024년 매출 38억 원, 영업손실 1억 원으로 손실 축소 여부와 고용 유지 추이를 우선 확인한다.",
    },
  },
  {
    id: "co-solaris",
    name: "솔라리스에너지",
    logoSeed: "S",
    industry: "에너지 · 그리드",
    location: "부산 해운대",
    founded: 2018,
    employees: 94,
    supportTotal: "1.2억 원",
    financialUnit: "억원",
    oneLiner: "분산형 에너지 자원을 통합 관리하는 가상발전소(VPP) 플랫폼 운영 기업",
    tags: ["에너지", "VPP", "탄소중립", "플랫폼"],
    scoreBreakdown: [
      { label: "기술 적합성", score: 85, weight: 30 },
      { label: "사업화 가능성", score: 83, weight: 25 },
      { label: "고용 창출", score: 82, weight: 20 },
      { label: "재무 건전성", score: 78, weight: 15 },
      { label: "정책 부합도", score: 92, weight: 10 },
    ],
    strengths: [
      "관리 중인 분산자원 용량 국내 상위권",
      "전력거래 정산 자동화로 운영 효율 확보",
      "탄소중립 정책과 강한 부합, 규제 수혜 기대",
    ],
    risks: [
      "전력시장 제도 변화에 실적 민감",
      "자본집약적 사업구조로 조달 부담",
    ],
    financials: [
      { year: "2021", revenue: 45, operatingProfit: -15, employees: 58 },
      { year: "2022", revenue: 98, operatingProfit: -6, employees: 74 },
      { year: "2023", revenue: 171, operatingProfit: 9, employees: 86 },
      { year: "2024", revenue: 268, operatingProfit: 27, employees: 94 },
    ],
    patents: 9,
    certifications: ["벤처기업 인증", "이노비즈", "기업부설연구소"],
    creditGrade: null,
    debtRatio: 138,
    currentRatio: null,
    runwayMonths: null,
    report: {
      summary:
        "솔라리스에너지는 태양광·ESS 등 분산 에너지 자원을 묶어 하나의 발전소처럼 운영하는 가상발전소(VPP) 플랫폼을 제공한다. 탄소중립 정책과 전력시장 개방 흐름의 직접적 수혜 기업이다.",
      market:
        "VPP 및 분산에너지 시장은 재생에너지 확대와 ��께 고성장하고 있다. 전력중개·수요반응 사업이 제도적으로 확대되며 시장 규모가 커지고 있다.",
      technology:
        "다수의 분산자원을 실시간 예측·제어하�� 최적��� 엔진과 정산 자동화 시스템을 보유했다. 예측 정확도가 정산 수익에 직접 기여한다.",
      team:
        "최근 고용 인원은 94명이다. 대표자 이력과 전력시장 전문인력 구성은 현재 원천데이터에 없어 평가하지 않는다.",
      finance:
        "2024년 매출 268억 원, 영업이익 27억 원으로 사업규모와 영업 수익성이 확인된다.",
    },
  },
]

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
  sources?: { title: string; snippet: string }[]
  context?: string
}

export type ProgramRecord = {
  program: Program
  shortlist: string[]
}

export type ViewId = "companies" | "shortlist"
