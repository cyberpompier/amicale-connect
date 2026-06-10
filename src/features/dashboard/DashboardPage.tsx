import { DashboardBureau } from './DashboardBureau'
import { DashboardMembre } from './DashboardMembre'
import { useMenuPermissions } from '@/hooks/useMenuPermissions'

export function DashboardPage() {
  const { userRole, loading } = useMenuPermissions()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  // Bureau, Admin, Trésorier : vue de gestion
  if (['admin', 'owner', 'bureau', 'tresorier'].includes(userRole || '')) {
    return <DashboardBureau />
  }

  // Membres : vue simplifiée
  return <DashboardMembre />
}
