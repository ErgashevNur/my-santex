import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { debtorsApi } from '../../api/debtors'
import { formatCurrency } from '../../lib/utils'
import { ArrowLeft, Plus, Minus, Trash2, Phone, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight'

type Modal = 'debt' | 'payment' | null

function fmtDate(iso: string) {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return { date: `${day}.${month}.${year}`, time: `${h}:${m}` }
}

export default function DebtorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [modal, setModal] = useState<Modal>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const keyboardHeight = useKeyboardHeight()

  const { data: debtor, isLoading } = useQuery({
    queryKey: ['debtor', id],
    queryFn: () => debtorsApi.getOne(id!),
    enabled: !!id,
  })

  const addDebt = useMutation({
    mutationFn: (data: { amount: number; note?: string }) => debtorsApi.addDebt(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debtor', id] })
      qc.invalidateQueries({ queryKey: ['debtors'] })
      qc.invalidateQueries({ queryKey: ['debtors-summary'] })
      closeModal()
    },
  })

  const addPayment = useMutation({
    mutationFn: (data: { amount: number; note?: string }) => debtorsApi.addPayment(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debtor', id] })
      qc.invalidateQueries({ queryKey: ['debtors'] })
      qc.invalidateQueries({ queryKey: ['debtors-summary'] })
      closeModal()
    },
  })

  const deleteDebtor = useMutation({
    mutationFn: () => debtorsApi.delete(id!),
    onSuccess: () => navigate('/debtors'),
  })

  const closeModal = () => { setModal(null); setAmount(''); setNote('') }

  const handleSubmit = () => {
    const n = Number(amount)
    if (!n || n <= 0) return
    if (modal === 'debt') addDebt.mutate({ amount: n, note: note || undefined })
    else if (modal === 'payment') addPayment.mutate({ amount: n, note: note || undefined })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <div className="bg-red-600 px-4 pt-5 pb-20 animate-pulse">
          <div className="h-6 w-32 bg-white/20 rounded-lg mb-4" />
          <div className="flex gap-3 items-center">
            <div className="w-14 h-14 rounded-full bg-white/20" />
            <div className="space-y-2">
              <div className="h-4 w-28 bg-white/20 rounded" />
              <div className="h-3 w-20 bg-white/20 rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 -mt-4 rounded-t-3xl bg-slate-50 px-4 pt-5 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-4 w-24 bg-slate-100 rounded mb-2" />
              <div className="h-5 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!debtor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-slate-400">
        <p>Topilmadi</p>
        <button onClick={() => navigate('/debtors')} className="text-red-600 font-medium text-sm">
          Orqaga
        </button>
      </div>
    )
  }

  const totalDebt = Number(debtor.totalDebt)
  const isInDebt = totalDebt > 0
  const initials = debtor.name.charAt(0).toUpperCase()
  const debtTxCount = debtor.transactions.filter(t => t.type === 'DEBT').length
  const paymentTxCount = debtor.transactions.filter(t => t.type === 'PAYMENT').length

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      {/* Qizil header */}
      <div className="bg-red-600 px-4 pt-5 pb-16">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate('/debtors')}
            className="p-2 rounded-xl bg-white/15 active:bg-white/25 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <button
            onClick={() => { if (confirm('Qarzdorni o\'chirish?')) deleteDebtor.mutate() }}
            className="p-2 rounded-xl bg-white/15 active:bg-white/25 transition-colors"
          >
            <Trash2 size={18} className="text-white" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border-2 border-white/30">
            <span className="text-white font-bold text-2xl">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight truncate">{debtor.name}</h1>
            {debtor.phone ? (
              <a
                href={`tel:${debtor.phone}`}
                className="flex items-center gap-1.5 mt-1 text-red-100 text-sm active:text-white"
                onClick={e => e.stopPropagation()}
              >
                <Phone size={13} />
                {debtor.phone}
              </a>
            ) : (
              <p className="text-red-200 text-sm mt-1">Telefon yo'q</p>
            )}
          </div>
        </div>
      </div>

      {/* Asosiy kontent */}
      <div className="flex-1 -mt-4 rounded-t-3xl bg-slate-50 px-4 pt-4 pb-36 space-y-3">

        {/* Qarz summasi */}
        <div className={`rounded-2xl p-4 border ${isInDebt ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          <p className={`text-xs font-semibold mb-1 ${isInDebt ? 'text-red-400' : 'text-green-500'}`}>
            {isInDebt ? 'JORIY QARZ' : 'QARZ YO\'Q'}
          </p>
          <p className={`text-3xl font-bold ${isInDebt ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(totalDebt)}
          </p>
          <div className="flex gap-4 mt-3 pt-3 border-t border-dashed" style={{ borderColor: isInDebt ? '#fca5a5' : '#86efac' }}>
            <div className="flex items-center gap-1.5">
              <TrendingDown size={14} className="text-red-400" />
              <span className="text-xs text-slate-500">{debtTxCount} ta qarz</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-green-500" />
              <span className="text-xs text-slate-500">{paymentTxCount} ta to'lov</span>
            </div>
          </div>
        </div>

        {/* Tarixi */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
            Kirdi-chiqdi tarixi
          </h2>
          {debtor.transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
              <p className="text-slate-300 text-4xl mb-2">📋</p>
              <p className="text-slate-400 text-sm">Hali amal yo'q</p>
            </div>
          ) : (
            <div className="space-y-2">
              {debtor.transactions.map(tx => {
                const isDebt = tx.type === 'DEBT'
                const { date, time } = fmtDate(tx.createdAt)
                return (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border ${isDebt ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDebt ? 'bg-red-100' : 'bg-green-100'}`}>
                      {isDebt
                        ? <TrendingDown size={16} className="text-red-500" />
                        : <TrendingUp size={16} className="text-green-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${isDebt ? 'text-red-500' : 'text-green-600'}`}>
                        {isDebt ? 'Qarz berildi' : 'To\'lov qilindi'}
                      </p>
                      {tx.note && <p className="text-sm text-slate-600 truncate mt-0.5">{tx.note}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">{date} · {time}</p>
                    </div>
                    <p className={`font-bold text-base flex-shrink-0 ${isDebt ? 'text-red-600' : 'text-green-600'}`}>
                      {isDebt ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom tugmalar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-4 pt-3 pb-20 flex gap-3">
        <button
          onClick={() => setModal('debt')}
          className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3.5 rounded-2xl font-semibold active:scale-95 transition-all"
        >
          <Plus size={18} />
          Qarz qo'shish
        </button>
        <button
          onClick={() => setModal('payment')}
          disabled={totalDebt <= 0}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 rounded-2xl font-semibold active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus size={18} />
          To'lov qabul
        </button>
      </div>

      {/* Bottom sheet modal — keyboard-aware */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={closeModal}
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
              style={{ maxHeight: `calc(85dvh - ${keyboardHeight}px)` }}
            >
              {/* Sarlavha */}
              <div className="flex items-center justify-between py-3">
                <h3 className="font-bold text-lg text-slate-800">
                  {modal === 'debt' ? 'Qarz qo\'shish' : 'To\'lov qabul qilish'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1.5 text-slate-400 rounded-xl hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 pb-2">
                {/* Summa */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    SUMMA (SO'M) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50"
                    autoFocus
                  />
                </div>

                {/* Izoh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    IZOH (IXTIYORIY)
                  </label>
                  <input
                    type="text"
                    placeholder="Nima uchun?"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50"
                  />
                </div>

                {/* Tugmalar */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-slate-600 font-medium active:bg-slate-50"
                  >
                    Bekor
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!amount || Number(amount) <= 0 || addDebt.isPending || addPayment.isPending}
                    className={`flex-1 py-3.5 rounded-2xl text-white font-semibold disabled:opacity-50 active:scale-95 transition-all ${modal === 'debt' ? 'bg-red-600' : 'bg-green-600'}`}
                  >
                    {addDebt.isPending || addPayment.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
