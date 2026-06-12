import {
  Database, LayoutDashboard, FileText, Table2,
} from 'lucide-react'
import type { MenuId } from '../types'

interface Props {
  active: MenuId
  onChange: (menu: MenuId) => void
  dataLoaded: boolean
}

const MENUS: { id: MenuId; label: string; icon: typeof Database; requiresData?: boolean }[] = [
  { id: 'input', label: '데이터입력', icon: Database },
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, requiresData: true },
  { id: 'report', label: '분석보고서', icon: FileText, requiresData: true },
  { id: 'raw', label: '원본데이터', icon: Table2, requiresData: true },
]

export default function Sidebar({ active, onChange, dataLoaded }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">ERP Analytics</div>
        <div className="sidebar-brand-sub">데이터 분석 &amp; 자동 보고서</div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {MENUS.map((menu) => {
          const disabled = menu.requiresData && !dataLoaded
          const Icon = menu.icon
          const isActive = active === menu.id
          return (
            <button
              key={menu.id}
              className={`nav-item${isActive ? ' nav-item--active' : ''}`}
              onClick={() => !disabled && onChange(menu.id)}
              disabled={disabled}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span>{menu.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
