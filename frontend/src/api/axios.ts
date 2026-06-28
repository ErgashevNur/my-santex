import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Faqat Bearer token bilan yuborilgan so'rovda 401 kelsa chiqar
    // face-verify / enroll-face kabi publk endpointlar 401 qaytarsa logout kerak emas
    const hadToken = !!error.config?.headers?.Authorization
    if (error.response?.status === 401 && hadToken) {
      localStorage.removeItem('token')
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
    return Promise.reject(error)
  }
)

export default api
