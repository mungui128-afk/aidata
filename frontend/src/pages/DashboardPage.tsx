import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, DollarSign, Package, Percent, Users, ShoppingCart, Calendar } from 'lucide-react'
import type { DashboardData } from '../types'

const COLORS = ['#111111', '#007d48', '#1151ff', '#0a7281', '#707072', '#39393b', '#4b4b4d', '#9e9ea0']
const GRID = '#e5e5e5'
const AXIS = '#707072'
const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid #cacacb', borderRadius: 0, fontSize: 13 }

function formatWon(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`
  return n.toLocaleString()
}

function getAnalysisPeriodLabel(dashboard: DashboardData): string {
  const period = dashboard.meta.analysis_period
  if (period?.label) return period.label
  if (dashboard.monthly_trend.length > 0) {
    const months = dashboard.monthly_trend.map((m) => m.month).sort()
    const first = months[0].replace('-', '년 ') + '월'
    const last = months[months.length - 1].replace('-', '년 ') + '월'
    return first === last ? first : `${first} ~ ${last}`
  }
  return '분석 기간 없음'
}

export default function DashboardPage({ dashboard }: { dashboard: DashboardData }) {
  const { kpis, monthly_trend, category_breakdown, product_top, region_breakdown, customer_top, summary_table } = dashboard
  const analysisPeriod = getAnalysisPeriodLabel(dashboard)

  const kpiCards = [
    { label: '총 매출', value: `${formatWon(kpis.total_revenue)}원`, icon: DollarSign },
    { label: '총 이익', value: `${formatWon(kpis.total_profit)}원`, icon: TrendingUp },
    { label: '이익률', value: `${kpis.profit_margin}%`, icon: Percent },
    { label: '주문 건수', value: `${kpis.order_count.toLocaleString()}건`, icon: ShoppingCart },
    { label: '상품 수', value: `${kpis.product_count}개`, icon: Package },
    { label: '고객 수', value: `${kpis.customer_count}명`, icon: Users },
  ]

  return (
    <section>
      <div className="dashboard-meta">
        <div className="analysis-period">
          <Calendar size={18} strokeWidth={1.5} />
          <div>
            <span className="analysis-period__label">분석 기간</span>
            <span className="analysis-period__value">{analysisPeriod}</span>
          </div>
        </div>
        <p className="text-caption">
          상품 {dashboard.meta.row_counts.products}건 · 고객 {dashboard.meta.row_counts.customers}건 ·
          주문 {dashboard.meta.row_counts.orders}건 · 주문상세 {dashboard.meta.row_counts.order_details}건
        </p>
      </div>

      <div className="kpi-grid">
        {kpiCards.map((k) => (
          <div key={k.label} className="kpi-card">
            <k.icon size={22} color="#111111" strokeWidth={1.5} />
            <div>
              <p className="kpi-card__label">{k.label}</p>
              <p className="kpi-card__value">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        {monthly_trend.length > 0 && (
          <div className="chart-card">
            <p className="text-heading-md" style={{ marginBottom: 16 }}>월별 매출 추이</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={{ fill: AXIS, fontSize: 12 }} tickFormatter={formatWon} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toLocaleString()}원`, '매출']} />
                <Bar dataKey="revenue" fill="#111111" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {category_breakdown.length > 0 && (
          <div className="chart-card">
            <p className="text-heading-md" style={{ marginBottom: 16 }}>카테고리별 매출</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={category_breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {category_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${v.toLocaleString()}원`} />
                <Legend wrapperStyle={{ fontSize: 12, color: AXIS }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {product_top.length > 0 && (
          <div className="chart-card">
            <p className="text-heading-md" style={{ marginBottom: 16 }}>상품별 매출 TOP</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={product_top} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: AXIS, fontSize: 12 }} tickFormatter={formatWon} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toLocaleString()}원`, '매출']} />
                <Bar dataKey="value" fill="#007d48" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {region_breakdown.length > 0 && (
          <div className="chart-card">
            <p className="text-heading-md" style={{ marginBottom: 16 }}>지역별 매출</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={region_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS, fontSize: 12 }} tickFormatter={formatWon} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toLocaleString()}원`, '매출']} />
                <Bar dataKey="value" fill="#1151ff" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {customer_top.length > 0 && (
        <div className="chart-card">
          <p className="text-heading-md" style={{ marginBottom: 16 }}>고객별 매출 TOP</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={customer_top} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={{ fill: AXIS, fontSize: 12 }} tickFormatter={formatWon} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toLocaleString()}원`, '매출']} />
              <Bar dataKey="value" fill="#0a7281" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {summary_table.length > 0 && (
        <div className="chart-card">
          <p className="text-heading-md" style={{ marginBottom: 16 }}>카테고리별 집계표</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>카테고리</th>
                  <th>매출</th>
                  <th>수량</th>
                  <th>이익</th>
                </tr>
              </thead>
              <tbody>
                {summary_table.map((row, i) => (
                  <tr key={i}>
                    <td>{row.group}</td>
                    <td style={{ textAlign: 'right' }}>{row.revenue.toLocaleString()}원</td>
                    <td style={{ textAlign: 'right' }}>{row.quantity.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{row.profit.toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
