import React from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { useOnline } from '../hooks/useOnline'
import { WifiOff } from 'lucide-react'

interface LayoutProps {
  title: string
  showBack?: boolean
  backTo?: string
  topAction?: React.ReactNode
  children: React.ReactNode
  noPadding?: boolean
}

export function Layout({ title, showBack, backTo, topAction, children, noPadding }: LayoutProps) {
  const isOnline = useOnline()

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <TopBar title={title} showBack={showBack} backTo={backTo} action={topAction} />
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-medium flex items-center gap-2 px-4 py-2 z-20">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>You're offline — showing cached data</span>
        </div>
      )}
      <main className={`flex-1 overflow-y-auto scroll-area ${noPadding ? '' : 'px-4 py-4'}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
