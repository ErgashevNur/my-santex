import { useQuery } from '@tanstack/react-query'
import { storesApi } from '../../api/stores'
import { Card } from '../../components/ui/Card'
import { formatCurrency } from '../../lib/utils'
import { Store, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: storesApi.getDashboard,
  })

  const cards = [
    { label: 'Jami do\'konlar', value: stats?.totalStores || 0, icon: Store, color: 'bg-blue-50 text-blue-600' },
    { label: 'Faol obunalar', value: stats?.activeStores || 0, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Muddati o\'tgan', value: stats?.expiredStores || 0, icon: AlertCircle, color: 'bg-red-50 text-red-600' },
    { label: 'Jami daromad', value: formatCurrency(stats?.totalRevenue || 0), icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">Platforma umumiy holati</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="text-center py-8">
          <p className="text-slate-500 mb-4">Do'konlar ro'yxatini ko'rish uchun</p>
          <Link
            to="/admin/stores"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <Store size={16} /> Do'konlar
          </Link>
        </div>
      </Card>
    </div>
  )
}
