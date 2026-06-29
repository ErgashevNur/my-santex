import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../../api/notifications'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { formatDate } from '../../lib/utils'
import { Bell, Plus, Trash2, Users, User, UsersRound } from 'lucide-react'

const targetOptions = [
  { value: 'ALL', label: "Barcha xodimlar", desc: "ROP + Sotuvchilar", icon: UsersRound },
  { value: 'ROP', label: "Do'kon boshliqlari", desc: "Faqat ROPlar", icon: User },
  { value: 'SALES_MANAGER', label: "Sotuvchilar", desc: "Faqat Sales Managerlar", icon: Users },
]

const targetBadge: Record<string, { label: string; variant: 'blue' | 'green' | 'yellow' }> = {
  ALL:           { label: 'Hammaga',          variant: 'blue' },
  ROP:           { label: "Do'kon boshlig'i", variant: 'green' },
  SALES_MANAGER: { label: 'Sotuvchi',         variant: 'yellow' },
}

export default function AdminNotificationsPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('ALL')

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notif-admin'],
    queryFn: notificationsApi.getAllForAdmin,
  })

  const create = useMutation({
    mutationFn: notificationsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-admin'] })
      setModalOpen(false)
      setTitle('')
      setBody('')
      setTarget('ALL')
    },
  })

  const remove = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-admin'] }),
  })

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return
    create.mutate({ title: title.trim(), body: body.trim(), target })
  }

  interface NotifAdmin { id: string; title: string; body: string; target: string; createdAt: string; readCount?: number }
  const items = notifications as NotifAdmin[]
  const totalSent = items.length
  const totalReads = items.reduce((s: number, n) => s + (n.readCount || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bildirishnomalar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Xodimlarga xabar yuborish</p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm" className="shrink-0">
          <Plus size={15} /> Yangi xabar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Yuborilgan', value: totalSent, color: 'text-blue-600' },
          { label: "O'qildi (jami)", value: totalReads, color: 'text-emerald-600' },
          { label: "O'qilmagan", value: totalSent > 0 ? '-' : 0, color: 'text-slate-400' },
        ].map(s => (
          <Card key={s.label} padding={false} className="text-center p-3 sm:p-5">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* List */}
      <Card padding={false}>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400">Hali xabar yuborilmagan</p>
            <button onClick={() => setModalOpen(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-700">
              Birinchi xabarni yuborish →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map(n => {
              const tb = targetBadge[n.target] ?? { label: n.target, variant: 'blue' as const }
              return (
                <div key={n.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell size={16} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                      <Badge variant={tb.variant}>{tb.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                      <span className="text-xs text-emerald-600 font-medium">
                        {n.readCount} kishi o'qidi
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => remove.mutate(n.id)}
                    disabled={remove.isPending}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="O'chirish"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yangi bildirishnoma" size="md">
        <div className="space-y-4">
          {/* Target selector */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Kimga yuborilsin?</p>
            <div className="grid grid-cols-3 gap-2">
              {targetOptions.map(opt => {
                const Icon = opt.icon
                const active = target === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTarget(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Icon size={20} className={active ? 'text-blue-600' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs font-semibold leading-tight">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <Input
            label="Sarlavha"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Xabar sarlavhasi"
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Matn</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Xabar matni..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Preview */}
          {(title || body) && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs font-medium text-slate-400 mb-1.5">Ko'rinish:</p>
              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{title || '...'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{body || '...'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              className="flex-1"
              onClick={handleSend}
              disabled={!title.trim() || !body.trim()}
              loading={create.isPending}
            >
              <Bell size={15} /> Yuborish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
