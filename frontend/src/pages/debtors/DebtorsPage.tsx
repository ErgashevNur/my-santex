import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { debtorsApi } from '../../api/debtors'
import { formatCurrency } from '../../lib/utils'
import { UserPlus, Search, ChevronRight, Wallet } from 'lucide-react'

export default function DebtorsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const { data: debtors = [], isLoading } = useQuery({
    queryKey: ['debtors'],
    queryFn: debtorsApi.getAll,
  })

  const { data: summary } = useQuery({
    queryKey: ['debtors-summary'],
    queryFn: debtorsApi.getSummary,
  })

  const create = useMutation({
    mutationFn: debtorsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debtors'] })
      qc.invalidateQueries({ queryKey: ['debtors-summary'] })
      setShowForm(false)
      setName('')
      setPhone('')
    },
  })

  const filtered = debtors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone || '').includes(search)
  )

  const totalDebt = Number(summary?._sum?.totalDebt ?? 0)
  const totalCount = summary?._count?.id ?? 0

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Umumiy qarz */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
        <div className="bg-red-100 rounded-full p-3">
          <Wallet size={24} className="text-red-600" />
        </div>
        <div>
          <p className="text-sm text-red-500 font-medium">Jami qarz</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totalDebt)}</p>
          <p className="text-xs text-red-400">{totalCount} ta qarzdor</p>
        </div>
      </div>

      {/* Qidiruv + Yangi qarzdor */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Ism yoki telefon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <UserPlus size={16} />
          Yangi
        </button>
      </div>

      {/* Yangi qarzdor formasi */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-slate-800">Yangi qarzdor</h3>
          <input
            type="text"
            placeholder="Ismi *"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="tel"
            placeholder="Telefon (ixtiyoriy)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setName(''); setPhone('') }}
              className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Bekor
            </button>
            <button
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate({ name: name.trim(), phone: phone.trim() || undefined })}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {create.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      )}

      {/* Qarzdorlar ro'yxati */}
      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          {search ? 'Topilmadi' : "Hali qarzdor yo'q"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(debtor => (
            <button
              key={debtor.id}
              onClick={() => navigate(`/debtors/${debtor.id}`)}
              className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all text-left"
            >
              <div>
                <p className="font-semibold text-slate-800">{debtor.name}</p>
                {debtor.phone && <p className="text-xs text-slate-400 mt-0.5">{debtor.phone}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`font-bold ${Number(debtor.totalDebt) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Number(debtor.totalDebt))}
                  </p>
                  <p className="text-xs text-slate-400">{debtor._count?.transactions ?? 0} ta amal</p>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
