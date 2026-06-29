import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { debtorsApi } from '../../api/debtors'
import { formatCurrency } from '../../lib/utils'
import { ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react'

type Modal = 'debt' | 'payment' | null

export default function DebtorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [modal, setModal] = useState<Modal>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const { data: debtor, isLoading } = useQuery({
    queryKey: ['debtor', id],
    queryFn: () => debtorsApi.getOne(id!),
    enabled: !!id,
  })

  const addDebt = useMutation({
    mutationFn: (data: { amount: number; note?: string }) => debtorsApi.addDebt(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debtor', id] }); qc.invalidateQueries({ queryKey: ['debtors'] }); qc.invalidateQueries({ queryKey: ['debtors-summary'] }); closeModal() },
  })

  const addPayment = useMutation({
    mutationFn: (data: { amount: number; note?: string }) => debtorsApi.addPayment(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debtor', id] }); qc.invalidateQueries({ queryKey: ['debtors'] }); qc.invalidateQueries({ queryKey: ['debtors-summary'] }); closeModal() },
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

  const fmt = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  if (isLoading) return <div className="p-4 text-center text-slate-400">Yuklanmoqda...</div>
  if (!debtor) return <div className="p-4 text-center text-slate-400">Topilmadi</div>

  const totalDebt = Number(debtor.totalDebt)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/debtors')} className="p-2 rounded-lg hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">{debtor.name}</h1>
          {debtor.phone && <p className="text-sm text-slate-400">{debtor.phone}</p>}
        </div>
        <button
          onClick={() => { if (confirm('Qarzdorni o\'chirish?')) deleteDebtor.mutate() }}
          className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Qarz holati */}
      <div className={`rounded-xl p-4 text-center ${totalDebt > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <p className="text-sm font-medium mb-1" style={{ color: totalDebt > 0 ? '#dc2626' : '#16a34a' }}>
          {totalDebt > 0 ? 'Joriy qarz' : 'Qarz yo\'q'}
        </p>
        <p className="text-3xl font-bold" style={{ color: totalDebt > 0 ? '#dc2626' : '#16a34a' }}>
          {formatCurrency(totalDebt)}
        </p>
      </div>

      {/* Tugmalar */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setModal('debt')}
          className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700"
        >
          <Plus size={18} /> Qarz qo'shish
        </button>
        <button
          onClick={() => setModal('payment')}
          disabled={totalDebt <= 0}
          className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus size={18} /> To'lov qabul
        </button>
      </div>

      {/* Tarixi */}
      <div>
        <h2 className="font-semibold text-slate-700 mb-2">Kirdi-chiqdi tarixi</h2>
        {debtor.transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Hali amal yo'q</div>
        ) : (
          <div className="space-y-2">
            {debtor.transactions.map(tx => (
              <div key={tx.id} className={`flex items-center justify-between p-3 rounded-xl border ${tx.type === 'DEBT' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <div>
                  <p className="text-xs text-slate-500">{fmt(tx.createdAt)}</p>
                  {tx.note && <p className="text-sm text-slate-600 mt-0.5">{tx.note}</p>}
                </div>
                <p className={`font-bold text-base ${tx.type === 'DEBT' ? 'text-red-600' : 'text-green-600'}`}>
                  {tx.type === 'DEBT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={closeModal}>
          <div className="w-full bg-white rounded-t-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">
              {modal === 'debt' ? 'Qarz qo\'shish' : 'To\'lov qabul qilish'}
            </h3>
            <input
              type="number"
              placeholder="Summa (so'm) *"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Izoh (ixtiyoriy)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
                Bekor
              </button>
              <button
                onClick={handleSubmit}
                disabled={!amount || Number(amount) <= 0 || addDebt.isPending || addPayment.isPending}
                className={`flex-1 py-3 rounded-xl text-white font-medium disabled:opacity-50 ${modal === 'debt' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {addDebt.isPending || addPayment.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
