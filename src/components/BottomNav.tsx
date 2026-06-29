import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Users, Package, Truck } from 'lucide-react'

const TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales',     label: 'Sales',     icon: ShoppingCart },
  { href: '/crm',       label: 'CRM',       icon: Users },
  { href: '/stocks',    label: 'Stocks',    icon: Package },
  { href: '/purchase',  label: 'Purchase',  icon: Truck },
] as const

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="bg-white border-t border-slate-100 flex-shrink-0 z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 h-[60px]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={[
                'flex flex-col items-center justify-center gap-0.5 transition-colors duration-150',
                'focus:outline-none active:scale-95',
                active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600',
              ].join(' ')}
            >
              <Icon
                className={`h-5 w-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`}
              />
              <span className={`text-[10px] font-medium ${active ? 'text-teal-600' : 'text-slate-400'}`}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-teal-600" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
