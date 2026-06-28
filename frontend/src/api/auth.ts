import api from './axios'

export const authApi = {
  loginWithPin: (pin: string) =>
    api.post('/auth/login', { pin }).then(r => r.data),

  enrollFace: (userId: string, faceDescriptor: number[]) =>
    api.post('/auth/enroll-face', { userId, faceDescriptor }).then(r => r.data),

  verifyFace: (userId: string, faceDescriptor: number[]) =>
    api.post('/auth/face-verify', { userId, faceDescriptor }).then(r => r.data),

  getProfile: () =>
    api.get('/auth/profile').then(r => r.data),
}
