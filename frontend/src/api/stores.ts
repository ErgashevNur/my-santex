import api from './axios'

export const storesApi = {
  getAll: () => api.get('/stores').then(r => r.data),
  getOne: (id: string) => api.get(`/stores/${id}`).then(r => r.data),
  create: (data: any) => api.post('/stores', data).then(r => r.data),
  getDashboard: () => api.get('/stores/dashboard').then(r => r.data),
  updateSubscription: (id: string, data: any) =>
    api.patch(`/stores/${id}/subscription`, data).then(r => r.data),
  addPayment: (id: string, data: any) =>
    api.post(`/stores/${id}/payments`, data).then(r => r.data),
}
