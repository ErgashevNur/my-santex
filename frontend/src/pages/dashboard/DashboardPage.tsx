import { useQuery } from '@tanstack/react-query'
import { salesApi } from '../../api/sales'
import { productsApi } from '../../api/products'
import { formatCurrency, formatDate } from '../../lib/utils'
import { TrendingUp, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['sales-stats'],
    queryFn: salesApi.getStats,
    refetchInterval: 30000,
  })

  const { data: recentSales } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => salesApi.getAll(),
  })

  const { data: lowStockProducts } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => productsApi.getAll({ lowStock: 'true' }),
  })

  const statCards = [
    {
      title: 'Bugungi daromad',
      value: formatCurrency(stats?.today?.revenue || 0),
      icon: TrendingUp,
      bg: 'bg-emerald-500',
      light: 'bg-emerald-50',
      text: 'text-emerald-600',
      sub: `${stats?.today?.salesCount || 0} ta sotuv`,
    },
    {
      title: 'Haftalik daromad',
      value: formatCurrency(stats?.week?.revenue || 0),
      icon: ShoppingCart,
      bg: 'bg-blue-500',
      light: 'bg-blue-50',
      text: 'text-blue-600',
      sub: `${stats?.week?.salesCount || 0} ta sotuv`,
    },
    {
      title: 'Kam qolgan tovar',
      value: String(lowStockProducts?.length || 0),
      icon: AlertTriangle,
      bg: 'bg-amber-500',
      light: 'bg-amber-50',
      text: 'text-amber-600',
      sub: 'Zaxira to\'ldiring',
    },
    {
      title: 'Top mahsulot',
      value: stats?.topProducts?.[0]?.product?.name || '—',
      icon: Package,
      bg: 'bg-purple-500',
      light: 'bg-purple-50',
      text: 'text-purple-600',
      sub: 'Bugun eng ko\'p',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Salom */}
      <div>
        <h1 className="text-lg font-bold text-slate-800">Xush kelibsiz, {user?.name}!</h1>
        <p className="text-sm text-slate-500">Bugungi holat</p>
      </div>

      {/* Stats — 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ title, value, icon: Icon, light, text, sub }) => (
          <div key={title} className={`${light} rounded-2xl p-4`}>
            <div className={`inline-flex p-2 rounded-xl ${light} mb-2`}>
              <Icon size={18} className={text} />
            </div>
            <p className="text-xs text-slate-500 leading-tight">{title}</p>
            <p className={`text-base font-bold mt-0.5 ${text} leading-tight truncate`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Kam qolgan tovarlar — tepada */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            Kam qolgan tovarlar
          </h3>
          <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
            {(lowStockProducts as unknown[])?.length || 0} ta
          </span>
        </div>
        <div className="divide-y divide-slate-50">
          {!(lowStockProducts as unknown[])?.length ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Barcha tovarlar yetarli ✓
            </div>
          ) : (
            (lowStockProducts as { id: string; name: string; stock: number; minStock: number; category?: { name: string } }[])
              .slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.name}</p>
                    {p.category && <p className="text-xs text-slate-400">{p.category.name}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-600">{Number(p.stock)}</span>
                    <span className="text-xs text-slate-400"> / {Number(p.minStock)}</span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* So'nggi sotuvlar — pastda */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <ShoppingCart size={15} className="text-blue-500" />
            So'nggi sotuvlar
          </h3>
        </div>
        <div className="divide-y divide-slate-50">
          {!(recentSales as unknown[])?.length ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Sotuvlar mavjud emas
            </div>
          ) : (
            (recentSales as { id: string; totalAmount: number; createdAt: string; customerName?: string }[])
              .slice(0, 8).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {sale.customerName || 'Noma\'lum mijoz'}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(sale.createdAt)}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatCurrency(sale.totalAmount)}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  )
}
