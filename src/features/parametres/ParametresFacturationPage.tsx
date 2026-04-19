import { useState } from 'react'
import { CreditCard, CheckCircle2, XCircle, Clock, ArrowUpRight, Zap } from 'lucide-react'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'
import { PageHeader } from '@/components/ui/PageHeader'

const PLANS = [
  {
    name: 'Gratuit',
    price: '0€',
    period: '/mois',
    description: 'Pour découvrir l\'application',
    features: [
      'Jusqu\'à 20 membres',
      'Gestion du bureau',
      '5 événements / mois',
      'Comptabilité basique',
    ],
    disabled: ['Exports PDF/Excel', 'Support prioritaire', 'Multi-utilisateurs'],
    color: 'border-[var(--color-border)]',
    badge: null,
  },
  {
    name: 'Essentiel',
    price: '9€',
    period: '/mois',
    description: 'Pour les amicales actives',
    features: [
      'Membres illimités',
      'Gestion du bureau',
      'Événements illimités',
      'Comptabilité complète',
      'Exports PDF/Excel',
      'Support par email',
    ],
    disabled: ['Multi-utilisateurs', 'Support prioritaire'],
    color: 'border-[var(--color-primary)]',
    badge: 'Populaire',
  },
  {
    name: 'Premium',
    price: '19€',
    period: '/mois',
    description: 'Toutes les fonctionnalités',
    features: [
      'Membres illimités',
      'Gestion du bureau',
      'Événements illimités',
      'Comptabilité complète',
      'Exports PDF/Excel',
      'Multi-utilisateurs (5)',
      'Support prioritaire',
    ],
    disabled: [],
    color: 'border-gray-200',
    badge: null,
  },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700">
      <CheckCircle2 className="w-4 h-4" /> Actif
    </span>
  )
  if (status === 'trialing') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
      <Clock className="w-4 h-4" /> Période d'essai
    </span>
  )
  if (status === 'canceled') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700">
      <XCircle className="w-4 h-4" /> Annulé
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600">
      <Zap className="w-4 h-4" /> Gratuit
    </span>
  )
}

// Map plan names to Stripe price IDs
const PLAN_PRICE_IDS: Record<string, string> = {
  'Essentiel': import.meta.env.VITE_STRIPE_PRICE_ESSENTIEL || 'price_essentiel',
  'Premium': import.meta.env.VITE_STRIPE_PRICE_PREMIUM || 'price_premium',
}

export function ParametresFacturationPage() {
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const status = currentAssociation?.subscription_status || 'free'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChoosePlan = async (planName: string) => {
    if (!currentAssociation || !user) return
    setLoading(true)
    setError(null)

    try {
      const priceId = PLAN_PRICE_IDS[planName]
      if (!priceId) {
        setError(`Plan ${planName} not configured`)
        return
      }

      console.log('📤 Sending checkout request:', {
        planName,
        priceId,
        associationId: currentAssociation.id,
        userId: user.id,
      })

      const response = await fetch('/.netlify/functions/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          associationId: currentAssociation.id,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Checkout error response:', {
          status: response.status,
          error: errorData,
        })
        setError(errorData.error || 'Failed to create checkout session')
        return
      }

      const { sessionUrl } = await response.json()
      console.log('✅ Checkout session created:', sessionUrl)
      if (sessionUrl) {
        window.location.href = sessionUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!currentAssociation) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/.netlify/functions/stripe-portal', {
        method: 'POST',
        body: JSON.stringify({
          associationId: currentAssociation.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to access portal')
        return
      }

      const { portalUrl } = await response.json()
      if (portalUrl) {
        window.location.href = portalUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Facturation"
        subtitle="Gérez votre abonnement et votre plan"
      />

      <div className="max-w-3xl space-y-6">

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Statut actuel */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Abonnement actuel</h2>
              <p className="text-xs text-[var(--color-text-muted)]">État de votre plan</p>
            </div>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-bold text-[var(--color-text)]">
                  {status === 'active' ? 'Plan Essentiel' : status === 'trialing' ? 'Période d\'essai' : 'Plan Gratuit'}
                </span>
                <StatusBadge status={status} />
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                {status === 'active'
                  ? 'Votre abonnement est actif et se renouvelle automatiquement.'
                  : status === 'trialing'
                  ? 'Vous profitez de toutes les fonctionnalités pendant votre période d\'essai.'
                  : 'Passez à un plan payant pour débloquer toutes les fonctionnalités.'}
              </p>
            </div>
            {(status === 'active' || status === 'trialing') && (
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
              >
                Gérer <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* Plans disponibles */}
        <section>
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
            Nos plans
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl border-2 ${plan.color} shadow-sm p-5 flex flex-col relative`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[var(--color-primary)] text-white text-xs font-bold rounded-full">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-[var(--color-text)] mb-1">{plan.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[var(--color-text)]">{plan.price}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{plan.period}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{plan.description}</p>
                </div>
                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--color-text)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.disabled.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] line-through">
                      <XCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleChoosePlan(plan.name)}
                  disabled={plan.name === 'Gratuit' || loading}
                  className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${
                    plan.name === 'Gratuit'
                      ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-default'
                      : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white disabled:opacity-50'
                  }`}
                >
                  {plan.name === 'Gratuit' ? 'Plan actuel' : `Choisir ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Informations de paiement */}
        <section className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-5">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            💳 Paiement sécurisé par <strong>Stripe</strong> — Annulation possible à tout moment — Sans engagement
          </p>
        </section>

      </div>
    </div>
  )
}
