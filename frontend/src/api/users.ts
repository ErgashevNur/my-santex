import api from './axios'

export const usersApi = {
  getAll: (storeId?: string) => api.get('/users', { params: storeId ? { storeId } : {} }).then(r => r.data),
  getAllWithPins: () => api.get('/users/pins').then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/users', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data).then(r => r.data),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`).then(r => r.data),
}
