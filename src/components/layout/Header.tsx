import { LogOut, ChevronDown } from 'lucide-react'
import { useAuthContext } from '@/features/auth/AuthContext'
import { useState, useRef, useEffect } from 'react'

interface HeaderProps {
  associationName: string
  logoUrl?: string | null
}

export function Header({ associationName, logoUrl }: HeaderProps) {
  const { user, signOut } = useAuthContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <header className="h-14 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-8 object-contain flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
        <span className="font-semibold text-[var(--color-text)] truncate">{associationName}</span>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <span className="text-sm font-medium text-[var(--color-text)] hidden sm:block max-w-[120px] truncate">
            {displayName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)] hidden sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-[var(--color-border)] py-1.5 z-50">
            <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
              <p className="text-sm font-semibold text-[var(--color-text)] truncate">{displayName}</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={() => { setMenuOpen(false); signOut() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
