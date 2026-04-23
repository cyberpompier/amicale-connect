import { useState, type FormEvent } from 'react'
import { Building2, User, Lock, LogOut, Save, CheckCircle2, AlertCircle, Eye, EyeOff, Image } from 'lucide-react'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'

export function ParametresPage() {
  const { currentAssociation, refetch } = useAssociation()
  const { user, signOut } = useAuthContext()

  // --- Association ---
  const [assocName, setAssocName] = useState(currentAssociation?.name || '')
  const [logoUrl, setLogoUrl] = useState(currentAssociation?.logo_url || '')
  const [logoPreview, setLogoPreview] = useState(currentAssociation?.logo_url || '')
  const [savingAssoc, setSavingAssoc] = useState(false)
  const [assocSuccess, setAssocSuccess] = useState(false)
  const [assocError, setAssocError] = useState('')

  // --- Mot de passe ---
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const handleSaveAssociation = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentAssociation) return
    setAssocError('')
    setAssocSuccess(false)
    setSavingAssoc(true)
    const { error } = await supabase
      .from('associations')
      .update({
        name: assocName.trim(),
        logo_url: logoUrl.trim() || null,
      })
      .eq('id', currentAssociation.id)
    if (error) {
      setAssocError(error.message)
    } else {
      setAssocSuccess(true)
      refetch()
      setTimeout(() => setAssocSuccess(false), 3000)
    }
    setSavingAssoc(false)
  }

  const handleLogoUrlChange = (url: string) => {
    setLogoUrl(url)
    if (url.trim()) {
      setLogoPreview(url)
    } else {
      setLogoPreview('')
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess(false)
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError('Les mots de passe ne correspondent pas.')
      return
    }
    if (pwdForm.next.length < 8) {
      setPwdError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: pwdForm.next })
    if (error) {
      setPwdError(error.message)
    } else {
      setPwdSuccess(true)
      setPwdForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwdSuccess(false), 3000)
    }
    setSavingPwd(false)
  }

  const handleSignOut = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return
    await signOut()
  }

  return (
    <div>
      <PageHeader
        title="Paramètres"
        subtitle="Gérez votre association et votre compte"
      />

      <div className="max-w-2xl space-y-6">

        {/* === ASSOCIATION === */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Association</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Informations de votre amicale</p>
            </div>
          </div>
          <form onSubmit={handleSaveAssociation} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Nom de l'association
              </label>
              <input
                type="text"
                required
                value={assocName}
                onChange={(e) => setAssocName(e.target.value)}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Logo (URL)
              </label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => handleLogoUrlChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                URL du logo (PNG, JPG, SVG) — utilisé dans les reçus PDF
              </p>
              {logoPreview && (
                <div className="mt-3 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">
                    Aperçu du logo :
                  </p>
                  <div className="flex justify-center">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-16 object-contain"
                      onError={() => {
                        console.warn('Logo image failed to load')
                        setLogoPreview('')
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Statut de l'abonnement
              </label>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  currentAssociation?.subscription_status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : currentAssociation?.subscription_status === 'trialing'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    currentAssociation?.subscription_status === 'active'
                      ? 'bg-green-500'
                      : currentAssociation?.subscription_status === 'trialing'
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                  }`} />
                  {currentAssociation?.subscription_status === 'active' ? 'Actif'
                    : currentAssociation?.subscription_status === 'trialing' ? 'Période d\'essai'
                    : currentAssociation?.subscription_status || 'Gratuit'}
                </span>
              </div>
            </div>

            {assocError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {assocError}
              </div>
            )}
            {assocSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Association mise à jour avec succès !
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingAssoc}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingAssoc ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </section>

        {/* === MON COMPTE === */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Mon compte</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Vos informations personnelles</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Adresse email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">L'email ne peut pas être modifié ici.</p>
            </div>
          </div>
        </section>

        {/* === CHANGER MOT DE PASSE === */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Lock className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Mot de passe</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Modifier votre mot de passe</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={pwdForm.next}
                  onChange={(e) => setPwdForm((p) => ({ ...p, next: e.target.value }))}
                  placeholder="8 caractères minimum"
                  className="w-full px-3 py-2.5 pr-10 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Répéter le mot de passe"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>

            {pwdError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {pwdError}
              </div>
            )}
            {pwdSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Mot de passe modifié avec succès !
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPwd}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {savingPwd ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </section>

        {/* === DÉCONNEXION === */}
        <section className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 bg-red-50/50">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-red-700">Zone de danger</h2>
              <p className="text-xs text-red-400">Actions irréversibles</p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Vous serez redirigé vers la page de connexion après déconnexion.
            </p>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
