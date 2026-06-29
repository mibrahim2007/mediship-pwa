import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface TopBarProps {
  title: string
  showBack?: boolean
  backTo?: string
  action?: React.ReactNode
}

export function TopBar({ title, showBack = false, backTo, action }: TopBarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const initials = user?.fullName
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U'

  const handleBack = () => {
    if (backTo) navigate(backTo)
    else navigate(-1)
  }

  return (
    <header
      className="bg-teal-600 text-white flex-shrink-0 z-30"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center gap-3 px-4 h-14">
        {showBack ? (
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-teal-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
            M
          </div>
        )}
        <h1 className="flex-1 font-semibold text-base tracking-tight truncate">{title}</h1>
        {action}
        {!showBack && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="p-1.5 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors text-teal-200 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-teal-700 border-2 border-teal-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
