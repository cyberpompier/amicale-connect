import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'
import { mainNavItems } from '@/app/navigation'

// Valeurs par défaut si aucune config en base
const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  dashboard:    { admin: true,  bureau: true,  tresorier: true,  membre: true  },
  membres:      { admin: true,  bureau: true,  tresorier: false, membre: false },
  comptabilite: { admin: true,  bureau: false, tresorier: true,  membre: false },
  bureau:       { admin: true,  bureau: true,  tresorier: false, membre: true  },
  evenements:   { admin: true,  bureau: true,  tresorier: false, membre: true  },
  sondages:     { admin: true,  bureau: true,  tresorier: false, membre: true  },
  boutique:     { admin: true,  bureau: true,  tresorier: false, membre: true  },
  calendriers:  { admin: true,  bureau: true,  tresorier: false, membre: true  },
}

// Rôles avec accès total (pas de restriction possible)
const SUPER_ROLES = ['owner', 'admin']

export function useMenuPermissions() {
  const { user } = useAuthContext()
  const { currentAssociation } = useAssociation()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [allowedKeys, setAllowedKeys] = useState<Set<string>>(new Set(mainNavItems.map((i) => i.path.replace('/', ''))))
  const [loading, setLoading] = useState(true)

  const fetchPermissions = useCallback(async () => {
    if (!user || !currentAssociation) {
      setLoading(false)
      return
    }

    // 1. Récupérer le rôle de l'utilisateur dans l'association
    const { data: memberData } = await supabase
      .from('association_members')
      .select('role')
      .eq('association_id', currentAssociation.id)
      .eq('user_id', user.id)
      .single()

    const role = memberData?.role || 'membre'
    setUserRole(role)

    // Admins et owners : accès total sans vérification
    if (SUPER_ROLES.includes(role)) {
      setAllowedKeys(new Set(mainNavItems.map((i) => i.path.replace('/', ''))))
      setLoading(false)
      return
    }

    // 2. Charger les permissions configurées en base
    const { data: dbPerms } = await supabase
      .from('menu_permissions')
      .select('menu_key, enabled')
      .eq('association_id', currentAssociation.id)
      .eq('role', role)

    // Construire le set des clés autorisées
    const allowed = new Set<string>()

    mainNavItems.forEach((item) => {
      const key = item.path.replace('/', '')
      // Chercher d'abord en base, sinon utiliser le default
      const dbEntry = dbPerms?.find((p) => p.menu_key === key)
      const isAllowed = dbEntry !== undefined
        ? dbEntry.enabled
        : (DEFAULT_PERMISSIONS[key]?.[role] ?? true)

      if (isAllowed) allowed.add(key)
    })

    setAllowedKeys(allowed)
    setLoading(false)
  }, [user, currentAssociation])

  useEffect(() => { fetchPermissions() }, [fetchPermissions])

  const isAllowed = useCallback(
    (menuPath: string) => {
      // Extraire le premier segment : '/calendriers/secteurs' → 'calendriers'
      const key = menuPath.split('/').filter(Boolean)[0] ?? ''
      // Paramètres toujours visibles
      if (key === 'parametres') return true
      return allowedKeys.has(key)
    },
    [allowedKeys]
  )

  return { isAllowed, userRole, loading }
}
