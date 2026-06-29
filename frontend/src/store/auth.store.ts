import { create } from 'zustand'
import { authApi } from '../api/auth'

interface User {
  id: string
  name: string
  email?: string | null
  role: 'SUPER_ADMIN' | 'ROP' | 'SALES_MANAGER'
  storeId: string | null
  store?: { id: string; name: string; subscriptionStatus: string } | null
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isInitializing: boolean
  pendingUserId: string | null
  pendingAction: 'setup' | 'verify' | null
  loginWithPin: (pin: string) => Promise<{ requireSetup?: boolean; requireFaceVerification?: boolean; userId?: string }>
  enrollFace: (userId: string, descriptor: number[]) => Promise<void>
  completeFaceLogin: (userId: string, descriptor: number[]) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isInitializing: !!localStorage.getItem('token'),
  pendingUserId: null,
  pendingAction: null,

  loginWithPin: async (pin) => {
    set({ isLoading: true })
    try {
      const result = await authApi.loginWithPin(pin)
      if (result.requireSetup) {
        set({ isLoading: false, pendingUserId: result.userId, pendingAction: 'setup' })
        return { requireSetup: true, userId: result.userId }
      }
      if (result.requireFaceVerification) {
        set({ isLoading: false, pendingUserId: result.userId, pendingAction: 'verify' })
        return { requireFaceVerification: true, userId: result.userId }
      }
      localStorage.setItem('token', result.token)
      set({ token: result.token, user: result.user, isLoading: false, isInitializing: false, pendingUserId: null, pendingAction: null })
      return {}
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  enrollFace: async (userId, descriptor) => {
    set({ isLoading: true })
    try {
      const result = await authApi.enrollFace(userId, descriptor)
      localStorage.setItem('token', result.token)
      set({ token: result.token, user: result.user, isLoading: false, isInitializing: false, pendingUserId: null, pendingAction: null })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  completeFaceLogin: async (userId, descriptor) => {
    set({ isLoading: true })
    try {
      const result = await authApi.verifyFace(userId, descriptor)
      localStorage.setItem('token', result.token)
      set({ token: result.token, user: result.user, isLoading: false, isInitializing: false, pendingUserId: null, pendingAction: null })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isInitializing: false, pendingUserId: null, pendingAction: null })
  },

  loadUser: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isInitializing: false })
      return
    }
    try {
      const user = await authApi.getProfile()
      set({ user, isInitializing: false })
    } catch (err: unknown) {
      // Faqat 401 (token yaroqsiz) bo'lganda chiqar
      // Network xatosi yoki server vaqtincha to'xtaganda chiqarmaymiz
      if ((err as { response?: { status?: number } })?.response?.status === 401) {
        localStorage.removeItem('token')
        set({ user: null, token: null, isInitializing: false })
      } else {
        // Server xatosi yoki network muammo — token saqlab qolamiz
        set({ isInitializing: false })
      }
    }
  },
}))
