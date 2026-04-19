import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { mainNavItems, settingsNavItem, type SubNavItem } from '@/app/navigation'

export function SubNav() {
  const location = useLocation()

  const allItems = [...mainNavItems, settingsNavItem]
  const activeModule = allItems.find((item) => {
    if (item.path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/'
    }
    return location.pathname.startsWith(item.path)
  })

  const subItems: SubNavItem[] = activeModule?.subNav ?? []

  if (subItems.length === 0) return null

  return (
    <div className="bg-white border-b border-[var(--color-border)] px-4 md:px-6">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {subItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === activeModule?.path}
            className={({ isActive }) =>
              cn(
                'px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
