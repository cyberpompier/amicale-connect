import { useParams, useNavigate } from 'react-router-dom'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { useCotisations } from '@/hooks/useCotisations'
import { useAmicalisteChildren } from '@/hooks/useAmicalisteChildren'
import { ArrowLeft, Mail, Phone, Calendar, Badge, Pencil, Trash2, AlertCircle, MapPin, Heart, Users, Baby } from 'lucide-react'
import { formatDate } from '@/lib/utils'

function calcAge(birth: string): number | null {
  const today = new Date()
  const b = new Date(birth)
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age >= 0 ? age : null
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-[var(--color-text)]">{value}</div>
    </div>
  )
}

export function MembresDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { amicalistes, deleteAmicaliste } = useAmicalistes()
  const { cotisations } = useCotisations()
  const { children } = useAmicalisteChildren(id ?? null)

  const membre = amicalistes.find((a) => a.id === id)
  const memberCotisations = cotisations.filter((c) => c.amicaliste_id === id)

  const handleDelete = async () => {
    if (!membre) return
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${membre.first_name} ${membre.last_name} ?`)) return
    try {
      await deleteAmicaliste(id!)
      navigate('/membres')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  if (!membre) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)]">Membre introuvable</p>
        <button onClick={() => navigate('/membres')} className="mt-4 text-sm text-[var(--color-primary)] hover:underline">
          Retour à la liste
        </button>
      </div>
    )
  }

  const STATUS_STYLES: Record<string, string> = {
    actif: 'bg-green-100 text-green-700',
    inactif: 'bg-gray-100 text-gray-600',
    honoraire: 'bg-blue-100 text-blue-700',
  }

  const age = membre.birth_date ? calcAge(membre.birth_date) : null
  const hasAddress = membre.address_street || membre.address_city || membre.address_postal_code

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/membres')}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Amicalistes
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/membres/editer/${id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" /> Supprimer
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] px-6 py-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="flex-shrink-0">
            {membre.avatar_url ? (
              <img src={membre.avatar_url} alt={`${membre.first_name} ${membre.last_name}`}
                className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-white/20 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-4xl font-bold text-white">{membre.first_name[0]}{membre.last_name[0]}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white">{membre.last_name} {membre.first_name}</h1>
            {membre.birth_date && age !== null && (
              <p className="text-white/80 text-sm mt-1">{age} ans — né(e) le {formatDate(membre.birth_date)}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${STATUS_STYLES[membre.status] || 'bg-amber-100 text-amber-700'}`}>
                {membre.status}
              </span>
              {membre.grade && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white border border-white/30">
                  <Badge className="w-3.5 h-3.5" /> {membre.grade}
                </span>
              )}
              {membre.marital_status && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white border border-white/30">
                  <Heart className="w-3.5 h-3.5" /> {membre.marital_status}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Contact */}
          {(membre.email || membre.phone || membre.join_date) && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {membre.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
                    <a href={`mailto:${membre.email}`} className="text-sm text-[var(--color-primary)] hover:underline truncate">{membre.email}</a>
                  </div>
                )}
                {membre.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
                    <a href={`tel:${membre.phone}`} className="text-sm text-[var(--color-primary)] hover:underline">{membre.phone}</a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
                  <span className="text-sm text-[var(--color-text)]">Adhérent depuis le {formatDate(membre.join_date)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Adresse */}
          {hasAddress && (
            <>
              <div className="h-px bg-[var(--color-border)]" />
              <div>
                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Adresse</h3>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[var(--color-text)] space-y-0.5">
                    {membre.address_street && <p>{membre.address_street}</p>}
                    {(membre.address_postal_code || membre.address_city) && (
                      <p>{[membre.address_postal_code, membre.address_city].filter(Boolean).join(' ')}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Enfants */}
          {children.length > 0 && (
            <>
              <div className="h-px bg-[var(--color-border)]" />
              <div>
                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Enfants ({children.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {children.map((child) => {
                    const childAge = child.birth_date ? calcAge(child.birth_date) : null
                    return (
                      <div key={child.id} className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)]">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                          <Baby className="w-4 h-4 text-[var(--color-primary)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                            {child.first_name}{child.last_name ? ` ${child.last_name}` : ''}
                          </p>
                          {child.birth_date && (
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {formatDate(child.birth_date)}{childAge !== null ? ` · ${childAge} an${childAge > 1 ? 's' : ''}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {membre.notes && (
            <>
              <div className="h-px bg-[var(--color-border)]" />
              <InfoRow label="Notes" value={<p className="whitespace-pre-wrap">{membre.notes}</p>} />
            </>
          )}
        </div>
      </div>

      {/* Cotisations */}
      {memberCotisations.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Cotisations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <th className="text-left px-6 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Année</th>
                  <th className="text-left px-6 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Libellé</th>
                  <th className="text-right px-6 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Montant</th>
                  <th className="text-center px-6 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {memberCotisations.sort((a, b) => b.year - a.year).map((cot) => (
                  <tr key={cot.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <td className="px-6 py-3 font-medium text-[var(--color-text)]">{cot.year}</td>
                    <td className="px-6 py-3 text-[var(--color-text-muted)]">{cot.libelle}</td>
                    <td className="px-6 py-3 text-right font-semibold text-[var(--color-text)]">{cot.amount}€</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        cot.status === 'paid' ? 'bg-green-100 text-green-700' :
                        cot.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {cot.status === 'paid' ? 'Payée' : cot.status === 'pending' ? 'En attente' : 'En retard'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
