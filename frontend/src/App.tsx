import { useCallback, useState } from 'react'
import Sidebar from './components/Sidebar'
import PageHeader from './components/PageHeader'
import DataInputPage from './pages/DataInputPage'
import DashboardPage from './pages/DashboardPage'
import ReportPage from './pages/ReportPage'
import RawDataPage from './pages/RawDataPage'
import type { ValidationResult } from './validation/erpSchemas'
import { parseJsonResponse } from './lib/api'
import type {
  AIReport, CsvType, DashboardData, LoadResponse, MenuId, RawData, UploadStatusItem,
} from './types'

const PAGE_SUBTITLES: Record<MenuId, string> = {
  input: 'CSV 4종 업로드 · Zod 즉시 검증 · 샘플 데이터 지원',
  dashboard: '매출 · 수익성 · 고객 · 재고 KPI 자동 시각화',
  report: 'Gemini AI 경영 분석 보고서 · PDF / Word 다운로드',
  raw: '상품 · 고객 · 주문 · 주문상세 원본 데이터 조회',
}

export default function App() {
  const [menu, setMenu] = useState<MenuId>('input')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<CsvType, File>>>({})
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatusItem[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [rawData, setRawData] = useState<RawData | null>(null)
  const [report, setReport] = useState<AIReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [rawLoading, setRawLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dataLoaded = !!sessionId && !!dashboard

  const handleLoadResult = useCallback(async (data: LoadResponse) => {
    setSessionId(data.session_id)
    setUploadStatus(data.upload_status)
    setDashboard(data.dashboard)
    setReport(null)

    if (data.raw_data) {
      setRawData(data.raw_data)
      return
    }

    setRawLoading(true)
    try {
      const res = await fetch(`/api/raw-data/${data.session_id}`)
      const { data: raw, error: apiError } = await parseJsonResponse<RawData>(res)
      if (apiError || !raw) {
        setRawData(null)
        setError(apiError || '원본 데이터를 불러오지 못했습니다. 다시 시도해주세요.')
      } else {
        setRawData(raw)
      }
    } catch {
      setRawData(null)
      setError('원본 데이터를 불러오지 못했습니다.')
    } finally {
      setRawLoading(false)
    }
  }, [])

  const handleFilesChange = useCallback((files: Partial<Record<CsvType, File>>, result: ValidationResult | null) => {
    setSelectedFiles(files)
    setValidation(result)
  }, [])

  const handleLoadData = async () => {
    if (!validation?.valid) return
    setLoading(true)
    setError(null)
    const form = new FormData()
    form.append('products', selectedFiles.products!)
    form.append('customers', selectedFiles.customers!)
    form.append('orders', selectedFiles.orders!)
    form.append('order_details', selectedFiles.order_details!)
    if (sessionId) form.append('session_id', sessionId)

    try {
      const res = await fetch('/api/load', { method: 'POST', body: form })
      const { data, error: apiError } = await parseJsonResponse<LoadResponse>(res)
      if (apiError || !data) throw new Error(apiError || '데이터 불러오기 실패')
      await handleLoadResult(data)
      setMenu('dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSample = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/load/sample', { method: 'POST' })
      const { data, error: apiError } = await parseJsonResponse<LoadResponse>(res)
      if (apiError || !data) throw new Error(apiError || '샘플 데이터 불러오기 실패')
      await handleLoadResult(data)
      setMenu('dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleMenuChange = (id: MenuId) => {
    if (id !== 'input' && !dataLoaded) return
    setMenu(id)
  }

  return (
    <div>
      <div className="utility-bar">
        <span>Gemini 3.1 Flash Lite · ERP Analytics Platform</span>
      </div>
      <div className="app-layout">
        <Sidebar active={menu} onChange={handleMenuChange} dataLoaded={dataLoaded} />
        <div className="app-content">
          <main className="app-main">
            <PageHeader subtitle={PAGE_SUBTITLES[menu]} />

            {error && (
              <div className="alert alert--error">{error}</div>
            )}

            {menu === 'input' && (
              <DataInputPage
                selectedFiles={selectedFiles}
                uploadStatus={uploadStatus}
                dataLoaded={dataLoaded}
                loading={loading}
                onFilesChange={handleFilesChange}
                onLoadData={handleLoadData}
                onLoadSample={handleLoadSample}
              />
            )}

            {menu === 'dashboard' && dashboard && <DashboardPage dashboard={dashboard} />}
            {menu === 'report' && sessionId && (
              <ReportPage sessionId={sessionId} report={report} onReportGenerated={setReport} />
            )}
            {menu === 'raw' && (
              <RawDataPage
                sessionId={sessionId}
                rawData={rawData}
                loading={rawLoading}
                onRawDataLoaded={setRawData}
              />
            )}
          </main>
          <footer className="app-footer">
            ERP데이터 분석 대시보드 &amp; 자동 보고서 · Powered by Gemini 3.1 Flash Lite
          </footer>
        </div>
      </div>
    </div>
  )
}
