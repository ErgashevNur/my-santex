import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../../api/users'
import { useAuthStore } from '../../store/auth.store'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { Plus, UserCheck, UserX, Eye, EyeOff, KeyRound } from 'lucide-react'

const roleLabels: Record<string, string> = {
  ROP: 'Sotuv Boshlig\'i',
  SALES_MANAGER: 'Sotuvchi',
  SUPER_ADMIN: 'Super Admin',
}

export default function UsersPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const [modalOpen, setModalOpen] = useState(false)
  const [pinsOpen, setPinsOpen] = useState(false)
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ name: '', pin: '', phone: '', role: 'SALES_MANAGER' })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  })

  const { data: allUsers = [], isLoading: pinsLoading } = useQuery({
    queryKey: ['users-pins'],
    queryFn: usersApi.getAllWithPins,
    enabled: pinsOpen && isSuperAdmin,
  })

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      setForm({ name: '', pin: '', phone: '', role: 'SALES_MANAGER' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: usersApi.toggleActive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const togglePinVisible = (id: string) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Xodimlar</h1>
          <p className="text-sm text-slate-500">{users.length} ta xodim</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSuperAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setPinsOpen(true)}>
              <KeyRound size={15} />
              <span className="hidden sm:inline">PIN larni ko'rish</span>
            </Button>
          )}
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={15} />
            <span className="hidden xs:inline sm:inline">Xodim qo'shish</span>
            <span className="sm:hidden">Qo'shish</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="col-span-3 text-center text-slate-400 py-12">Yuklanmoqda...</p>
        ) : (
          (users as { id: string; name: string; email?: string; phone?: string; role: string; isActive: boolean; store?: { name: string } }[]).map((u) => (
            <Card key={u.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <Badge variant={u.isActive ? 'green' : 'red'}>
                  {u.isActive ? 'Faol' : 'Bloklangan'}
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-800">{u.name}</h3>
              {u.email && <p className="text-sm text-slate-500">{u.email}</p>}
              {u.phone && <p className="text-sm text-slate-400">{u.phone}</p>}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <Badge variant="blue">{roleLabels[u.role] || u.role}</Badge>
                {u.id !== user?.id && (
                  <button
                    onClick={() => toggleMutation.mutate(u.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      u.isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                    {u.isActive ? 'Bloklash' : 'Faollashtirish'}
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add user modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yangi xodim qo'shish" size="sm">
        <form
          onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }}
          className="space-y-4"
        >
          <Input
            label="Ism *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="PIN * (8 ta raqam)"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{8}"
            maxLength={8}
            placeholder="12345678"
            value={form.pin}
            onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
            required
          />
          <Input
            label="Telefon"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
          <Select
            label="Rol"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'SALES_MANAGER', label: 'Sotuvchi' },
              { value: 'ROP', label: 'Sotuv Boshlig\'i' },
            ]}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Bekor</Button>
            <Button type="submit" loading={createMutation.isPending}>Qo'shish</Button>
          </div>
        </form>
      </Modal>

      {/* PINs modal — Super Admin only */}
      <Modal open={pinsOpen} onClose={() => setPinsOpen(false)} title="Barcha foydalanuvchi PIN lari" size="md">
        {pinsLoading ? (
          <p className="text-center text-slate-400 py-8">Yuklanmoqda...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Bu ma'lumotlar maxfiy. Faqat Super Admin ko'rishi mumkin.
            </p>
            {(allUsers as { id: string; name: string; role: string; pin?: string; store?: { name: string } }[]).map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-100 bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{u.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={u.role === 'SUPER_ADMIN' ? 'red' : u.role === 'ROP' ? 'blue' : 'green'}>
                      {roleLabels[u.role]}
                    </Badge>
                    {u.store && <span className="text-xs text-slate-400 truncate">{u.store.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <code className="text-xs font-mono bg-white border border-slate-200 px-2 py-1 rounded-lg tracking-widest">
                    {visiblePins[u.id] ? u.pin : '••••••••'}
                  </code>
                  <button
                    onClick={() => togglePinVisible(u.id)}
                    className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 shrink-0"
                  >
                    {visiblePins[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
