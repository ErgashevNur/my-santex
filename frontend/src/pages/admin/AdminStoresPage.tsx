import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storesApi } from '../../api/stores'
import { usersApi } from '../../api/users'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { formatDate } from '../../lib/utils'
import { Plus, Building2, Users, Package, UserPlus, Eye, EyeOff, KeyRound } from 'lucide-react'

const statusLabels: Record<string, string> = {
  ACTIVE: 'Faol', EXPIRED: 'Muddati o\'tgan', BLOCKED: 'Bloklangan', TRIAL: 'Sinov'
}
const statusVariants: Record<string, 'green' | 'red' | 'yellow'> = {
  ACTIVE: 'green', EXPIRED: 'red', BLOCKED: 'red', TRIAL: 'yellow'
}
const roleLabels: Record<string, string> = {
  ROP: 'Sotuv Boshlig\'i', SALES_MANAGER: 'Sotuvchi'
}

export default function AdminStoresPage() {
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  interface Store { id: string; name: string; email?: string; phone?: string; subscriptionStatus: string; subscriptionEndsAt?: string; _count?: { users: number; products: number } }
  interface StoreUser { id: string; name: string; role: string; isActive?: boolean }
  interface PinUser { id: string; storeId: string; pin: string }

  const [subscriptionModal, setSubscriptionModal] = useState<Store | null>(null)
  const [storeForm, setStoreForm] = useState({ name: '', address: '', phone: '', email: '' })
  const [subForm, setSubForm] = useState({ status: 'ACTIVE', subscriptionEndsAt: '' })

  const [usersStore, setUsersStore] = useState<Store | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', pin: '', phone: '', role: 'ROP' })
  const [showPins, setShowPins] = useState<Record<string, boolean>>({})

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  })

  const { data: storeUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['store-users', usersStore?.id],
    queryFn: () => usersApi.getAll(usersStore?.id),
    enabled: !!usersStore,
  })

  const { data: allPins = [] } = useQuery({
    queryKey: ['users-pins'],
    queryFn: usersApi.getAllWithPins,
    enabled: !!usersStore,
  })

  const createMutation = useMutation({
    mutationFn: storesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] })
      setCreateOpen(false)
      setStoreForm({ name: '', address: '', phone: '', email: '' })
    },
  })

  const subMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof subForm }) => storesApi.updateSubscription(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stores'] }); setSubscriptionModal(null) },
  })

  const addUserMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-users', usersStore?.id] })
      qc.invalidateQueries({ queryKey: ['stores'] })
      qc.invalidateQueries({ queryKey: ['users-pins'] })
      setAddUserOpen(false)
      setUserForm({ name: '', pin: '', phone: '', role: 'ROP' })
    },
  })

  const storePins = (allPins as PinUser[]).filter((u) => u.storeId === usersStore?.id)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Do'konlar</h1>
          <p className="text-sm text-slate-500">{stores.length} ta do'kon</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus size={15} /> Yangi do'kon
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center py-12 text-slate-400">Yuklanmoqda...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {(stores as Store[]).map((store) => (
            <Card key={store.id} padding={false} className="p-4 sm:p-5">
              {/* Karta sarlavhasi */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{store.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{store.email || store.phone || '—'}</p>
                  </div>
                </div>
                <span className="shrink-0">
                  <Badge variant={statusVariants[store.subscriptionStatus]}>
                    {statusLabels[store.subscriptionStatus]}
                  </Badge>
                </span>
              </div>

              {/* Statistika */}
              <div className="flex gap-4 text-sm text-slate-500 mb-3">
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="shrink-0" />
                  {store._count?.users} xodim
                </span>
                <span className="flex items-center gap-1.5">
                  <Package size={14} className="shrink-0" />
                  {store._count?.products} tovar
                </span>
              </div>

              {store.subscriptionEndsAt && (
                <p className="text-xs text-slate-400 mb-3">
                  Obuna: {formatDate(store.subscriptionEndsAt)}
                </p>
              )}

              {/* Tugmalar */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => setUsersStore(store)}>
                  <Users size={14} /> Xodimlar
                </Button>
                <Button size="sm" variant="secondary"
                  onClick={() => {
                    setSubscriptionModal(store)
                    setSubForm({ status: store.subscriptionStatus, subscriptionEndsAt: '' })
                  }}>
                  Obuna
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Yangi do'kon ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi do'kon qo'shish" size="sm">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(storeForm) }} className="space-y-4">
          <Input label="Do'kon nomi *" value={storeForm.name}
            onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Email" type="email" value={storeForm.email}
            onChange={e => setStoreForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Telefon" value={storeForm.phone}
            onChange={e => setStoreForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Manzil" value={storeForm.address}
            onChange={e => setStoreForm(f => ({ ...f, address: e.target.value }))} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Bekor</Button>
            <Button type="submit" loading={createMutation.isPending}>Qo'shish</Button>
          </div>
        </form>
      </Modal>

      {/* ── Obuna ── */}
      <Modal open={!!subscriptionModal} onClose={() => setSubscriptionModal(null)} title="Obuna holati" size="sm">
        <form
          onSubmit={e => { e.preventDefault(); subMutation.mutate({ id: subscriptionModal?.id, data: subForm }) }}
          className="space-y-4"
        >
          <Select label="Holat" value={subForm.status}
            onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))}
            options={[
              { value: 'ACTIVE', label: 'Faol' },
              { value: 'EXPIRED', label: 'Muddati o\'tgan' },
              { value: 'BLOCKED', label: 'Bloklash' },
              { value: 'TRIAL', label: 'Sinov' },
            ]} />
          <Input label="Obuna tugash sanasi" type="datetime-local" value={subForm.subscriptionEndsAt}
            onChange={e => setSubForm(f => ({ ...f, subscriptionEndsAt: e.target.value }))} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setSubscriptionModal(null)}>Bekor</Button>
            <Button type="submit" loading={subMutation.isPending}>Saqlash</Button>
          </div>
        </form>
      </Modal>

      {/* ── Xodimlar modali ── */}
      <Modal
        open={!!usersStore}
        onClose={() => { setUsersStore(null); setAddUserOpen(false) }}
        title={usersStore ? `"${usersStore.name}" xodimlari` : ''}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{storeUsers.length} ta xodim</p>
            <Button size="sm" onClick={() => setAddUserOpen(v => !v)}>
              <UserPlus size={14} /> Xodim qo'shish
            </Button>
          </div>

          {addUserOpen && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-3">Yangi xodim</p>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  addUserMutation.mutate({ ...userForm, storeId: usersStore?.id })
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Ism *" value={userForm.name}
                    onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} required />
                  <Input label="PIN * (8 ta raqam)" value={userForm.pin}
                    maxLength={8} placeholder="12345678"
                    onChange={e => setUserForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 8) }))} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Telefon" value={userForm.phone}
                    onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} />
                  <Select label="Rol" value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                    options={[
                      { value: 'ROP', label: 'Sotuv Boshlig\'i (ROP)' },
                      { value: 'SALES_MANAGER', label: 'Sotuvchi' },
                    ]} />
                </div>
                {addUserMutation.error && (
                  <p className="text-xs text-red-600">
                    {(addUserMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xato yuz berdi'}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setAddUserOpen(false)}>Bekor</Button>
                  <Button size="sm" type="submit" loading={addUserMutation.isPending}>Saqlash</Button>
                </div>
              </form>
            </div>
          )}

          {usersLoading ? (
            <p className="text-center text-slate-400 py-6">Yuklanmoqda...</p>
          ) : storeUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Hali xodim qo'shilmagan</p>
              <p className="text-xs mt-1">Yuqoridagi tugma orqali ROP qo'shing</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <KeyRound size={13} className="shrink-0" /> PIN kodlar maxfiy — faqat xodimga bering
              </p>
              {(storeUsers as StoreUser[]).map((u) => {
                const pinData = storePins.find((p) => p.id === u.id)
                return (
                  <div key={u.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">{u.name}</p>
                        <Badge variant={u.role === 'ROP' ? 'blue' : 'green'}>
                          {roleLabels[u.role] || u.role}
                        </Badge>
                      </div>
                    </div>
                    {pinData && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <code className="text-xs font-mono bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg tracking-widest">
                          {showPins[u.id] ? pinData.pin : '••••••••'}
                        </code>
                        <button
                          onClick={() => setShowPins(p => ({ ...p, [u.id]: !p[u.id] }))}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 shrink-0"
                        >
                          {showPins[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
