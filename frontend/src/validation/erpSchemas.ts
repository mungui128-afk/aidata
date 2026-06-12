import { z } from 'zod'
import type { CsvType } from '../types'

const num = (v: unknown) => {
  if (typeof v === 'number') return v
  const s = String(v ?? '').replace(/[,₩원\s]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

const strField = (v: unknown) => String(v ?? '').trim()

export const productRowSchema = z.object({
  product_id: z.preprocess(strField, z.string().min(1, '상품ID가 비어 있습니다')),
  product_name: z.preprocess(strField, z.string().min(1, '상품명이 비어 있습니다')),
  category: z.preprocess(strField, z.string().min(1, '카테고리가 비어 있습니다')),
  unit_price: z.preprocess(num, z.number().nonnegative('단가는 0 이상이어야 합니다')),
  cost: z.preprocess(num, z.number().nonnegative('원가는 0 이상이어야 합니다')),
})

export const customerRowSchema = z.object({
  customer_id: z.preprocess(strField, z.string().min(1, '고객ID가 비어 있습니다')),
  customer_name: z.preprocess(strField, z.string().min(1, '고객명이 비어 있습니다')),
  region: z.preprocess(strField, z.string().min(1, '지역이 비어 있습니다')),
  industry: z.preprocess(strField, z.string().min(1, '업종이 비어 있습니다')),
})

export const orderRowSchema = z.object({
  order_id: z.preprocess(strField, z.string().min(1, '주문ID가 비어 있습니다')),
  customer_id: z.preprocess(strField, z.string().min(1, '고객ID가 비어 있습니다')),
  order_date: z.preprocess(strField, z.string().min(1, '주문일이 비어 있습니다')),
  status: z.preprocess(strField, z.string().min(1, '상태가 비어 있습니다')),
})

export const orderDetailRowSchema = z.object({
  order_id: z.preprocess(strField, z.string().min(1, '주문ID가 비어 있습니다')),
  product_id: z.preprocess(strField, z.string().min(1, '상품ID가 비어 있습니다')),
  quantity: z.preprocess(num, z.number().positive('수량은 1 이상이어야 합니다')),
  unit_price: z.preprocess(num, z.number().nonnegative('판매단가는 0 이상이어야 합니다')),
})

export const SCHEMA_MAP: Record<CsvType, z.ZodTypeAny> = {
  products: productRowSchema,
  customers: customerRowSchema,
  orders: orderRowSchema,
  order_details: orderDetailRowSchema,
}

export type ProductRow = z.infer<typeof productRowSchema>
export type CustomerRow = z.infer<typeof customerRowSchema>
export type OrderRow = z.infer<typeof orderRowSchema>
export type OrderDetailRow = z.infer<typeof orderDetailRowSchema>

export type ParsedTable<T = Record<string, unknown>> = {
  type: CsvType
  rows: T[]
}

export interface ValidationResult {
  valid: boolean
  tables: Partial<Record<CsvType, ParsedTable>>
  fileStatus: Record<CsvType, FileSlotStatus>
  integrityErrors: string[]
  schemaErrors: string[]
}

export interface FileSlotStatus {
  type: CsvType
  label: string
  order: number
  filename: string | null
  status: 'missing' | 'validating' | 'valid' | 'invalid'
  rowCount: number
  errors: string[]
}

export const CSV_SLOT_META: { type: CsvType; label: string; order: number }[] = [
  { type: 'products', label: '상품', order: 1 },
  { type: 'customers', label: '고객', order: 2 },
  { type: 'orders', label: '주문', order: 3 },
  { type: 'order_details', label: '주문상세', order: 4 },
]

export function emptyFileStatus(): Record<CsvType, FileSlotStatus> {
  const result = {} as Record<CsvType, FileSlotStatus>
  for (const { type, label, order } of CSV_SLOT_META) {
    result[type] = { type, label, order, filename: null, status: 'missing', rowCount: 0, errors: [] }
  }
  return result
}

export function validateTables(
  tables: Partial<Record<CsvType, ParsedTable>>,
  fileNames: Partial<Record<CsvType, string>>,
): ValidationResult {
  const fileStatus = emptyFileStatus()
  const schemaErrors: string[] = []

  for (const { type, label, order } of CSV_SLOT_META) {
    fileStatus[type] = {
      type,
      label,
      order,
      filename: fileNames[type] ?? null,
      status: 'missing',
      rowCount: 0,
      errors: [],
    }

    const table = tables[type]
    const hasFile = !!fileNames[type]

    if (!table || table.rows.length === 0) {
      if (hasFile) {
        fileStatus[type].status = 'invalid'
        fileStatus[type].errors.push(`${label} CSV 파싱 실패 또는 데이터가 없습니다`)
        schemaErrors.push(`[${label}] CSV 파싱 실패`)
      } else {
        fileStatus[type].errors.push(`${label} CSV가 없습니다`)
      }
      continue
    }

    const schema = SCHEMA_MAP[type]
    const rowErrors: string[] = []

    table.rows.forEach((row, idx) => {
      const result = schema.safeParse(row)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          rowErrors.push(`${idx + 2}행 ${issue.path.join('.')}: ${issue.message}`)
        })
      }
    })

    if (rowErrors.length > 0) {
      fileStatus[type].status = 'invalid'
      fileStatus[type].errors = rowErrors.slice(0, 5)
      if (rowErrors.length > 5) fileStatus[type].errors.push(`외 ${rowErrors.length - 5}건 오류`)
      schemaErrors.push(...fileStatus[type].errors.map((e) => `[${label}] ${e}`))
    } else {
      fileStatus[type].status = 'valid'
      fileStatus[type].rowCount = table.rows.length
    }
  }

  const integrityErrors = checkReferentialIntegrity(tables)
  const allPresent = CSV_SLOT_META.every(({ type }) => fileStatus[type].status === 'valid')
  const valid = allPresent && integrityErrors.length === 0

  return { valid, tables, fileStatus, integrityErrors, schemaErrors }
}

function checkReferentialIntegrity(tables: Partial<Record<CsvType, ParsedTable>>): string[] {
  const errors: string[] = []
  const products = tables.products?.rows as ProductRow[] | undefined
  const customers = tables.customers?.rows as CustomerRow[] | undefined
  const orders = tables.orders?.rows as OrderRow[] | undefined
  const details = tables.order_details?.rows as OrderDetailRow[] | undefined

  if (!products || !customers || !orders || !details) return errors

  const productIds = new Set(products.map((r) => String(r.product_id)))
  const customerIds = new Set(customers.map((r) => String(r.customer_id)))
  const orderIds = new Set(orders.map((r) => String(r.order_id)))

  orders.forEach((row, idx) => {
    if (!customerIds.has(String(row.customer_id))) {
      errors.push(`[주문] ${idx + 2}행: 고객ID '${row.customer_id}'가 고객 테이블에 없습니다`)
    }
  })

  details.forEach((row, idx) => {
    if (!orderIds.has(String(row.order_id))) {
      errors.push(`[주문상세] ${idx + 2}행: 주문ID '${row.order_id}'가 주문 테이블에 없습니다`)
    }
    if (!productIds.has(String(row.product_id))) {
      errors.push(`[주문상세] ${idx + 2}행: 상품ID '${row.product_id}'가 상품 테이블에 없습니다`)
    }
  })

  return errors.slice(0, 10)
}
