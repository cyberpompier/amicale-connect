import { useState, useEffect, type FormEvent } from 'react'
import { Building2, User, Lock, LogOut, Save, CheckCircle2, AlertCircle, Eye, EyeOff, Upload, X, Copy, KeyRound } from 'lucide-react'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { resizeImage } from '@/lib/imageResize'
import { PageHeader } from '@/components/ui/PageHeader'

function InviteCodeBlock() {
  const { currentAssociation } = useAssociation()
  const [copied, setCopied] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  useEffect(() => {
    if (!currentAssociation) return
    supabase
      .from('associations')
      .select('invite_code')
      .eq('id', currentAssociation.id)
      .single()
      .then(({ data }) => {
        if (data?.invite_code) setInviteCode(data.invite_code)
      })
  }, [currentAssociation?.id])

  const handleCopy = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-muted)]">
        Transmettez ce code à vos membres lors de leur inscription. Ils pourront rejoindre votre amicale sans que vous ayez besoin de les ajouter manuellement.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3">
          <KeyRound className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
          <span className="font-mono text-lg font-bold tracking-widest text-[var(--color-text)]">
            {inviteCode ?? '••••••••'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          disabled={!inviteCode}
          className="flex items-center gap-2 px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        Ce code est unique à votre amicale. Ne le partagez qu'avec les personnes autorisées.
      </p>
    </div>
  )
}

export function ParametresPage() {
  const { currentAssociation, refetch } = useAssociation()
  const { user, signOut } = useAuthContext()

  // --- Association ---
  const [assocName, setAssocName] = useState(currentAssociation?.name || '')
  const [assocCity, setAssocCity] = useState(currentAssociation?.city || '')
  const [assocPostalCode, setAssocPostalCode] = useState(currentAssociation?.postal_code || '')
  const [logoUrl, setLogoUrl] = useState(currentAssociation?.logo_url || '')
  const [logoPreview, setLogoPreview] = useState(currentAssociation?.logo_url || '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [savingAssoc, setSavingAssoc] = useState(false)
  const [assocSuccess, setAssocSuccess] = useState(false)
  const [assocError, setAssocError] = useState('')

  // Resynchroniser quand currentAssociation change (après refetch)
  useEffect(() => {
    if (!currentAssociation) return
    setAssocName(currentAssociation.name || '')
    setAssocCity(currentAssociation.city || '')
    setAssocPostalCode(currentAssociation.postal_code || '')
    setLogoUrl(currentAssociation.logo_url || '')
    setLogoPreview(currentAssociation.logo_url || '')
  }, [currentAssociation?.id, currentAssociation?.logo_url])

  // --- Mot de passe ---
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const uploadLogo = async (file: File): Promise<string> => {
    const resized = await resizeImage(file, 400)
    const path = `${currentAssociation!.id}/logo.jpg`
    const { error } = await supabase.storage.from('logos').upload(path, resized, { upsert: true })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSaveAssociation = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentAssociation) return
    setAssocError('')
    setAssocSuccess(false)
    setSavingAssoc(true)
    try {
      let finalLogoUrl = logoUrl.trim() || null
      if (logoFile) {
        finalLogoUrl = await uploadLogo(logoFile)
        setLogoUrl(finalLogoUrl!)
        setLogoPreview(finalLogoUrl!)
        setLogoFile(null)
      }
      const { error } = await supabase
        .from('associations')
        .update({
          name: assocName.trim(),
          city: assocCity.trim() || null,
          postal_code: assocPostalCode.trim() || null,
          logo_url: finalLogoUrl,
        })
        .eq('id', currentAssociation.id)
      if (error) throw new Error(error.message)
      setAssocSuccess(true)
      refetch()
      setTimeout(() => setAssocSuccess(false), 3000)
    } catch (err) {
      setAssocError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
    setSavingAssoc(false)
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoUrl('')
    setLogoPreview('')
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

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Ville</label>
                <input
                  type="text"
                  placeholder="Ex : Lyon"
                  value={assocCity}
                  onChange={(e) => setAssocCity(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Code postal</label>
                <input
                  type="text"
                  placeholder="69000"
                  maxLength={5}
                  value={assocPostalCode}
                  onChange={(e) => setAssocPostalCode(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Logo</label>
              {logoPreview ? (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-16 object-contain"
                      onError={() => setLogoPreview('')}
                    />
                  </div>
                  <div className="flex flex-col gap-2 mt-1">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Changer
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoFileChange} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <label className="block w-full px-4 py-6 border-2 border-dashed border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="w-5 h-5 text-[var(--color-text-muted)]" />
                    <span className="text-sm font-medium text-[var(--color-text)]">Ajouter un logo</span>
                    <span className="text-xs text-[var(--color-text-muted)]">PNG, JPG, WebP ou SVG — max 2 Mo</span>
                  </div>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoFileChange} className="hidden" />
                </label>
              )}
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5">Utilisé dans les reçus PDF et l'en-tête de l'application.</p>
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

        {/* === CODE D'INVITATION === */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Code d'invitation</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Partagez ce code pour que vos membres rejoignent l'amicale</p>
            </div>
          </div>
          <div className="p-6">
            <InviteCodeBlock />
          </div>
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
