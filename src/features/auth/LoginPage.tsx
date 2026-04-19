import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from './AuthContext'
import { Flame } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuthContext()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] p-4">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl mb-5 shadow-lg">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">Amicale Connect</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5">Connectez-vous à votre espace</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-7" style={{ boxShadow: 'var(--shadow-md)' }}>
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3.5 rounded-xl border border-red-200 mb-5 flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
                placeholder="votre@email.fr"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              style={{ boxShadow: '0 1px 2px rgb(220 38 38 / 0.3)' }}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
          Pas encore de compte ?{' '}
          <Link to="/auth/register" className="text-[var(--color-primary)] hover:underline font-semibold">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
