interface Props {
  subtitle?: string
}

export default function PageHeader({ subtitle }: Props) {
  return (
    <header className="page-header">
      <h1 className="page-header__title">ERP데이터 분석 대시보드 &amp; 자동 보고서</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </header>
  )
}
