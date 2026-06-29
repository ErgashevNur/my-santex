import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/auth.store'
import { LayoutDashboard, Package, ShoppingCart, Users, Store, Bell, Wallet } from 'lucide-react'

export default function BottomNav() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isDebtStore = user?.store?.storeType === 'DEBT'

  const storeLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Asosiy' },
    { to: '/products', icon: Package, label: 'Tovarlar' },
    { to: '/sales', icon: ShoppingCart, label: 'Sotuv' },
    ...(user?.role !== 'SALES_MANAGER'
      ? [{ to: '/users', icon: Users, label: 'Xodimlar' }]
      : []),
  ]

  const debtLinks = [
    { to: '/debtors', icon: Wallet, label: 'Qarzdorlar' },
  ]

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Asosiy' },
    { to: '/admin/stores', icon: Store, label: "Do'konlar" },
    { to: '/admin/notifications', icon: Bell, label: 'Bildirishnoma' },
  ]

  const links = isSuperAdmin ? adminLinks : isDebtStore ? debtLinks : storeLinks

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard' || to === '/admin'}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
              isActive ? 'text-blue-600' : 'text-slate-400',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
