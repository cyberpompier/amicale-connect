import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-[var(--color-text)] truncate">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
