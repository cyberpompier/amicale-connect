import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/features/auth/AuthContext'
import { useAssociation } from './AssociationContext'
// Note: supabase is used for session token retrieval, not for direct inserts
import { Flame, Building2, MapPin, Phone, Mail, ArrowRight, Loader2 } from 'lucide-react'

export function OnboardingPage() {
  const { user } = useAuthContext()
  const { setCurrentAssociation, refetch } = useAssociation()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    email: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !user) {
      setError('Veuillez remplir le nom de l\'amicale')
      return
    }
    setLoading(true)
    setError(null)

    try {
      console.log('📝 Création association:', form.name, 'pour user:', user.id)

      // 1. Créer l'association
      const { data: assoc, error: assocErr } = await supabase
        .from('associations')
        .insert({
          name: form.name.trim(),
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          subscription_status: 'trialing',
        })
        .select('id, name, subscription_status')
        .single()

      if (assocErr) {
        console.error('❌ Erreur création association:', assocErr)
        throw new Error(`Création association: ${assocErr.message}`)
      }

      console.log('✅ Association créée:', assoc.id)

      // 2. Lier l'utilisateur comme owner
      const { error: memberErr } = await supabase
        .from('association_members')
        .insert({
          user_id: user.id,
          association_id: assoc.id,
          role: 'owner',
        })

      if (memberErr) {
        console.error('❌ Erreur ajout membre:', memberErr)
        throw new Error(`Liaison utilisateur: ${memberErr.message}`)
      }

      console.log('✅ Utilisateur lié comme owner')

      // 3. Refetch les associations pour mettre à jour le contexte
      await refetch()
      console.log('✅ Onboarding terminé')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      console.error('💥 Erreur complète:', err)
      setError(message)
      setLoading(false)
    }
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Décoration fond */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Icône */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl shadow-lg mb-4">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Amicale Connect</h1>
          <p className="text-slate-400 text-sm mt-1">Bienvenue ! Créons votre amicale.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Progression */}
          <div className="flex">
            <div className={`h-1 flex-1 transition-colors ${step >= 1 ? 'bg-[var(--color-primary)]' : 'bg-gray-100'}`} />
            <div className={`h-1 flex-1 transition-colors ${step >= 2 ? 'bg-[var(--color-primary)]' : 'bg-gray-100'}`} />
          </div>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if (form.name.trim()) setStep(2) } : handleSubmit}>
            <div className="p-6">

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text)]">Votre amicale</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                      Étape 1/2 — Donnez un nom à votre amicale
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
                      Nom de l'amicale <span className="text-[var(--color-primary)]">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Ex : Amicale des sapeurs-pompiers de Lyon"
                        value={form.name}
                        onChange={set('name')}
                        className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
                      Ville <span className="text-[var(--color-text-muted)] font-normal">(optionnel)</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                      <input
                        type="text"
                        placeholder="Ex : Lyon"
                        value={form.city}
                        onChange={set('city')}
                        className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text)]">Coordonnées</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                      Étape 2/2 — Informations de contact <span className="text-[var(--color-text-muted)]">(toutes optionnelles)</span>
                    </p>
                  </div>

                  {/* Résumé étape 1 */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary-light)] rounded-lg border border-red-100">
                    <Flame className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
                    <span className="text-sm font-semibold text-[var(--color-primary)] truncate">{form.name}</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="ml-auto text-xs text-[var(--color-primary)] hover:underline flex-shrink-0"
                    >
                      Modifier
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Adresse</label>
                    <input
                      type="text"
                      placeholder="Ex : 12 rue de la Paix"
                      value={form.address}
                      onChange={set('address')}
                      className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Téléphone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                        <input
                          type="tel"
                          placeholder="06 00 00 00 00"
                          value={form.phone}
                          onChange={set('phone')}
                          className="w-full pl-9 pr-3 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                        <input
                          type="email"
                          placeholder="contact@..."
                          value={form.email}
                          onChange={set('email')}
                          className="w-full pl-9 pr-3 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm font-semibold text-[var(--color-text-muted)] hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
              )}
              <button
                type="submit"
                disabled={loading || (step === 1 && !form.name.trim())}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours...</>
                ) : step === 1 ? (
                  <>Continuer <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>Créer mon amicale <Flame className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Vous pourrez modifier ces informations plus tard dans les paramètres.
        </p>
      </div>
    </div>
  )
}
