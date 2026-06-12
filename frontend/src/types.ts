export type MenuId = 'input' | 'dashboard' | 'report' | 'raw'

export type CsvType = 'products' | 'customers' | 'orders' | 'order_details'

export const CSV_TYPES: { type: CsvType; label: string; order: number }[] = [
  { type: 'products', label: '상품', order: 1 },
  { type: 'customers', label: '고객', order: 2 },
  { type: 'orders', label: '주문', order: 3 },
  { type: 'order_details', label: '주문상세', order: 4 },
]

export interface UploadStatusItem {
  type: CsvType
  label: string
  uploaded: boolean
  filename: string | null
  row_count: number
}

export interface DashboardData {
  meta: {
    upload_status: UploadStatusItem[]
    row_counts: Record<CsvType, number>
  }
  kpis: {
    total_revenue: number
    total_cost: number
    total_profit: number
    total_quantity: number
    profit_margin: number
    avg_order_value: number
    row_count: number
    order_count: number
    product_count: number
    customer_count: number
  }
  monthly_trend: Array<{ month: string; revenue?: number; profit?: number }>
  category_breakdown: Array<{ name: string; value: number }>
  product_top: Array<{ name: string; value: number }>
  region_breakdown: Array<{ name: string; value: number }>
  customer_top: Array<{ name: string; value: number }>
  summary_table: Array<{ group: string; revenue: number; quantity: number; profit: number }>
  summary_group_by: string | null
}

export interface RawDataTable {
  label: string
  rows: Record<string, unknown>[]
  total: number
}

export interface RawData {
  products: RawDataTable
  customers: RawDataTable
  orders: RawDataTable
  order_details: RawDataTable
}

export interface ReportSection {
  heading: string
  content: string
  insights: string[]
}

export interface AIReport {
  title: string
  executive_summary: string
  sections: ReportSection[]
  recommendations: string[]
  risk_factors: string[]
  outlook: string
  generated_by?: string
}

export interface LoadResponse {
  session_id: string
  upload_status: UploadStatusItem[]
  dashboard: DashboardData
}
