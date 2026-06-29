import React from 'react'

interface FABProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
  className?: string
}

export function FAB({ onClick, icon, label, className = '' }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40',
        'flex items-center gap-2 bg-teal-600 text-white shadow-lg',
        'rounded-2xl px-4 py-3.5 font-semibold text-sm',
        'active:scale-95 transition-transform duration-100',
        'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',
        className,
      ].join(' ')}
    >
      {icon ?? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      )}
      {label && <span>{label}</span>}
    </button>
  )
}
