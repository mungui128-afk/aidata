const STEPS = [
  {
    num: 1,
    title: '데이터 검증',
    desc: 'Zod 스키마로 4개의 테이블을 검사하고 참조 무결성을 점검합니다.',
  },
  {
    num: 2,
    title: '대시보드 생성',
    desc: '매출·수익성·고객·재고 KPI와 차트를 자동 시각화합니다.',
  },
  {
    num: 3,
    title: 'AI 보고서 & 다운로드',
    desc: 'Gemini로 보고서를 만들고 PDF/Word로 내려받습니다.',
  },
]

export default function ServiceFlow() {
  return (
    <div className="service-flow">
      <p className="text-caption" style={{ marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        서비스 처리 순서
      </p>
      {STEPS.map((step) => (
        <div key={step.num} className="service-step">
          <span className="service-step__num">{step.num}</span>
          <div>
            <p className="service-step__title">{step.title}</p>
            <p className="service-step__desc">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
