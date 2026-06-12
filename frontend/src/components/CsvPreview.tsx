import { CSV_TYPES, type CsvType } from '../types'
import type { ParsedTable } from '../validation/erpSchemas'

interface Props {
  tables: Partial<Record<CsvType, ParsedTable>>
}

const PREVIEW_ROWS = 8

export default function CsvPreview({ tables }: Props) {
  const available = CSV_TYPES.filter(({ type }) => tables[type]?.rows.length)

  if (available.length === 0) return null

  return (
    <div style={{ marginTop: 24, marginBottom: 24 }}>
      <h3 className="text-heading-md" style={{ marginBottom: 16 }}>CSV 미리보기</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {available.map(({ type, label }) => {
          const table = tables[type]!
          const columns = table.rows.length > 0 ? Object.keys(table.rows[0]) : []
          const preview = table.rows.slice(0, PREVIEW_ROWS)

          return (
            <div key={type} className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
                <span className="text-heading-md" style={{ fontSize: 14 }}>{label}</span>
                <span className="badge">{table.rows.length.toLocaleString()}건</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {columns.map((col) => (
                          <td key={col} style={{ whiteSpace: 'nowrap' }}>{String(row[col] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.rows.length > PREVIEW_ROWS && (
                <p className="text-caption-sm" style={{ padding: '8px 16px', borderTop: '1px solid var(--hairline-soft)' }}>
                  상위 {PREVIEW_ROWS}건만 표시 · 전체 {table.rows.length.toLocaleString()}건
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
