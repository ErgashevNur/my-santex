import api from './axios'

export const salesApi = {
  getAll: (params?: { date?: string; userId?: string; receiptNo?: string; paymentMethod?: string }) =>
    api.get('/sales', { params }).then(r => r.data),

  getStats: () =>
    api.get('/sales/stats').then(r => r.data),

  getOne: (id: string) =>
    api.get(`/sales/${id}`).then(r => r.data),

  create: (data: Record<string, unknown>) =>
    api.post('/sales', data).then(r => r.data),

  reprint: (saleId: string) =>
    api.post(`/printer/reprint/${saleId}`).then(r => r.data),
}
