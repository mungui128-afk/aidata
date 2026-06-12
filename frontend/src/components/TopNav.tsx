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

export default function TopNav({ active, onChange, dataLoaded }: Props) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__title">ERP Analytics</span>
        <span className="app-header__sub">데이터 분석 &amp; 자동 보고서</span>
      </div>
      <nav className="top-nav" aria-label="주 메뉴">
        {MENUS.map((menu) => {
          const disabled = menu.requiresData && !dataLoaded
          const Icon = menu.icon
          const isActive = active === menu.id
          return (
            <button
              key={menu.id}
              type="button"
              className={`top-nav__item${isActive ? ' top-nav__item--active' : ''}`}
              onClick={() => !disabled && onChange(menu.id)}
              disabled={disabled}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              <span>{menu.label}</span>
            </button>
          )
        })}
      </nav>
    </header>
  )
}
