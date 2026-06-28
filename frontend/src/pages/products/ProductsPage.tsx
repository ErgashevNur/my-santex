import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../../api/products'
import { categoriesApi } from '../../api/categories'
import { useAuthStore } from '../../store/auth.store'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { formatCurrency } from '../../lib/utils'
import { Plus, Search, Edit2, Trash2, PackagePlus, AlertTriangle } from 'lucide-react'

const unitLabels: Record<string, string> = {
  PIECE: 'dona', KG: 'kg', LITER: 'litr', METER: 'metr', BOX: 'quti', SET: 'to\'plam'
}

interface ProductForm {
  name: string; categoryId: string; unit: string;
  costPrice: string; sellPrice: string; stock: string; minStock: string; description: string;
}

const emptyForm: ProductForm = {
  name: '', categoryId: '', unit: 'PIECE',
  costPrice: '', sellPrice: '', stock: '0', minStock: '5', description: '',
}

export default function ProductsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isROP = user?.role !== 'SALES_MANAGER'
  const canAddProduct = true // barcha rollar tovar qo'sha oladi

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [lowStockFilter, setLowStockFilter] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [addQty, setAddQty] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, lowStockFilter],
    queryFn: () => productsApi.getAll({
      search: search || undefined,
      categoryId: categoryFilter || undefined,
      lowStock: lowStockFilter ? 'true' : undefined,
    }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); closeModal() },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => productsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); closeModal() },
  })
  const addStockMutation = useMutation({
    mutationFn: ({ id, quantity }: any) => productsApi.addStock(id, quantity),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setStockModalOpen(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const openCreate = () => { setEditProduct(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (p: any) => {
    setEditProduct(p)
    setForm({
      name: p.name, categoryId: p.categoryId || '',
      unit: p.unit, costPrice: String(p.costPrice), sellPrice: String(p.sellPrice),
      stock: String(p.stock), minStock: String(p.minStock), description: p.description || '',
    })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditProduct(null); setForm(emptyForm) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...form,
      costPrice: Number(form.costPrice),
      sellPrice: Number(form.sellPrice),
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      categoryId: form.categoryId || undefined,
    }
    if (editProduct) updateMutation.mutate({ id: editProduct.id, data })
    else createMutation.mutate(data)
  }

  const categoryOptions = categories.map((c: any) => ({ value: c.id, label: c.name }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tovarlar</h1>
          <p className="text-sm text-slate-500">{products.length} ta mahsulot</p>
        </div>
        {canAddProduct && (
          <Button onClick={openCreate}>
            <Plus size={16} /> Tovar qo'shish
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <Input
            placeholder="Tovar nomi bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
        <Select
          options={[{ value: '', label: 'Barcha kategoriyalar' }, ...categoryOptions]}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="w-48"
        />
        <button
          onClick={() => setLowStockFilter(f => !f)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            lowStockFilter
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle size={16} /> Kam qolganlar
        </button>
      </div>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tovar nomi</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Kategoriya</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Sotish narxi</th>
                {isROP && <th className="text-left px-4 py-3 font-medium text-slate-600">Tannarx</th>}
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ombor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Holat</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Yuklanmoqda...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Tovarlar topilmadi</td></tr>
              ) : (
                products.map((p: any) => {
                  const isLow = Number(p.stock) <= Number(p.minStock)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600">{p.category?.name || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{formatCurrency(p.sellPrice)}</td>
                      {isROP && <td className="px-4 py-3 text-slate-500">{formatCurrency(p.costPrice)}</td>}
                      <td className="px-4 py-3">
                        <span className={isLow ? 'text-red-600 font-medium' : 'text-slate-700'}>
                          {Number(p.stock)} {unitLabels[p.unit]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isLow ? 'red' : 'green'}>
                          {isLow ? 'Kam' : 'Normal'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditProduct(p); setAddQty(''); setStockModalOpen(true) }}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                              title="Zaxira qo'shish"
                            >
                              <PackagePlus size={16} />
                            </button>
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => confirm('O\'chirishni tasdiqlaysizmi?') && deleteMutation.mutate(p.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editProduct ? 'Tovarni tahrirlash' : 'Yangi tovar qo\'shish'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Tovar nomi *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <Select
              label="Kategoriya"
              options={categoryOptions}
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              placeholder="Tanlang..."
            />
            <Select
              label="O'lchov birligi"
              options={Object.entries(unitLabels).map(([v, l]) => ({ value: v, label: l }))}
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            />
            <Input label="Tannarx (so'm) *" type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} required />
            <Input label="Sotish narxi (so'm) *" type="number" value={form.sellPrice} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} required />
            <Input label="Ombor miqdori" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            <Input label="Minimal zaxira" type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Bekor</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editProduct ? 'Saqlash' : 'Qo\'shish'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Stock Modal */}
      <Modal open={stockModalOpen} onClose={() => setStockModalOpen(false)} title="Zaxira qo'shish" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-medium">{editProduct?.name}</span> — mavjud: {Number(editProduct?.stock)} {unitLabels[editProduct?.unit]}
          </p>
          <Input
            label="Qo'shiladigan miqdor"
            type="number"
            value={addQty}
            onChange={e => setAddQty(e.target.value)}
            placeholder="0"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setStockModalOpen(false)}>Bekor</Button>
            <Button
              loading={addStockMutation.isPending}
              onClick={() => addStockMutation.mutate({ id: editProduct?.id, quantity: Number(addQty) })}
              disabled={!addQty || Number(addQty) <= 0}
            >
              Qo'shish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
