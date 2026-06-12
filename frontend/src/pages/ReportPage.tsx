import { useState } from 'react'
import { Sparkles, FileDown, FileText, Loader2 } from 'lucide-react'
import type { AIReport } from '../types'

interface Props {
  sessionId: string
  report: AIReport | null
  onReportGenerated: (report: AIReport) => void
}

export default function ReportPage({ sessionId, report, onReportGenerated }: Props) {
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateReport = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/report/generate/${sessionId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '보고서 생성 실패')
      onReportGenerated(data.report)
    } catch (e) {
      setError(e instanceof Error ? e.message : '보고서 생성 중 오류')
    } finally {
      setGenerating(false)
    }
  }

  const download = async (format: 'pdf' | 'docx') => {
    setDownloading(format)
    try {
      const res = await fetch(`/api/report/download/${sessionId}?format=${format}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || '다운로드 실패')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `erp_report.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : '다운로드 중 오류')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <p className="text-caption">Gemini 3.1 Flash Lite AI가 ERP 데이터를 분석합니다</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!report && (
            <button className="btn-primary" onClick={generateReport} disabled={generating}>
              {generating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
              {generating ? 'AI 분석 중...' : 'AI 보고서 생성'}
            </button>
          )}
          {report && (
            <>
              <button className="btn-secondary" onClick={() => download('pdf')} disabled={!!downloading}>
                {downloading === 'pdf' ? <Loader2 size={16} className="spin" /> : <FileDown size={16} />}
                PDF 다운로드
              </button>
              <button className="btn-secondary" onClick={() => download('docx')} disabled={!!downloading}>
                {downloading === 'docx' ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
                Word 다운로드
              </button>
              <button className="btn-outline" onClick={generateReport} disabled={generating}>재생성</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {!report && !generating && (
        <div className="card-filled" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Sparkles size={40} color="#707072" strokeWidth={1.5} />
          <p className="text-body" style={{ marginTop: 16 }}>AI 보고서 생성 버튼을 클릭하면 경영 분석 보고서가 작성됩니다.</p>
          <p className="text-caption" style={{ marginTop: 8 }}>
            KPI, 표, 그래프, 권고사항이 포함된 PDF/Word 파일로 다운로드할 수 있습니다.
          </p>
        </div>
      )}

      {generating && (
        <div className="card-filled" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Loader2 size={40} color="#111111" className="spin" />
          <p className="text-body" style={{ marginTop: 16 }}>Gemini AI가 ERP 데이터를 분석하고 있습니다...</p>
        </div>
      )}

      {report && (
        <div className="card-surface">
          <h3 className="text-heading-lg" style={{ marginBottom: 4 }}>{report.title}</h3>
          {report.generated_by && <p className="text-caption-sm" style={{ marginBottom: 24 }}>모델: {report.generated_by}</p>}

          <Block title="경영진 요약" content={report.executive_summary} />

          {report.sections.map((sec, i) => (
            <div key={i} className="card" style={{ paddingTop: 0 }}>
              <h4 className="text-heading-md">{sec.heading}</h4>
              <p className="text-body" style={{ marginTop: 8, lineHeight: 1.8 }}>{sec.content}</p>
              {sec.insights.length > 0 && (
                <ul style={{ paddingLeft: 20, marginTop: 12, lineHeight: 1.8 }}>{sec.insights.map((ins, j) => <li key={j}>{ins}</li>)}</ul>
              )}
            </div>
          ))}

          <div className="card" style={{ paddingTop: 0 }}>
            <h4 className="text-heading-md">권고사항</h4>
            <ol style={{ paddingLeft: 20, marginTop: 12, lineHeight: 1.8 }}>{report.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}</ol>
          </div>

          {report.risk_factors?.length > 0 && (
            <div className="card" style={{ paddingTop: 0 }}>
              <h4 className="text-heading-md">리스크 요인</h4>
              <ul style={{ paddingLeft: 20, marginTop: 12, lineHeight: 1.8 }}>{report.risk_factors.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}

          <Block title="향후 전망" content={report.outlook} />
        </div>
      )}
    </section>
  )
}

function Block({ title, content }: { title: string; content: string }) {
  return (
    <div className="card" style={{ paddingTop: 0 }}>
      <h4 className="text-heading-md">{title}</h4>
      <p className="text-body" style={{ marginTop: 8, lineHeight: 1.8 }}>{content}</p>
    </div>
  )
}
