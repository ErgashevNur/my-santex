import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/auth.store'
import AppLayout from './components/layout/AppLayout'
import SplashScreen from './components/SplashScreen'
import ProtectedRoute from './components/shared/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import SetupFacePage from './pages/auth/SetupFacePage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProductsPage from './pages/products/ProductsPage'
import SalesPage from './pages/sales/SalesPage'
import UsersPage from './pages/users/UsersPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminStoresPage from './pages/admin/AdminStoresPage'
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage'
import DebtorsPage from './pages/debtors/DebtorsPage'
import DebtorDetailPage from './pages/debtors/DebtorDetailPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
})

function StoreRedirect() {
  const { user } = useAuthStore()
  if (user?.store?.storeType === 'DEBT') return <Navigate to="/debtors" replace />
  return <Navigate to="/dashboard" replace />
}

function AppContent() {
  const { loadUser, logout } = useAuthStore()

  useEffect(() => {
    loadUser()
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupFacePage />} />

        {/* Store routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StoreRedirect />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="users" element={
            <ProtectedRoute roles={['ROP', 'SUPER_ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          } />
          <Route path="debtors" element={<DebtorsPage />} />
          <Route path="debtors/:id" element={<DebtorDetailPage />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="stores" element={<AdminStoresPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem('splashShown'),
  )

  const handleSplashDone = () => {
    sessionStorage.setItem('splashShown', '1')
    setShowSplash(false)
  }

  return (
    <QueryClientProvider client={queryClient}>
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <AppContent />
    </QueryClientProvider>
  )
}
