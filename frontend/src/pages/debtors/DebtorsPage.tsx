import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { debtorsApi } from '../../api/debtors'
import { formatCurrency } from '../../lib/utils'
import { Search, ChevronRight, Plus, X } from 'lucide-react'

export default function DebtorsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const { data: debtors = [], isLoading } = useQuery({
    queryKey: ['debtors'],
    queryFn: debtorsApi.getAll,
  })

  const { data: summary } = useQuery({
    queryKey: ['debtors-summary'],
    queryFn: debtorsApi.getSummary,
  })

  const createWithDebt = useMutation({
    mutationFn: async () => {
      const debtor = await debtorsApi.create({ name: name.trim(), phone: phone.trim() || undefined })
      const amt = Number(amount)
      if (amt > 0) {
        await debtorsApi.addDebt(debtor.id, { amount: amt, note: note.trim() || undefined })
      }
      return debtor
    },
    onSuccess: (debtor) => {
      qc.invalidateQueries({ queryKey: ['debtors'] })
      qc.invalidateQueries({ queryKey: ['debtors-summary'] })
      closeForm()
      navigate(`/debtors/${debtor.id}`)
    },
  })

  const closeForm = () => {
    setShowForm(false)
    setName(''); setPhone(''); setAmount(''); setNote('')
  }

  const filtered = debtors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone || '').includes(search)
  )

  const totalDebt = Number(summary?._sum?.totalDebt ?? 0)
  const totalCount = summary?._count?.id ?? 0

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">

      {/* Jami qarz kartasi */}
      <div className="bg-red-600 rounded-2xl p-5 text-white">
        <p className="text-red-200 text-sm font-medium">Umumiy qarz</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalDebt)}</p>
        <p className="text-red-200 text-sm mt-1">{totalCount} ta qarzdor</p>
      </div>

      {/* Qidiruv */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Ism yoki telefon bo'yicha qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Ro'yxat */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          {search ? 'Topilmadi' : 'Hali qarzdor yo\'q'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(debtor => (
            <button
              key={debtor.id}
              onClick={() => navigate(`/debtors/${debtor.id}`)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between hover:border-red-300 hover:shadow-sm transition-all text-left"
            >
              <div>
                <p className="font-semibold text-slate-800">{debtor.name}</p>
                {debtor.phone && <p className="text-xs text-slate-400 mt-0.5">{debtor.phone}</p>}
              </div>
              <div className="flex items-center gap-3">
                <p className={`font-bold text-base ${Number(debtor.totalDebt) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Number(debtor.totalDebt))}
                </p>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Yangi qarz tugmasi (floating) */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 bg-red-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-red-700 active:scale-95 transition-all z-40"
      >
        <Plus size={24} />
      </button>

      {/* Yangi qarz modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={closeForm}>
          <div className="w-full bg-white rounded-t-2xl p-5 space-y-3 max-w-2xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Yangi qarz yozish</h3>
              <button onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Mijoz ismi *"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <input
              type="tel"
              placeholder="Telefon raqami (ixtiyoriy)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <input
              type="number"
              placeholder="Qarz summasi (so'm) *"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <input
              type="text"
              placeholder="Izoh (nima oldi, ixtiyoriy)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />

            <div className="flex gap-3 pt-1">
              <button
                onClick={closeForm}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                Bekor
              </button>
              <button
                disabled={!name.trim() || !amount || Number(amount) <= 0 || createWithDebt.isPending}
                onClick={() => createWithDebt.mutate()}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {createWithDebt.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
