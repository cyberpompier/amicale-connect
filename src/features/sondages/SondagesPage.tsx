import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Plus, CheckCircle2, Clock, Trash2, Users, ChevronRight, BarChart2, Lock, Radio, CheckSquare } from 'lucide-react'
import { useSondages, type SondageWithStats } from '@/hooks/useSondages'
import { useAuthContext } from '@/features/auth/AuthContext'
import { formatDateShort } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

function ProgressBar({ value, color = 'bg-[var(--color-primary)]' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function SondageCard({
  sondage,
  onTerminer,
  onDelete,
  onVote,
  userId,
  selectedId,
  onSelect,
}: {
  sondage: SondageWithStats
  onTerminer: (id: string) => void
  onDelete: (id: string) => void
  onVote: (sondageId: string, optionId: string, userId: string) => void
  userId: string
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [voting, setVoting] = useState(false)
  const [voteSuccess, setVoteSuccess] = useState(false)

  const isActif = sondage.statut === 'actif'
  const isSelected = selectedId === sondage.id
  const hasVoted = sondage.participants.some((v) => v.user_id === userId)

  const topOption = sondage.options.reduce((a, b) => (b.votes > a.votes ? b : a), sondage.options[0])
  const colors = ['bg-[var(--color-primary)]', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']

  const handleVote = async (optionId: string) => {
    setVoting(true)
    try {
      await onVote(sondage.id, optionId, userId)
      setVoteSuccess(true)
      setTimeout(() => setVoteSuccess(false), 2000)
    } catch { /* ignore */ }
    setVoting(false)
  }

  return (
    <div
      className={`bg-white rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
        isSelected ? 'border-[var(--color-primary)] shadow-lg' : 'border-[var(--color-border)] hover:border-gray-300 shadow-sm'
      }`}
      onClick={() => onSelect(sondage.id)}
    >
      {/* Bannière */}
      {sondage.image_url && (
        <div className="w-full h-32 overflow-hidden">
          <img src={sondage.image_url} alt={sondage.titre} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
              isActif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {isActif ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />En cours</> : <><Lock className="w-3 h-3" />Terminé</>}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              {sondage.type === 'unique' ? <><Radio className="w-3 h-3" />Unique</> : <><CheckSquare className="w-3 h-3" />Multiple</>}
            </span>
          </div>
          {sondage.date_fin && (
            <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
              <Clock className="w-3 h-3 inline mr-1" />
              {isActif ? `Jusqu'au ${formatDateShort(sondage.date_fin)}` : `Terminé le ${formatDateShort(sondage.date_fin)}`}
            </span>
          )}
        </div>
        <h3 className="text-base font-bold text-[var(--color-text)] mb-1">{sondage.titre}</h3>
        {sondage.description && (
          <p className="text-sm text-[var(--color-text-muted)]">{sondage.description}</p>
        )}
      </div>

      {/* Options */}
      <div className="px-5 pb-4 space-y-3">
        {sondage.options.map((opt, i) => {
          const isTop = opt.id === topOption?.id && opt.votes > 0
          return (
            <div key={opt.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-semibold uppercase tracking-wide ${isTop ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                  {isTop && <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-500" />}
                  {opt.texte}
                </span>
                <span className="text-xs font-bold text-[var(--color-text-muted)]">
                  {opt.votes} voix · {opt.pourcentage}%
                </span>
              </div>
              <ProgressBar value={opt.pourcentage} color={colors[i % colors.length]} />
            </div>
          )
        })}
      </div>

      {/* Vote (si actif) */}
      {isActif && (
        <div className="px-5 pb-4 border-t border-[var(--color-border)] pt-3" onClick={(e) => e.stopPropagation()}>
          {hasVoted ? (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Vous avez déjà voté pour ce sondage
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">Voter</p>
              <div className="flex flex-wrap gap-2">
                {sondage.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    disabled={voting}
                    className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {opt.texte}
                  </button>
                ))}
              </div>
              {voteSuccess && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Vote enregistré !
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)] rounded-b-2xl">
        <div className="flex items-center gap-3">
          {/* Avatars participants */}
          <div className="flex -space-x-2">
            {sondage.participants.slice(0, 4).map((_, i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-[var(--color-primary-light)] flex items-center justify-center">
                <span className="text-[8px] font-bold text-[var(--color-primary)]">
                  {String(i + 1)}
                </span>
              </div>
            ))}
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            <Users className="w-3 h-3 inline mr-1" />
            {sondage.totalVotes} participation{sondage.totalVotes !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isActif && (
            <button
              onClick={() => onTerminer(sondage.id)}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
            >
              Terminer
            </button>
          )}
          <button
            onClick={() => onDelete(sondage.id)}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AnalysePanel({ sondage }: { sondage: SondageWithStats | null }) {
  if (!sondage) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-8 text-center shadow-sm sticky top-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Sélectionnez un sondage pour voir l'analyse
        </p>
      </div>
    )
  }

  const colors = ['text-[var(--color-primary)]', 'text-blue-500', 'text-emerald-500', 'text-amber-500', 'text-purple-500']
  const bgColors = ['bg-[var(--color-primary)]', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden sticky top-4">
      <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">Analyse du vote</h3>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] truncate">{sondage.titre}</p>
      </div>
      <div className="p-5 space-y-4">
        {/* Total */}
        <div className="flex items-center justify-between py-3 px-4 bg-[var(--color-bg-secondary)] rounded-xl">
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">Total des votes</span>
          <span className="text-2xl font-black text-[var(--color-text)]">{sondage.totalVotes}</span>
        </div>

        {/* Résultats par option */}
        <div className="space-y-4">
          {sondage.options.map((opt, i) => (
            <div key={opt.id}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${colors[i % colors.length]}`}>{opt.texte}</span>
                <span className="text-xs font-black text-[var(--color-text)]">{opt.pourcentage}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${bgColors[i % bgColors.length]}`}
                  style={{ width: `${opt.pourcentage}%` }}
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{opt.votes} vote{opt.votes !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>

        {/* Participants récents */}
        {sondage.participants.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Participants récents</p>
            <div className="space-y-2">
              {sondage.participants.slice(0, 5).map((v, i) => {
                const opt = sondage.options.find((o) => o.id === v.option_id)
                return (
                  <div key={v.id} className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-[var(--color-primary)]">
                        {String(i + 1)}
                      </span>
                    </div>
                    <span className="text-[var(--color-text)] font-medium truncate flex-1">
                      Utilisateur {i + 1}
                    </span>
                    <span className="text-[var(--color-text-muted)] truncate max-w-20">{opt?.texte}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function SondagesPage() {
  const { sondages, loading, terminerSondage, deleteSondage, voter } = useSondages()
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const enCours = sondages.filter((s) => s.statut === 'actif')
  const termines = sondages.filter((s) => s.statut === 'termine')
  const selectedSondage = sondages.find((s) => s.id === selectedId) || null

  const handleTerminer = async (id: string) => {
    if (!window.confirm('Terminer ce sondage ? Les membres ne pourront plus voter.')) return
    try { await terminerSondage(id) } catch (e) { alert(e instanceof Error ? e.message : 'Erreur') }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer définitivement ce sondage ?')) return
    try { await deleteSondage(id) } catch (e) { alert(e instanceof Error ? e.message : 'Erreur') }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Sondages"
        subtitle="Concertation et décisions de l'amicale"
        action={
          <button
            onClick={() => navigate('/sondages/creer')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Lancer un sondage</span>
            <span className="sm:hidden">Créer</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="xl:col-span-2 space-y-6">

          {/* Sondages en cours */}
          {enCours.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Sondages en cours ({enCours.length})
                </h2>
              </div>
              <div className="space-y-4">
                {enCours.map((s) => (
                  <SondageCard
                    key={s.id}
                    sondage={s}
                    onTerminer={handleTerminer}
                    onDelete={handleDelete}
                    onVote={voter}
                    userId={user?.id || ''}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Sondages terminés */}
          {termines.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Archivés ({termines.length})
                </h2>
              </div>
              <div className="space-y-3">
                {termines.map((s) => (
                  <div
                    key={s.id}
                    className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                      selectedId === s.id ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">{s.titre}</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Terminé{s.date_fin ? ` le ${formatDateShort(s.date_fin)}` : ''} · {s.totalVotes} vote{s.totalVotes !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }}
                          className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* État vide */}
          {sondages.length === 0 && (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-base font-bold text-[var(--color-text)] mb-1">Aucun sondage</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-5">
                Lancez votre premier sondage pour consulter les membres.
              </p>
              <button
                onClick={() => navigate('/sondages/creer')}
                className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Créer le premier sondage
              </button>
            </div>
          )}
        </div>

        {/* Panneau analyse */}
        <div className="xl:col-span-1">
          <AnalysePanel sondage={selectedSondage} />
        </div>
      </div>
    </div>
  )
}
