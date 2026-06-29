import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { debtorsApi } from '../../api/debtors'
import { formatCurrency } from '../../lib/utils'
import { Search, Plus, X, UserPlus } from 'lucide-react'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function DebtorsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today())

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
      await debtorsApi.addDebt(debtor.id, { amount: Number(amount), note: note.trim() || undefined })
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
    setName(''); setPhone(''); setAmount(''); setNote(''); setDate(today())
  }

  const filtered = debtors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone || '').includes(search)
  )

  const totalDebt = Number(summary?._sum?.totalDebt ?? 0)
  const totalCount = summary?._count?.id ?? 0

  const fmt = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">

      {/* Yuqori panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Qarzdorlar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Jami: <span className="font-semibold text-red-600">{formatCurrency(totalDebt)}</span>
            {' · '}{totalCount} ta shaxs
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-red-700 active:scale-95 transition-all shadow-sm"
        >
          <UserPlus size={18} />
          Qarzdor qo'shish
        </button>
      </div>

      {/* Qidiruv */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Ism yoki telefon..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
        />
      </div>

      {/* Jadval */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Jadval sarlavhasi */}
        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4">Ismi</div>
          <div className="col-span-3">Telefon</div>
          <div className="col-span-2">Sana</div>
          <div className="col-span-2 text-right">Qarz summasi</div>
        </div>

        {/* Jadval qatorlari */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {search ? 'Hech narsa topilmadi' : 'Hali qarzdor yo\'q'}
          </div>
        ) : (
          filtered.map((debtor, i) => (
            <button
              key={debtor.id}
              onClick={() => navigate(`/debtors/${debtor.id}`)}
              className="w-full grid grid-cols-12 px-4 py-3.5 text-sm border-b border-slate-100 last:border-0 hover:bg-red-50 transition-colors text-left"
            >
              <div className="col-span-1 text-center text-slate-400 font-medium">{i + 1}</div>
              <div className="col-span-4 font-semibold text-slate-800 truncate pr-2">{debtor.name}</div>
              <div className="col-span-3 text-slate-500">{debtor.phone || '—'}</div>
              <div className="col-span-2 text-slate-500">{fmt(debtor.createdAt)}</div>
              <div className={`col-span-2 text-right font-bold ${Number(debtor.totalDebt) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Number(debtor.totalDebt))}
              </div>
            </button>
          ))
        )}

        {/* Jadval osti — jami */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-12 px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm font-semibold">
            <div className="col-span-10 text-slate-600">Jami</div>
            <div className="col-span-2 text-right text-red-600">
              {formatCurrency(filtered.reduce((s, d) => s + Number(d.totalDebt), 0))}
            </div>
          </div>
        )}
      </div>

      {/* Modal — Qarzdor qo'shish */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Plus size={18} className="text-red-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Qarzdor qo'shish</h3>
              </div>
              <button onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Ismi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Mijozning ismi"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Qarz summasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sana</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefon raqami</label>
                <input
                  type="tel"
                  placeholder="+998 90 000 00 00"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Izoh (nima oldi)</label>
                <input
                  type="text"
                  placeholder="Masalan: kiyim, oziq-ovqat..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>

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
