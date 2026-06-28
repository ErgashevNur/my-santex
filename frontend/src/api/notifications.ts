import api from './axios'

export const notificationsApi = {
  getAll: () =>
    api.get('/notifications').then(r => r.data),

  getUnreadCount: () =>
    api.get('/notifications/unread-count').then(r => r.data),

  getAllForAdmin: () =>
    api.get('/notifications/admin').then(r => r.data),

  create: (data: { title: string; body: string; target: string }) =>
    api.post('/notifications', data).then(r => r.data),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then(r => r.data),

  markAllRead: () =>
    api.patch('/notifications/read-all/mark').then(r => r.data),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`).then(r => r.data),
}
