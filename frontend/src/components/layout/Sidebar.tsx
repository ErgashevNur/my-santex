import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/auth.store'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Store,
  LogOut, ChevronLeft, ChevronRight, Bell, Wallet,
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isDebtStore = user?.store?.storeType === 'DEBT'

  const storeLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/products', icon: Package, label: 'Tovarlar' },
    { to: '/sales', icon: ShoppingCart, label: 'Sotuvlar' },
    ...(user?.role !== 'SALES_MANAGER' ? [{ to: '/users', icon: Users, label: 'Xodimlar' }] : []),
  ]

  const debtLinks = [
    { to: '/debtors', icon: Wallet, label: 'Qarzdorlar' },
  ]

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/stores', icon: Store, label: "Do'konlar" },
    { to: '/admin/notifications', icon: Bell, label: 'Bildirishnomalar' },
  ]

  const links = isSuperAdmin ? adminLinks : isDebtStore ? debtLinks : storeLinks

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 sticky top-0',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-4 border-b border-slate-700', collapsed && 'justify-center')}>
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
          MS
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm truncate">
            {isSuperAdmin ? 'My Santex Admin' : user?.store?.name || 'My Santex'}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard' || to === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                collapsed && 'justify-center',
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-slate-700 space-y-1">
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors',
            collapsed && 'justify-center',
          )}
          title={collapsed ? 'Chiqish' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Chiqish</span>}
        </button>
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-xs">Yig'ish</span>}
        </button>
      </div>
    </aside>
  )
}
