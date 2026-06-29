import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '../../api/sales'
import { productsApi } from '../../api/products'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import { formatCurrency, formatDate, cn } from '../../lib/utils'
import { Search, Trash2, ShoppingCart, History, Printer, X, ChevronLeft } from 'lucide-react'
import { printViaAgent } from '../../lib/printViaAgent'

type View = 'pos' | 'history'
type MobileTab = 'search' | 'cart'

const paymentLabels: Record<string, string> = {
  CASH: 'Naqd', CARD: 'Karta', TRANSFER: "O'tkazma", INSTALLMENT: 'Muddatli',
}

interface CartItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
}

interface SaleProduct { id: string; name: string; sellPrice: number; stock: number }
interface HistorySale {
  id: string; receiptNo: number; totalAmount: number; createdAt: string
  paymentMethod: string; customerName?: string
  user?: { name: string }; items?: unknown[]
}

export default function SalesPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<View>('pos')
  const [mobileTab, setMobileTab] = useState<MobileTab>('search')

  // POS state
  const [cart, setCart] = useState<CartItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')

  // History filters
  const [dateFilter, setDateFilter] = useState('')
  const [receiptFilter, setReceiptFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: products = [] } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.getAll({ search: productSearch || undefined }),
  })

  const { data: sales = [], isLoading: historyLoading } = useQuery({
    queryKey: ['sales', dateFilter, receiptFilter, paymentFilter],
    queryFn: () => salesApi.getAll({
      date: dateFilter || undefined,
      receiptNo: receiptFilter || undefined,
      paymentMethod: paymentFilter || undefined,
    }),
    enabled: view === 'history',
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createSale = useMutation({
    mutationFn: salesApi.create,
    onSuccess: (sale) => {
      printViaAgent(sale)
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setCart([])
      setProductSearch('')
      setMobileTab('search')
    },
  })

  const reprint = useMutation({
    mutationFn: (saleId: string) => salesApi.getOne(saleId),
    onSuccess: (sale) => printViaAgent(sale),
  })

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const addToCart = (product: SaleProduct) => {
    setCart(prev => {
      const exists = prev.find(i => i.productId === product.id)
      if (exists) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: Number(product.sellPrice) }]
    })
    setProductSearch('')
    setMobileTab('cart')
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.productId !== productId))
    else setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i))
  }

  const clearFilters = () => { setDateFilter(''); setReceiptFilter(''); setPaymentFilter('') }

  const total = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  const handleCheckout = () => {
    if (!cart.length || total <= 0) return
    createSale.mutate({
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      paymentMethod,
    })
  }

  // ── HISTORY VIEW ───────────────────────────────────────────────────────────
  if (view === 'history') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('pos')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Sotuvlar tarixi</h1>
        </div>

        {/* Filters */}
        <Card padding={false} className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sana</label>
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="h-9 w-full px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Chek #</label>
              <input
                type="number"
                value={receiptFilter}
                onChange={e => setReceiptFilter(e.target.value)}
                placeholder="1234"
                className="h-9 w-full px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To'lov turi</label>
              <select
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
                className="h-9 w-full px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Barchasi</option>
                {Object.entries(paymentLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {(dateFilter || receiptFilter || paymentFilter) && (
              <button
                onClick={clearFilters}
                className="h-9 px-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X size={14} /> Tozalash
              </button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Chek</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Sana</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Kassir</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Mijoz</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Tovar</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">To'lov</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Summa</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyLoading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">Yuklanmoqda...</td></tr>
                ) : sales.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">Sotuvlar topilmadi</td></tr>
                ) : (
                  (sales as HistorySale[]).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                          #{String(sale.receiptNo).padStart(4, '0')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs hidden sm:table-cell">{sale.user?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 hidden md:table-cell">{sale.customerName || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{sale.items?.length} ta</td>
                      <td className="px-4 py-3">
                        <Badge variant="blue">{paymentLabels[sale.paymentMethod]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => reprint.mutate(sale.id)}
                          disabled={reprint.isPending}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chekni qayta chiqarish"
                        >
                          <Printer size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  // ── POS VIEW ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-800">Sotuv</h1>
        <Button variant="outline" size="sm" onClick={() => setView('history')}>
          <History size={15} /> Tarix
        </Button>
      </div>

      {/* Mobile tabs */}
      <div className="flex lg:hidden shrink-0 border-b border-slate-200">
        <button
          onClick={() => setMobileTab('search')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            mobileTab === 'search'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500',
          )}
        >
          Tovar qidirish
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center justify-center gap-1.5',
            mobileTab === 'cart'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500',
          )}
        >
          Savat
          {cart.length > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* LEFT — Tovarlar */}
        <Card className={cn('flex flex-col overflow-hidden p-4', mobileTab !== 'search' && 'hidden lg:flex')}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">Tovarlar</p>
            <span className="text-xs text-slate-400">{(products as SaleProduct[]).length} ta</span>
          </div>
          <Input
            placeholder="Qidirish..."
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            leftIcon={<Search size={15} />}
            autoFocus
          />
          <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 min-h-0">
            {products.length === 0 && (
              <p className="text-center py-8 text-sm text-slate-400">Tovar topilmadi</p>
            )}
            {(products as SaleProduct[]).map(p => {
              const stock = Number(p.stock)
              const outOfStock = stock <= 0
              const lowStock = stock > 0 && stock <= 5
              return (
                <button
                  key={p.id}
                  onClick={() => !outOfStock && addToCart(p)}
                  disabled={outOfStock}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg border transition-colors',
                    outOfStock
                      ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                      : lowStock
                        ? 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                        : 'bg-white border-slate-100 hover:bg-blue-50 hover:border-blue-200',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      outOfStock ? 'text-slate-400' : 'text-slate-800',
                    )}>
                      {p.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {outOfStock ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                          Tugagan
                        </span>
                      ) : lowStock ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                          ⚠ Kam: {stock} ta
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{stock} ta</span>
                      )}
                      {p.barcode && (
                        <span className="text-xs text-slate-300">· {p.barcode}</span>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    'text-sm font-bold ml-3 shrink-0',
                    outOfStock ? 'text-slate-400' : 'text-blue-600',
                  )}>
                    {formatCurrency(p.sellPrice)}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* RIGHT — Savat + Checkout */}
        <Card className={cn('flex flex-col overflow-hidden p-4', mobileTab !== 'cart' && 'hidden lg:flex')}>
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <ShoppingCart size={16} />
            Savat
            {cart.length > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {cart.length}
              </span>
            )}
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Tozalash
              </button>
            )}
          </p>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 mb-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                <ShoppingCart size={36} strokeWidth={1.5} />
                <p className="text-sm">Savat bo'sh</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.productId} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatCurrency(item.unitPrice)} × {item.quantity}{' '}
                      = <span className="font-semibold text-slate-700">{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold flex items-center justify-center transition-colors"
                    >+</button>
                    <button onClick={() => updateQty(item.productId, 0)} className="ml-0.5 p-1 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout section */}
          <div className="border-t border-slate-200 pt-3 space-y-2.5 shrink-0">
            <Select
              label="To'lov turi"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              options={Object.entries(paymentLabels).map(([v, l]) => ({ value: v, label: l }))}
            />

            {/* Total */}
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex justify-between font-bold text-base text-slate-800">
                <span>To'lash:</span>
                <span className="text-emerald-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {createSale.isSuccess && (
              <div className="text-center text-sm text-emerald-600 font-medium py-1">
                ✓ Sotuv saqlandi, chek chiqarilmoqda...
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={!cart.length || total <= 0}
              loading={createSale.isPending}
            >
              Sotuvni yakunlash
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
