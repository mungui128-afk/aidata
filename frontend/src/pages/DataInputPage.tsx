import { useCallback, useRef, useState } from 'react'
import {
  Upload, CheckCircle2, XCircle, Loader2, FileSpreadsheet, AlertCircle,
} from 'lucide-react'
import ServiceFlow from '../components/ServiceFlow'
import CsvPreview from '../components/CsvPreview'
import { parseCsvFile } from '../lib/csvParser'
import {
  validateTables, CSV_SLOT_META,
  type FileSlotStatus, type ValidationResult,
} from '../validation/erpSchemas'
import type { CsvType, UploadStatusItem } from '../types'

interface Props {
  selectedFiles: Partial<Record<CsvType, File>>
  uploadStatus: UploadStatusItem[]
  dataLoaded: boolean
  loading: boolean
  onFilesChange: (files: Partial<Record<CsvType, File>>, validation: ValidationResult | null) => void
  onLoadData: () => void
  onLoadSample: () => void
}

export default function DataInputPage({
  selectedFiles,
  uploadStatus,
  dataLoaded,
  loading,
  onFilesChange,
  onLoadData,
  onLoadSample,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [previewTables, setPreviewTables] = useState<Partial<Record<CsvType, import('../validation/erpSchemas').ParsedTable>>>({})

  const runValidation = useCallback(async (fileMap: Partial<Record<CsvType, File>>) => {
    if (Object.keys(fileMap).length === 0) {
      setValidation(null)
      setParseErrors([])
      setPreviewTables({})
      onFilesChange({}, null)
      return
    }

    setValidating(true)
    setParseErrors([])

    const tables: Partial<Record<CsvType, import('../validation/erpSchemas').ParsedTable>> = {}
    const fileNames: Partial<Record<CsvType, string>> = {}
    const pErrors: string[] = []

    for (const [type, file] of Object.entries(fileMap) as [CsvType, File][]) {
      const parsed = await parseCsvFile(file)
      if (parsed.error || !parsed.table || !parsed.type) {
        pErrors.push(`${file.name}: ${parsed.error ?? '파싱 실패'}`)
        fileNames[type] = file.name
        continue
      }
      tables[parsed.type] = parsed.table
      fileNames[parsed.type] = file.name
    }

    setParseErrors(pErrors)
    setPreviewTables(tables)
    const result = validateTables(tables, fileNames)
    setValidation(result)
    onFilesChange(fileMap, result)
    setValidating(false)
  }, [onFilesChange])

  const handleFiles = useCallback(async (incoming: FileList | File[]) => {
    const csvFiles = Array.from(incoming).filter((f) => f.name.toLowerCase().endsWith('.csv'))
    if (csvFiles.length === 0) return

    const next: Partial<Record<CsvType, File>> = { ...selectedFiles }
    const localErrors: string[] = []

    for (const file of csvFiles) {
      const parsed = await parseCsvFile(file)
      if (parsed.type) {
        next[parsed.type] = file
      } else {
        localErrors.push(`${file.name}: ${parsed.error ?? 'CSV 유형 인식 실패'}`)
      }
    }

    if (localErrors.length) setParseErrors(localErrors)
    await runValidation(next)
  }, [selectedFiles, runValidation])

  const clearAll = () => {
    setValidation(null)
    setParseErrors([])
    setPreviewTables({})
    onFilesChange({}, null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayStatus: FileSlotStatus[] = dataLoaded
    ? CSV_SLOT_META.map(({ type, label, order }) => {
        const item = uploadStatus.find((s) => s.type === type)
        return {
          type, label, order,
          filename: item?.filename ?? null,
          status: item?.uploaded ? 'valid' : 'missing',
          rowCount: item?.row_count ?? 0,
          errors: [],
        }
      })
    : validation
      ? CSV_SLOT_META.map(({ type }) => validation.fileStatus[type])
      : CSV_SLOT_META.map(({ type, label, order }) => ({
          type, label, order,
          filename: selectedFiles[type]?.name ?? null,
          status: selectedFiles[type] ? 'validating' as const : 'missing' as const,
          rowCount: 0,
          errors: [],
        }))

  const allValid = validation?.valid === true
  const hasFiles = Object.keys(selectedFiles).length > 0
  const allErrors = [
    ...parseErrors,
    ...(validation?.schemaErrors ?? []),
    ...(validation?.integrityErrors ?? []),
  ]

  return (
    <section>
      <p className="text-body" style={{ marginBottom: 24, color: 'var(--mute)' }}>
        상품 · 고객 · 주문 · 주문상세 CSV 4종을 한 곳에 업로드하거나 샘플 데이터를 불러오세요.
        파일 선택 즉시 Zod 스키마 검증과 참조 무결성 점검이 수행됩니다.
      </p>

      <div
        className={`dropzone${dragOver ? ' dropzone--active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => !loading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {validating ? (
          <>
            <Loader2 size={40} color="#111111" className="spin" />
            <p className="text-heading-md" style={{ marginTop: 16 }}>데이터 검증 중...</p>
          </>
        ) : (
          <>
            <Upload size={40} color="#111111" strokeWidth={1.5} />
            <p className="text-heading-md" style={{ marginTop: 16 }}>CSV 4종을 여기에 업로드하세요</p>
            <p className="text-caption" style={{ marginTop: 8 }}>드래그 앤 드롭 · 클릭 선택 · 여러 파일 동시 선택</p>
            <span className="badge" style={{ marginTop: 16 }}>상품 / 고객 / 주문 / 주문상세</span>
          </>
        )}
      </div>

      <div className="status-grid">
        {displayStatus.map((slot) => (
          <StatusCard key={slot.type} slot={slot} validating={validating} />
        ))}
      </div>

      {allErrors.length > 0 && !dataLoaded && (
        <div className="alert alert--error">
          <AlertCircle size={18} />
          <div>
            {allErrors.map((msg, i) => (
              <p key={i} style={{ marginBottom: 4 }}>{msg}</p>
            ))}
          </div>
        </div>
      )}

      {allValid && !dataLoaded && (
        <div className="alert alert--success">
          <CheckCircle2 size={18} />
          스키마 검증 및 참조 무결성 점검을 통과했습니다. 데이터 불러오기를 클릭하세요.
        </div>
      )}

      {!dataLoaded && Object.keys(previewTables).length > 0 && (
        <CsvPreview tables={previewTables} />
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className="btn-primary" onClick={onLoadData} disabled={!allValid || loading}>
          {loading ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
          데이터 불러오기
        </button>
        <button className="btn-secondary" onClick={onLoadSample} disabled={loading}>
          {loading ? <Loader2 size={18} className="spin" /> : <FileSpreadsheet size={18} />}
          샘플 데이터 불러오기
        </button>
        {hasFiles && !dataLoaded && (
          <button className="btn-outline" onClick={clearAll} disabled={loading}>초기화</button>
        )}
      </div>

      {dataLoaded && (
        <div className="alert alert--success">
          <CheckCircle2 size={18} />
          모든 데이터가 로드되었습니다. 대시보드 · 분석보고서 · 원본데이터 메뉴를 이용하세요.
        </div>
      )}

      <ServiceFlow />
    </section>
  )
}

function StatusCard({ slot, validating }: { slot: FileSlotStatus; validating: boolean }) {
  const status = slot.status === 'missing' && validating && slot.filename ? 'validating' : slot.status
  const badgeClass = {
    missing: 'badge badge--pending',
    validating: 'badge badge--info',
    valid: 'badge badge--success',
    invalid: 'badge badge--error',
  }[status]
  const cardClass = `status-card${status === 'valid' ? ' status-card--valid' : ''}${status === 'invalid' ? ' status-card--invalid' : ''}`

  return (
    <div className={cardClass}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="service-step__num" style={{ width: 24, height: 24, fontSize: 12 }}>{slot.order}</span>
        <span className="text-heading-md" style={{ fontSize: 14 }}>{slot.label}</span>
        <span className={badgeClass} style={{ marginLeft: 'auto' }}>
          {status === 'validating' && <Loader2 size={10} className="spin" />}
          {status === 'valid' && <CheckCircle2 size={10} />}
          {status === 'invalid' && <XCircle size={10} />}
          {status === 'missing' && '미업로드'}
          {status === 'validating' && '검증 중'}
          {status === 'valid' && '검증 완료'}
          {status === 'invalid' && '검증 실패'}
        </span>
      </div>
      <p className="text-caption-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {slot.filename ?? '—'}
        {slot.rowCount > 0 && <span style={{ color: 'var(--success)' }}> ({slot.rowCount.toLocaleString()}건)</span>}
      </p>
    </div>
  )
}
