import { useState, useEffect } from 'react'
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'
import { AssociationProvider, useAssociation } from '@/features/association/AssociationContext'
import { SecteurProvider } from '@/features/calendriers/SecteurContext'
import { MenuPermissionsProvider } from '@/features/auth/MenuPermissionsContext'
import { OnboardingChoicePage } from '@/features/association/OnboardingChoicePage'
import { supabase } from '@/lib/supabase'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SubNav } from './SubNav'

function AppShellContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  const [profileChecked, setProfileChecked] = useState(false)
  const { currentAssociation, associations, loading: assocLoading } = useAssociation()
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Vérifie si l'utilisateur a déjà une fiche amicaliste liée à son compte
  useEffect(() => {
    if (!user || !currentAssociation || assocLoading || location.pathname === '/profil/completer') {
      setProfileChecked(true)
      return
    }
    supabase
      .from('amicalistes')
      .select('id')
      .eq('association_id', currentAssociation.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) navigate('/profil/completer', { replace: true })
        setProfileChecked(true)
      })
  }, [user, currentAssociation, assocLoading])

  const marginLeft = isDesktop ? (sidebarCollapsed ? '4rem' : '15rem') : '0'

  // Onboarding : aucune association existante → aiguillage
  if (!assocLoading && associations.length === 0) {
    return <OnboardingChoicePage />
  }

  // Chargement des associations ou vérification du profil
  if (assocLoading || !profileChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Content area — offset dynamique selon l'état de la sidebar */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300 pb-16 md:pb-0"
        style={{ marginLeft }}
      >
        <Header
          associationName={currentAssociation?.name || 'Mon Amicale'}
          logoUrl={currentAssociation?.logo_url}
        />
        <SubNav />

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function AppShell() {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
          <p className="text-sm text-[var(--color-text-muted)]">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <AssociationProvider>
      <MenuPermissionsProvider>
        <SecteurProvider>
          <AppShellContent />
        </SecteurProvider>
      </MenuPermissionsProvider>
    </AssociationProvider>
  )
}
