import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/features/auth/AuthContext'
import { useAssociation } from './AssociationContext'
import { Flame, Users, KeyRound, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// Code plateforme pour créer une nouvelle amicale (protection anti-abus)
const PLATFORM_CODE = 'POMPIERS2024'

type Mode = null | 'join' | 'create'

export function OnboardingChoicePage() {
  const { user } = useAuthContext()
  const { refetch } = useAssociation()

  const [mode, setMode] = useState<Mode>(null)
  const [joinCode, setJoinCode] = useState('')
  const [platformCode, setPlatformCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundAssoc, setFoundAssoc] = useState<{ id: string; name: string; city: string | null } | null>(null)
  const [step, setStep] = useState<'code' | 'confirm'>('code')

  // Chercher l'amicale par code d'invitation
  const handleLookupCode = async (e: FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setLoading(true)
    setError(null)

    const { data, error: lookupErr } = await supabase
      .from('associations')
      .select('id, name, city')
      .eq('invite_code', joinCode.trim().toUpperCase())
      .maybeSingle()

    setLoading(false)
    if (lookupErr || !data) {
      setError('Code invalide. Vérifiez le code fourni par votre amicale.')
      return
    }
    setFoundAssoc(data)
    setStep('confirm')
  }

  // Rejoindre l'amicale
  const handleJoin = async () => {
    if (!foundAssoc || !user) return
    setLoading(true)
    setError(null)

    const { error: memberErr } = await supabase
      .from('association_members')
      .insert({
        user_id: user.id,
        association_id: foundAssoc.id,
        role: 'member',
      })

    if (memberErr) {
      setError('Erreur lors de la connexion à l\'amicale.')
      setLoading(false)
      return
    }

    await refetch()
    // L'AppShell redirigera vers /profil/completer automatiquement
  }

  // Vérifier le code plateforme pour créer une amicale
  const handlePlatformCode = (e: FormEvent) => {
    e.preventDefault()
    if (platformCode.trim() !== PLATFORM_CODE) {
      setError('Code invalide. Contactez l\'équipe Amicale Connect.')
      return
    }
    // Passer à la création d'amicale (mode géré par le parent)
    setMode('create')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Décoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl shadow-lg mb-4">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Amicale Connect</h1>
          <p className="text-slate-400 text-sm mt-1">Bienvenue ! Comment souhaitez-vous continuer ?</p>
        </div>

        {/* Choix initial */}
        {mode === null && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-[var(--color-text)] text-center mb-2">
                Que souhaitez-vous faire ?
              </h2>

              {/* Option 1 : rejoindre */}
              <button
                onClick={() => { setMode('join'); setError(null) }}
                className="w-full flex items-center gap-4 p-4 border-2 border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all text-left group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--color-text)]">Je rejoins une amicale</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                    J'ai reçu un code d'invitation de mon amicale
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
              </button>

              {/* Option 2 : créer */}
              <button
                onClick={() => { setMode('create'); setError(null) }}
                className="w-full flex items-center gap-4 p-4 border-2 border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all text-left group"
              >
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
                  <Flame className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--color-text)]">Je crée mon amicale</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                    Je suis administrateur et je configure une nouvelle amicale
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* Rejoindre avec code */}
        {mode === 'join' && step === 'code' && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1 bg-[var(--color-primary)]" />
            <form onSubmit={handleLookupCode} className="p-6 space-y-5">
              <div>
                <button type="button" onClick={() => { setMode(null); setError(null) }}
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-3 flex items-center gap-1">
                  ← Retour
                </button>
                <h2 className="text-lg font-bold text-[var(--color-text)]">Rejoindre une amicale</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Entrez le code d'invitation fourni par votre amicale (8 caractères).
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
                  Code d'invitation
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="ex: 75C8F684"
                    className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-xl text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <button type="submit" disabled={loading || joinCode.length < 4}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Recherche...</> : <>Valider le code <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        )}

        {/* Confirmation rejoindre */}
        {mode === 'join' && step === 'confirm' && foundAssoc && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1 bg-green-500" />
            <div className="p-6 space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text)]">Amicale trouvée !</h2>
              </div>

              <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 text-center">
                <p className="font-bold text-[var(--color-text)] text-lg">{foundAssoc.name}</p>
                {foundAssoc.city && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{foundAssoc.city}</p>}
              </div>

              <p className="text-sm text-[var(--color-text-muted)] text-center">
                Vous allez rejoindre cette amicale en tant que membre. Vous pourrez ensuite compléter votre profil.
              </p>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep('code'); setFoundAssoc(null); setError(null) }}
                  className="px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm font-semibold text-[var(--color-text-muted)] hover:bg-gray-50 transition-colors">
                  Retour
                </button>
                <button onClick={handleJoin} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</> : <>Rejoindre l'amicale <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Créer une amicale : code admin requis */}
        {mode === 'create' && (
          <CreateAmicaleGate onBack={() => { setMode(null); setError(null) }} onUnlocked={() => {}} />
        )}
      </div>
    </div>
  )
}

// Composant séparé pour la création (gate + formulaire existant)
function CreateAmicaleGate({ onBack, onUnlocked }: { onBack: () => void; onUnlocked: () => void }) {
  const { user } = useAuthContext()
  const { refetch } = useAssociation()
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', postal_code: '', address: '', phone: '', email: '' })

  const handleCodeSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim() !== PLATFORM_CODE) {
      setError('Code invalide. Contactez l\'équipe Amicale Connect pour obtenir ce code.')
      return
    }
    setUnlocked(true)
    setError(null)
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !user) return
    setLoading(true)
    setError(null)

    try {
      const { data: assoc, error: assocErr } = await supabase
        .from('associations')
        .insert({
          name: form.name.trim(),
          city: form.city.trim() || null,
          postal_code: form.postal_code.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          subscription_status: 'trialing',
        })
        .select('id')
        .single()

      if (assocErr) throw new Error(assocErr.message)

      const { error: memberErr } = await supabase
        .from('association_members')
        .insert({ user_id: user.id, association_id: assoc.id, role: 'owner' })

      if (memberErr) throw new Error(memberErr.message)

      await refetch()
      onUnlocked()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setLoading(false)
    }
  }

  // Gate : saisie du code admin
  if (!unlocked) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-[var(--color-primary)]" />
        <form onSubmit={handleCodeSubmit} className="p-6 space-y-5">
          <div>
            <button type="button" onClick={onBack}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-3 flex items-center gap-1">
              ← Retour
            </button>
            <h2 className="text-lg font-bold text-[var(--color-text)]">Créer une amicale</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              La création d'une amicale nécessite un code d'activation fourni par l'équipe Amicale Connect.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Code d'activation</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input type="text" required autoFocus value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Code fourni par Amicale Connect"
                className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-xl text-sm transition-colors">
            Valider <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-[var(--color-text-muted)]">
            Vous n'avez pas de code ? Contactez-nous sur{' '}
            <a href="mailto:contact@amicaleconnect.fr" className="text-[var(--color-primary)] hover:underline">
              contact@amicaleconnect.fr
            </a>
          </p>
        </form>
      </div>
    )
  }

  // Formulaire de création (2 étapes)
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex">
        <div className={`h-1 flex-1 transition-colors ${step >= 1 ? 'bg-[var(--color-primary)]' : 'bg-gray-100'}`} />
        <div className={`h-1 flex-1 transition-colors ${step >= 2 ? 'bg-[var(--color-primary)]' : 'bg-gray-100'}`} />
      </div>
      <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if (form.name.trim()) setStep(2) } : handleCreate}
        className="p-6 space-y-4">

        {step === 1 && (
          <>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text)]">Votre amicale</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Étape 1/2 — Donnez un nom à votre amicale</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Nom de l'amicale *</label>
              <input type="text" required autoFocus value={form.name} onChange={set('name')}
                placeholder="Ex : Amicale des sapeurs-pompiers de Lyon"
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Ville</label>
                <input type="text" value={form.city} onChange={set('city')} placeholder="Lyon"
                  className="w-full px-3 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Code postal</label>
                <input type="text" value={form.postal_code} onChange={set('postal_code')} placeholder="69000" maxLength={5}
                  className="w-full px-3 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text)]">Coordonnées</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Étape 2/2 — Informations de contact (optionnelles)</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary-light)] rounded-lg border border-red-100">
              <Flame className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm font-semibold text-[var(--color-primary)] truncate">{form.name}</span>
              <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs text-[var(--color-primary)] hover:underline">Modifier</button>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Adresse</label>
              <input type="text" value={form.address} onChange={set('address')} placeholder="12 rue de la Paix"
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Téléphone</label>
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="06 00 00 00 00"
                  className="w-full px-3 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="contact@..."
                  className="w-full px-3 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 pt-1">
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)}
              className="px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm font-semibold text-[var(--color-text-muted)] hover:bg-gray-50 transition-colors">
              Retour
            </button>
          )}
          <button type="submit" disabled={loading || (step === 1 && !form.name.trim())}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
              : step === 1 ? <>Continuer <ArrowRight className="w-4 h-4" /></>
              : <>Créer mon amicale <Flame className="w-4 h-4" /></>}
          </button>
        </div>
      </form>
    </div>
  )
}
