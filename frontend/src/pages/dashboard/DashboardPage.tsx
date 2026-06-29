import { useQuery } from '@tanstack/react-query'
import { salesApi } from '../../api/sales'
import { productsApi } from '../../api/products'
import { Card } from '../../components/ui/Card'
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
      color: 'bg-emerald-50 text-emerald-600',
      sub: `${stats?.today?.salesCount || 0} ta sotuv`,
    },
    {
      title: 'Haftalik daromad',
      value: formatCurrency(stats?.week?.revenue || 0),
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600',
      sub: `${stats?.week?.salesCount || 0} ta sotuv`,
    },
    {
      title: 'Kam qolgan tovarlar',
      value: String(lowStockProducts?.length || 0),
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-600',
      sub: 'Zaxira to\'ldiring',
    },
    {
      title: 'Top mahsulot',
      value: stats?.topProducts?.[0]?.product?.name || '—',
      icon: Package,
      color: 'bg-purple-50 text-purple-600',
      sub: 'Bugun eng ko\'p sotilgan',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Xush kelibsiz, {user?.name}!</h1>
        <p className="text-sm text-slate-500 mt-0.5">Bugungi holat</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ title, value, icon: Icon, color, sub }) => (
          <Card key={title}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-500">{title}</p>
                <p className="text-xl font-bold text-slate-800 mt-1 truncate">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{sub}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${color} ml-3 flex-shrink-0`}>
                <Icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card padding={false}>
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">So'nggi sotuvlar</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {(recentSales as { id: string; totalAmount: number; createdAt: string; customerName?: string }[] | undefined)?.slice(0, 8).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {sale.customerName || 'Noma\'lum mijoz'}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(sale.createdAt)}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  {formatCurrency(sale.totalAmount)}
                </span>
              </div>
            ))}
            {!recentSales?.length && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                Sotuvlar mavjud emas
              </div>
            )}
          </div>
        </Card>

        {/* Low Stock */}
        <Card padding={false}>
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Kam qolgan tovarlar</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {(lowStockProducts as { id: string; name: string; stock: number; minStock: number; category?: { name: string } }[] | undefined)?.slice(0, 8).map((product) => (
              <div key={product.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{product.name}</p>
                  <p className="text-xs text-slate-400">{product.category?.name}</p>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  {Number(product.stock)} / {Number(product.minStock)}
                </span>
              </div>
            ))}
            {!lowStockProducts?.length && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                Barcha tovarlar yetarli
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
