import type { CsvType } from '../types'
import type { ParsedTable } from '../validation/erpSchemas'

const COLUMN_ALIASES: Record<string, string[]> = {
  product_id: ['product_id', '상품id', '상품ID'],
  product_name: ['product_name', '상품명', '품목명', '제품명'],
  category: ['category', '카테고리', '분류'],
  unit_price: ['unit_price', 'unit_price_krw', '단가', '판매단가', '가격', 'price'],
  cost: ['cost', 'unit_cost_krw', '원가', '원가액', 'cost_krw'],
  customer_id: ['customer_id', '고객id', '고객ID'],
  customer_name: ['customer_name', '고객명', '거래처명', '회사명', 'name'],
  region: ['region', '지역', '권역', 'city', '도시'],
  industry: ['industry', '업종', '산업', 'customer_type', '고객유형'],
  order_id: ['order_id', 'order_no', '주문id', '주문ID', '주문번호'],
  order_date: ['order_date', '주문일', '날짜', '일자', 'date'],
  status: ['status', '상태', '주문상태'],
  product_id_od: ['product_id', '상품id', '상품ID'],
  quantity: ['quantity', '수량', 'qty', 'qnt'],
}

const TYPE_REQUIRED: Record<CsvType, string[]> = {
  products: ['product_id', 'product_name', 'category', 'unit_price', 'cost'],
  customers: ['customer_id', 'customer_name', 'region', 'industry'],
  orders: ['order_id', 'customer_id', 'order_date', 'status'],
  order_details: ['order_id', 'product_id', 'quantity', 'unit_price'],
}

function normalize(name: string): string {
  return name.replace(/\s/g, '').toLowerCase()
}

function detectColumn(headers: string[], field: string): string | null {
  const map = Object.fromEntries(headers.map((h) => [normalize(h), h]))
  for (const alias of COLUMN_ALIASES[field] ?? [field]) {
    if (map[normalize(alias)]) return map[normalize(alias)]
  }
  return null
}

function mapHeaders(headers: string[], fields: string[]): Record<string, string> | null {
  const mapping: Record<string, string> = {}
  for (const field of fields) {
    const col = detectColumn(headers, field)
    if (!col) return null
    mapping[col] = field
  }
  return mapping
}

export function detectCsvType(headers: string[], filename = ''): CsvType | null {
  const types: CsvType[] = ['products', 'customers', 'orders', 'order_details']
  for (const type of types) {
    if (mapHeaders(headers, TYPE_REQUIRED[type])) return type
  }
  return detectTypeFromFilename(filename)
}

function detectTypeFromFilename(name: string): CsvType | null {
  const n = name.toLowerCase()
  if (/sales.?order.?item|order.?detail|주문상세/.test(n)) return 'order_details'
  if (/sales.?order|orders\.csv|주문(?!상세)/.test(n)) return 'orders'
  if (/customer|고객|거래처/.test(n)) return 'customers'
  if (/product|상품|품목/.test(n)) return 'products'
  return null
}

/** RFC4180-ish: quoted fields with commas */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur.trim())
  return result
}

function parseCSVText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
  return { headers, rows }
}

export async function parseCsvFile(file: File): Promise<{ type: CsvType | null; table: ParsedTable | null; error?: string }> {
  const buffer = await file.arrayBuffer()
  let text = new TextDecoder('utf-8').decode(buffer)
  if (text.includes('\ufffd')) {
    try {
      text = new TextDecoder('euc-kr').decode(buffer)
    } catch {
      /* keep utf-8 */
    }
  }

  const { headers, rows } = parseCSVText(text)
  if (headers.length === 0) {
    return { type: null, table: null, error: 'CSV 헤더가 없습니다' }
  }

  let type = detectCsvType(headers, file.name)
  if (!type) {
    return { type: null, table: null, error: 'CSV 유형을 인식할 수 없습니다 (상품/고객/주문/주문상세)' }
  }

  let mapping = mapHeaders(headers, TYPE_REQUIRED[type])
  if (!mapping && detectTypeFromFilename(file.name)) {
    type = detectTypeFromFilename(file.name)!
    mapping = mapHeaders(headers, TYPE_REQUIRED[type])
  }
  if (!mapping) {
    return { type: null, table: null, error: `[${file.name}] 필수 컬럼을 찾을 수 없습니다` }
  }

  const mappedRows = rows.map((row) => {
    const mapped: Record<string, string> = {}
    for (const [orig, field] of Object.entries(mapping)) {
      mapped[field] = String(row[orig] ?? '').trim()
    }
    return mapped
  })

  return { type, table: { type, rows: mappedRows } }
}
