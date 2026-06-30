import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { debtorsApi } from '../../api/debtors'
import { formatCurrency } from '../../lib/utils'
import { Search, X, UserPlus, Phone, ChevronRight, Users, TrendingDown } from 'lucide-react'
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
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
  const keyboardHeight = useKeyboardHeight()

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

      {/* Qizil header */}
      <div className="bg-red-600 px-4 pt-5 pb-16">
        <h1 className="text-white font-bold text-xl mb-4">Qarzdorlar</h1>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/15 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className="text-red-200" />
              <p className="text-red-100 text-xs font-medium">Umumiy qarz</p>
            </div>
            <p className="text-white font-bold text-lg leading-tight">
              {formatCurrency(totalDebt)}
            </p>
          </div>
          <div className="bg-white/15 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-red-200" />
              <p className="text-red-100 text-xs font-medium">Qarzdorlar</p>
            </div>
            <p className="text-white font-bold text-lg leading-tight">
              {totalCount} <span className="text-red-200 font-normal text-sm">ta</span>
            </p>
          </div>
        </div>
      </div>

      {/* Asosiy kontent */}
      <div className="flex-1 -mt-4 rounded-t-3xl bg-slate-50 px-4 pt-4 pb-28 space-y-3">

        {/* Qidiruv + Qo'shish */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ism yoki telefon..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-3 border border-slate-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-3 rounded-2xl text-sm font-semibold active:scale-95 transition-all whitespace-nowrap"
          >
            <UserPlus size={16} />
            Qo'shish
          </button>
        </div>

        {/* Ro'yxat */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-slate-100 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-28" />
                  <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
            <p className="text-4xl mb-2">{search ? '🔍' : '👤'}</p>
            <p className="text-slate-400 text-sm">
              {search ? 'Topilmadi' : 'Hali qarzdor yo\'q'}
            </p>
            {!search && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-red-600 text-sm font-semibold"
              >
                Birinchi qarzdorni qo'shish
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((debtor) => {
              const debt = Number(debtor.totalDebt)
              const isInDebt = debt > 0
              return (
                <button
                  key={debtor.id}
                  onClick={() => navigate(`/debtors/${debtor.id}`)}
                  className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-slate-100 active:scale-98 transition-all text-left"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${isInDebt ? 'bg-red-100' : 'bg-green-100'}`}>
                    <span className={`font-bold text-base ${isInDebt ? 'text-red-600' : 'text-green-600'}`}>
                      {debtor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-sm">{debtor.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {debtor.phone ? (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone size={10} />{debtor.phone}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">{fmtDate(debtor.createdAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <p className={`font-bold text-sm ${isInDebt ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(debt)}
                    </p>
                    <ChevronRight size={15} className="text-slate-300" />
                  </div>
                </button>
              )
            })}

            {filtered.length > 1 && (
              <div className="bg-slate-100 rounded-2xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">
                  {filtered.length} ta qarzdor jami
                </span>
                <span className="font-bold text-red-600">
                  {formatCurrency(filtered.reduce((s, d) => s + Number(d.totalDebt), 0))}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom sheet modal — keyboard-aware */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={closeForm}
        >
          <div
            className="absolute left-0 right-0 bg-white rounded-t-3xl"
            style={{ bottom: keyboardHeight }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Scroll qilinadigan kontent */}
            <div
              className="overflow-y-auto px-5 pb-8"
              style={{ maxHeight: `calc(90dvh - ${keyboardHeight}px)` }}
            >
              {/* Sarlavha */}
              <div className="flex items-center justify-between py-3">
                <h3 className="font-bold text-lg text-slate-800">Yangi qarzdor</h3>
                <button
                  onClick={closeForm}
                  className="p-1.5 text-slate-400 rounded-xl hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 pb-2">
                {/* Ismi */}
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

                {/* Qarz summasi */}
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

                {/* Sana + Telefon */}
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

                {/* Izoh */}
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

                {/* Saqlash tugmasi */}
                <button
                  disabled={!name.trim() || !amount || Number(amount) <= 0 || createWithDebt.isPending}
                  onClick={() => createWithDebt.mutate()}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-semibold disabled:opacity-50 active:scale-98 transition-all"
                >
                  {createWithDebt.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
