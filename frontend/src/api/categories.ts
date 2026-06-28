import api from './axios'

export const categoriesApi = {
  getAll: () => api.get('/categories').then(r => r.data),
  create: (data: { name: string; icon?: string }) => api.post('/categories', data).then(r => r.data),
  update: (id: string, data: { name: string; icon?: string }) => api.put(`/categories/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/categories/${id}`).then(r => r.data),
}
