import React from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-600',
  info:    'bg-blue-100 text-blue-700',
  purple:  'bg-purple-100 text-purple-700',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function statusBadge(status: string): { label: string; variant: BadgeVariant } {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    draft:      { label: 'Draft',      variant: 'default' },
    confirmed:  { label: 'Confirmed',  variant: 'info' },
    delivered:  { label: 'Delivered',  variant: 'success' },
    cancelled:  { label: 'Cancelled',  variant: 'danger' },
    received:   { label: 'Received',   variant: 'success' },
    new:        { label: 'New',        variant: 'info' },
    qualified:  { label: 'Qualified',  variant: 'purple' },
    proposition:{ label: 'Proposition',variant: 'warning' },
    won:        { label: 'Won',        variant: 'success' },
    lost:       { label: 'Lost',       variant: 'danger' },
    customer:   { label: 'Customer',   variant: 'info' },
    vendor:     { label: 'Vendor',     variant: 'purple' },
  }
  return map[status] ?? { label: status, variant: 'default' }
}
