import type { CsvType } from '../types'
import type { ParsedTable } from '../validation/erpSchemas'

const COLUMN_ALIASES: Record<string, string[]> = {
  product_id: ['product_id', '상품id', '상품ID'],
  product_name: ['product_name', '상품명', '품목명', '제품명'],
  category: ['category', '카테고리', '분류'],
  unit_price: ['unit_price', '단가', '판매단가', '가격'],
  cost: ['cost', '원가', '원가액'],
  customer_id: ['customer_id', '고객id', '고객ID'],
  customer_name: ['customer_name', '고객명', '거래처명', '회사명'],
  region: ['region', '지역', '권역'],
  industry: ['industry', '업종', '산업'],
  order_id: ['order_id', '주문id', '주문ID'],
  order_date: ['order_date', '주문일', '날짜', '일자'],
  status: ['status', '상태', '주문상태'],
  product_id_od: ['product_id', '상품id', '상품ID'],
  quantity: ['quantity', '수량', 'qty'],
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

export function detectCsvType(headers: string[]): CsvType | null {
  const types: CsvType[] = ['products', 'customers', 'orders', 'order_details']
  for (const type of types) {
    if (mapHeaders(headers, TYPE_REQUIRED[type])) return type
  }
  return null
}

function parseCSVText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].split(',').map((h) => h.trim())
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
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

  const type = detectCsvType(headers)
  if (!type) {
    return { type: null, table: null, error: 'CSV 유형을 인식할 수 없습니다 (상품/고객/주문/주문상세)' }
  }

  const mapping = mapHeaders(headers, TYPE_REQUIRED[type])!
  const mappedRows = rows.map((row) => {
    const mapped: Record<string, string> = {}
    for (const [orig, field] of Object.entries(mapping)) {
      mapped[field] = row[orig] ?? ''
    }
    return mapped
  })

  return { type, table: { type, rows: mappedRows } }
}

export async function parseMultipleFiles(
  files: File[],
): Promise<{ tables: Partial<Record<CsvType, ParsedTable>>; fileNames: Partial<Record<CsvType, string>>; parseErrors: string[] }> {
  const tables: Partial<Record<CsvType, ParsedTable>> = {}
  const fileNames: Partial<Record<CsvType, string>> = {}
  const parseErrors: string[] = []

  for (const file of files) {
    const { type, table, error } = await parseCsvFile(file)
    if (error || !type || !table) {
      parseErrors.push(`${file.name}: ${error ?? '파싱 실패'}`)
      continue
    }
    if (tables[type]) {
      parseErrors.push(`${file.name}: '${type}' 유형 CSV가 이미 선택되어 있습니다`)
      continue
    }
    tables[type] = table
    fileNames[type] = file.name
  }

  return { tables, fileNames, parseErrors }
}
