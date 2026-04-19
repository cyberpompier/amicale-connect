import { NavLink, useLocation } from 'react-router-dom'
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mainNavItems, settingsNavItem } from '@/app/navigation'

const MOBILE_LABELS: Record<string, string> = {
  'Dashboard': 'Accueil',
  'Amicalistes': 'Membres',
  'Livre de compte': 'Compta',
  'Bureau': 'Bureau',
  'Événements': 'Agenda',
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-[var(--color-sidebar)] text-white flex-col z-40 transition-all duration-300 hidden md:flex',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-14 border-b border-white/10 flex-shrink-0',
          collapsed ? 'px-0 justify-center' : 'px-4'
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-sm truncate text-white">Amicale Connect</span>
            )}
          </div>
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
                isActive(item.path)
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bas : Paramètres + bouton réduire */}
        <div className="px-2 pb-3 border-t border-white/10 pt-3 space-y-0.5">
          <NavLink
            to={settingsNavItem.path}
            title={collapsed ? settingsNavItem.label : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
              collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
              isActive(settingsNavItem.path)
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <settingsNavItem.icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
            {!collapsed && <span className="truncate">{settingsNavItem.label}</span>}
          </NavLink>

          <button
            onClick={onToggle}
            className={cn(
              'flex items-center gap-3 rounded-lg text-sm font-medium text-gray-500 hover:bg-white/5 hover:text-white transition-colors w-full',
              collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
            )}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
              : <><ChevronLeft className="w-4 h-4 flex-shrink-0" /><span>Réduire</span></>
            }
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] z-50 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-stretch h-14">
          {mainNavItems.map((item) => {
            const active = isActive(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              >
                <item.icon className={cn(
                  'w-5 h-5 transition-colors',
                  active ? 'text-[var(--color-primary)]' : 'text-gray-400'
                )} />
                <span className={cn(
                  'text-[10px] font-medium leading-none',
                  active ? 'text-[var(--color-primary)]' : 'text-gray-400'
                )}>
                  {MOBILE_LABELS[item.label] || item.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}
