import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { debtorsApi } from '../../api/debtors'
import { formatCurrency } from '../../lib/utils'
import { Search, X, UserPlus, Phone, ChevronRight } from 'lucide-react'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      {/* Yuqori statistika */}
      <div className="bg-red-600 px-4 pt-5 pb-8">
        <h1 className="text-white font-bold text-lg mb-3">Qarzdorlar</h1>
        <div className="flex gap-3">
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-red-100 text-xs mb-1">Umumiy qarz</p>
            <p className="text-white font-bold text-lg leading-tight">{formatCurrency(totalDebt)}</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-red-100 text-xs mb-1">Qarzdorlar</p>
            <p className="text-white font-bold text-lg leading-tight">{totalCount} ta</p>
          </div>
        </div>
      </div>

      {/* Asosiy kontent */}
      <div className="flex-1 -mt-4 rounded-t-3xl bg-slate-50 px-4 pt-4 pb-28 space-y-3">

        {/* Qidiruv + Qo'shish */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ism yoki telefon..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all whitespace-nowrap"
          >
            <UserPlus size={16} />
            Qo'shish
          </button>
        </div>

        {/* Ro'yxat */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            {search ? 'Topilmadi' : 'Hali qarzdor yo\'q'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((debtor) => (
              <button
                key={debtor.id}
                onClick={() => navigate(`/debtors/${debtor.id}`)}
                className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm active:scale-98 transition-all text-left border border-slate-100"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 font-bold text-base">
                    {debtor.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Ma'lumot */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800 truncate">{debtor.name}</p>
                    <p className={`font-bold text-sm flex-shrink-0 ${Number(debtor.totalDebt) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Number(debtor.totalDebt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {debtor.phone ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone size={10} />{debtor.phone}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                    <span className="text-xs text-slate-300">{fmtDate(debtor.createdAt)}</span>
                  </div>
                </div>

                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </button>
            ))}

            {/* Jami */}
            <div className="bg-slate-100 rounded-2xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Jami qarz</span>
              <span className="font-bold text-red-600">
                {formatCurrency(filtered.reduce((s, d) => s + Number(d.totalDebt), 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={closeForm}>
          <div
            className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-8 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Yangi qarzdor</h3>
              <button onClick={closeForm} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  ISMI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Mijozning ismi"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  QARZ SUMMASI <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">SANA</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">TELEFON</label>
                  <input
                    type="tel"
                    placeholder="+998..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">IZOH</label>
                <input
                  type="text"
                  placeholder="Nima oldi (ixtiyoriy)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50"
                />
              </div>
            </div>

            <button
              disabled={!name.trim() || !amount || Number(amount) <= 0 || createWithDebt.isPending}
              onClick={() => createWithDebt.mutate()}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-semibold hover:bg-red-700 disabled:opacity-50 active:scale-98 transition-all"
            >
              {createWithDebt.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
