import { useState } from 'react'
import { CSV_TYPES, type CsvType, type RawData } from '../types'

interface Props {
  rawData: RawData | null
  loading: boolean
}

export default function RawDataPage({ rawData, loading }: Props) {
  const [activeTab, setActiveTab] = useState<CsvType>('products')

  if (loading) {
    return <p className="text-caption">원본 데이터를 불러오는 중...</p>
  }

  if (!rawData) {
    return (
      <div className="card-filled" style={{ textAlign: 'center', padding: 60 }}>
        <p className="text-caption">원본 데이터가 없습니다. 데이터입력 메뉴에서 CSV를 불러와주세요.</p>
      </div>
    )
  }

  const table = rawData[activeTab]
  const columns = table.rows.length > 0 ? Object.keys(table.rows[0]) : []

  return (
    <section>
      <p className="text-caption" style={{ marginBottom: 24 }}>
        업로드된 ERP CSV 4종의 원본 데이터를 확인할 수 있습니다.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {CSV_TYPES.map(({ type, label }) => (
          <button
            key={type}
            className={`filter-chip${activeTab === type ? ' filter-chip--active' : ''}`}
            onClick={() => setActiveTab(type)}
          >
            {label}
            <span className="badge badge--pending" style={{ padding: '2px 8px', fontSize: 11 }}>
              {rawData[type].total}건
            </span>
          </button>
        ))}
      </div>

      <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
          <h3 className="text-heading-md">{table.label} 데이터</h3>
          <span className="badge">총 {table.total.toLocaleString()}건</span>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {columns.map((col) => (
                    <td key={col} style={{ whiteSpace: 'nowrap' }}>{String(row[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {table.total > table.rows.length && (
          <p className="text-caption-sm" style={{ padding: '12px 20px', borderTop: '1px solid var(--hairline-soft)' }}>
            상위 {table.rows.length}건만 표시됩니다. (전체 {table.total}건)
          </p>
        )}
      </div>
    </section>
  )
}
