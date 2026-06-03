import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Check, Loader2, Info } from 'lucide-react'
import { useAssociation } from '@/features/association/AssociationContext'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'

// Menus disponibles dans l'application
const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', description: 'Tableau de bord principal' },
  { key: 'membres', label: 'Amicalistes', description: 'Gestion des membres' },
  { key: 'comptabilite', label: 'Livre de compte', description: 'Transactions et bilan financier' },
  { key: 'bureau', label: 'Bureau', description: 'Composition du bureau et historique' },
  { key: 'evenements', label: 'Événements', description: 'Calendrier et gestion des événements' },
  { key: 'sondages', label: 'Sondages', description: 'Création et consultation de sondages' },
  { key: 'boutique', label: 'Boutique', description: 'Vente de produits en ligne' },
  { key: 'calendriers', label: 'Calendriers', description: 'Tournées de vente de calendriers' },
]

// Profils configurables (distincts des rôles techniques admin/owner)
const ROLES = [
  {
    key: 'admin',
    label: 'Administrateur',
    description: 'Accès complet à la gestion',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  {
    key: 'bureau',
    label: 'Bureau',
    description: 'Membres du bureau de l\'amicale',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    dotColor: 'bg-purple-500',
  },
  {
    key: 'tresorier',
    label: 'Trésorier',
    description: 'Gestion financière et comptabilité',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  {
    key: 'membre',
    label: 'Membre',
    description: 'Membre simple de l\'amicale',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    dotColor: 'bg-gray-400',
  },
]

type PermissionMatrix = Record<string, Record<string, boolean>>

// Valeurs par défaut si aucune config en base
const DEFAULT_PERMISSIONS: PermissionMatrix = {
  dashboard:     { admin: true,  bureau: true,  tresorier: true,  membre: true  },
  membres:       { admin: true,  bureau: true,  tresorier: false, membre: false },
  comptabilite:  { admin: true,  bureau: false, tresorier: true,  membre: false },
  bureau:        { admin: true,  bureau: true,  tresorier: false, membre: true  },
  evenements:    { admin: true,  bureau: true,  tresorier: false, membre: true  },
  sondages:      { admin: true,  bureau: true,  tresorier: false, membre: true  },
  boutique:      { admin: true,  bureau: true,  tresorier: false, membre: true  },
  calendriers:   { admin: true,  bureau: true,  tresorier: false, membre: true  },
}

export function ParametresAccesPage() {
  const { currentAssociation } = useAssociation()
  const [permissions, setPermissions] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    if (!currentAssociation) return
    setLoading(true)

    const { data, error } = await supabase
      .from('menu_permissions')
      .select('menu_key, role, enabled')
      .eq('association_id', currentAssociation.id)

    if (!error && data && data.length > 0) {
      // Partir des defaults et appliquer les configs enregistrées
      const matrix: PermissionMatrix = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
      data.forEach((row) => {
        if (!matrix[row.menu_key]) matrix[row.menu_key] = {}
        matrix[row.menu_key][row.role] = row.enabled
      })
      setPermissions(matrix)
    }

    setLoading(false)
  }, [currentAssociation])

  useEffect(() => { fetchPermissions() }, [fetchPermissions])

  const togglePermission = async (menuKey: string, role: string) => {
    if (!currentAssociation) return

    // Admins ont toujours accès à tout — non modifiable
    if (role === 'admin') return

    const currentValue = permissions[menuKey]?.[role] ?? true
    const newValue = !currentValue

    // Optimistic update
    setPermissions((prev) => ({
      ...prev,
      [menuKey]: { ...prev[menuKey], [role]: newValue },
    }))

    setSaving(true)
    const cellKey = `${menuKey}-${role}`

    const { error } = await supabase
      .from('menu_permissions')
      .upsert(
        {
          association_id: currentAssociation.id,
          menu_key: menuKey,
          role,
          enabled: newValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'association_id,menu_key,role' }
      )

    if (error) {
      // Rollback
      setPermissions((prev) => ({
        ...prev,
        [menuKey]: { ...prev[menuKey], [role]: currentValue },
      }))
      console.error('Erreur sauvegarde permission:', error)
    } else {
      setSavedKey(cellKey)
      setTimeout(() => setSavedKey(null), 1500)
    }

    setSaving(false)
  }

  return (
    <div>
      <PageHeader
        title="Accès & Permissions"
        subtitle="Configurez les menus accessibles pour chaque profil utilisateur"
      />

      <div className="max-w-4xl space-y-5">

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Les <strong>Administrateurs</strong> ont toujours accès à tous les menus et ne peuvent pas être restreints.
            Modifiez les accès des autres profils en cliquant sur les cases.
          </p>
        </div>

        {/* Matrice des permissions */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">

            {/* En-tête colonnes (profils) */}
            <div className="grid border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              style={{ gridTemplateColumns: `1fr repeat(${ROLES.length}, minmax(90px, 110px))` }}
            >
              <div className="px-5 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                Menu
              </div>
              {ROLES.map((role) => (
                <div key={role.key} className="px-2 py-3 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${role.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${role.dotColor}`} />
                    {role.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Lignes (menus) */}
            {MENU_ITEMS.map((menu, idx) => (
              <div
                key={menu.key}
                className={`grid items-center border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-secondary)]/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                style={{ gridTemplateColumns: `1fr repeat(${ROLES.length}, minmax(90px, 110px))` }}
              >
                {/* Nom du menu */}
                <div className="px-5 py-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{menu.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{menu.description}</p>
                </div>

                {/* Cases par profil */}
                {ROLES.map((role) => {
                  const isAdmin = role.key === 'admin'
                  const enabled = isAdmin ? true : (permissions[menu.key]?.[role.key] ?? true)
                  const cellKey = `${menu.key}-${role.key}`
                  const justSaved = savedKey === cellKey

                  return (
                    <div key={role.key} className="flex items-center justify-center py-4">
                      <button
                        onClick={() => togglePermission(menu.key, role.key)}
                        disabled={isAdmin || saving}
                        title={isAdmin ? 'Les administrateurs ont toujours accès' : (enabled ? 'Cliquer pour restreindre' : 'Cliquer pour autoriser')}
                        className={`
                          w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all
                          ${isAdmin
                            ? 'bg-blue-100 border-blue-300 cursor-not-allowed opacity-70'
                            : enabled
                              ? 'bg-green-100 border-green-400 hover:bg-green-200 cursor-pointer'
                              : 'bg-gray-100 border-gray-300 hover:bg-gray-200 cursor-pointer'
                          }
                          ${justSaved ? 'scale-110' : ''}
                        `}
                      >
                        {isAdmin ? (
                          <ShieldCheck className="w-4 h-4 text-blue-500" />
                        ) : enabled ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <span className="w-3 h-0.5 bg-gray-400 rounded-full" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Légende des profils */}
        <section className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
            Description des profils
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROLES.map((role) => (
              <div key={role.key} className="flex items-start gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${role.color} whitespace-nowrap mt-0.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${role.dotColor}`} />
                  {role.label}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] leading-relaxed">{role.description}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
