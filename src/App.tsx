import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/Toast'
import { FullPageSpinner } from './components/ui/Spinner'
import { LoginPage }        from './pages/LoginPage'
import { DashboardPage }    from './pages/DashboardPage'
import { SalesPage }        from './pages/SalesPage'
import { SalesNewPage }     from './pages/SalesNewPage'
import { SalesDetailPage }  from './pages/SalesDetailPage'
import { CRMPage }          from './pages/CRMPage'
import { LeadNewPage }      from './pages/LeadNewPage'
import { StocksPage }       from './pages/StocksPage'
import { PurchasePage }     from './pages/PurchasePage'
import { PurchaseNewPage }  from './pages/PurchaseNewPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user)   return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user)    return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      <Route path="/"          element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      <Route path="/sales"      element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path="/sales/new"  element={<ProtectedRoute><SalesNewPage /></ProtectedRoute>} />
      <Route path="/sales/:id"  element={<ProtectedRoute><SalesDetailPage /></ProtectedRoute>} />

      <Route path="/crm"            element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
      <Route path="/crm/leads/new"  element={<ProtectedRoute><LeadNewPage /></ProtectedRoute>} />
      <Route path="/crm/contacts"   element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />

      <Route path="/stocks"     element={<ProtectedRoute><StocksPage /></ProtectedRoute>} />

      <Route path="/purchase"     element={<ProtectedRoute><PurchasePage /></ProtectedRoute>} />
      <Route path="/purchase/new" element={<ProtectedRoute><PurchaseNewPage /></ProtectedRoute>} />
      <Route path="/purchase/:id" element={<ProtectedRoute><PurchasePage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
