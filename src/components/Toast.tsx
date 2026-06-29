import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const iconMap = {
    success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    error:   <XCircle    className="h-4 w-4 text-red-500" />,
    info:    <Info       className="h-4 w-4 text-blue-500" />,
  }

  const bgMap = {
    success: 'bg-white border-l-4 border-emerald-500',
    error:   'bg-white border-l-4 border-red-500',
    info:    'bg-white border-l-4 border-blue-500',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-[calc(3.5rem+env(safe-area-inset-top))] inset-x-0 z-50 px-4 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl shadow-lg px-4 py-3 pointer-events-auto toast-enter ${bgMap[t.type]}`}
          >
            {iconMap[t.type]}
            <p className="flex-1 text-sm text-slate-700 font-medium">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
