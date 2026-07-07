import api from './axios'

export interface Debtor {
  id: string
  name: string
  phone?: string | null
  totalDebt: number
  createdAt: string
  _count?: { transactions: number }
}

export interface DebtTransaction {
  id: string
  type: 'DEBT' | 'PAYMENT'
  amount: number
  note?: string | null
  createdAt: string
  user?: { id: string; name: string } | null
}

export interface DebtorDetail extends Debtor {
  transactions: DebtTransaction[]
}

export const debtorsApi = {
  getAll: () => api.get<Debtor[]>('/debtors').then(r => r.data),
  getSummary: () => api.get<{ _sum: { totalDebt: number }; _count: { id: number } }>('/debtors/summary').then(r => r.data),
  getOne: (id: string) => api.get<DebtorDetail>(`/debtors/${id}`).then(r => r.data),
  create: (data: { name: string; phone?: string }) => api.post<Debtor>('/debtors', data).then(r => r.data),
  update: (id: string, data: { name?: string; phone?: string }) =>
    api.patch<Debtor>(`/debtors/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/debtors/${id}`),
  addDebt: (id: string, data: { amount: number; note?: string }) =>
    api.post(`/debtors/${id}/debt`, data).then(r => r.data),
  addPayment: (id: string, data: { amount: number; note?: string }) =>
    api.post(`/debtors/${id}/payment`, data).then(r => r.data),
}
