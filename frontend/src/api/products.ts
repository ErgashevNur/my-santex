import api from './axios'

export const productsApi = {
  getAll: (params?: { search?: string; categoryId?: string; lowStock?: string }) =>
    api.get('/products', { params }).then(r => r.data),

  getByBarcode: (barcode: string) =>
    api.get(`/products/barcode/${barcode}`).then(r => r.data),

  create: (data: any) =>
    api.post('/products', data).then(r => r.data),

  update: (id: string, data: any) =>
    api.put(`/products/${id}`, data).then(r => r.data),

  addStock: (id: string, quantity: number) =>
    api.patch(`/products/${id}/stock`, { quantity }).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/products/${id}`).then(r => r.data),
}
