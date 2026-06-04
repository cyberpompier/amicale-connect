import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'
import { type ChildInput } from '@/hooks/useAmicalisteChildren'
import { ChevronRight, ChevronLeft, Upload, X, Plus, Trash2, CheckCircle2, User, MapPin, Heart, Users } from 'lucide-react'
import { resizeImage } from '@/lib/imageResize'

const GRADES = [
  'Sapeur', 'Caporal', 'Caporal-chef', 'Sergent', 'Sergent-chef',
  'Adjudant', 'Adjudant-chef', 'Lieutenant', 'Capitaine',
  'Commandant', 'Lieutenant-colonel', 'Colonel', 'Retraité', 'Civil',
]

const STATUTS = ['actif', 'inactif', 'honoraire']

const STATUTS_MARITAUX = ['Célibataire', 'Marié(e)', 'Pacsé(e)', 'Divorcé(e)', 'Veuf/Veuve']

function calcAge(birth: string): number | null {
  if (!birth) return null
  const today = new Date()
  const b = new Date(birth)
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age >= 0 ? age : null
}

function formatAge(birth: string): string {
  const age = calcAge(birth)
  return age !== null ? `${age} an${age > 1 ? 's' : ''}` : ''
}

interface StepProps {
  label: string
  icon: React.ReactNode
}

const STEPS: StepProps[] = [
  { label: 'Identité', icon: <User className="w-4 h-4" /> },
  { label: 'Coordonnées', icon: <MapPin className="w-4 h-4" /> },
  { label: 'Famille', icon: <Heart className="w-4 h-4" /> },
  { label: 'Enfants', icon: <Users className="w-4 h-4" /> },
]

export function ProfilWizard() {
  const navigate = useNavigate()
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Étape 1 — Identité
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [grade, setGrade] = useState('')
  const [status, setStatus] = useState('actif')
  const [birthDate, setBirthDate] = useState('')

  // Étape 2 — Coordonnées
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')

  // Étape 3 — Famille
  const [maritalStatus, setMaritalStatus] = useState('')

  // Étape 4 — Enfants
  const [children, setChildren] = useState<(ChildInput & { _key: number })[]>([])
  const [childKey, setChildKey] = useState(0)

  const addChild = () => {
    setChildren(prev => [...prev, { first_name: '', last_name: '', birth_date: '', _key: childKey }])
    setChildKey(k => k + 1)
  }

  const updateChild = (key: number, field: keyof ChildInput, value: string) => {
    setChildren(prev => prev.map(c => c._key === key ? { ...c, [field]: value } : c))
  }

  const removeChild = (key: number) => {
    setChildren(prev => prev.filter(c => c._key !== key))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const canNext = () => {
    if (step === 0) return firstName.trim() !== '' && lastName.trim() !== ''
    return true
  }

  const uploadAvatar = async (file: File): Promise<string | null> => {
    const resized = await resizeImage(file)
    const path = `amicalistes/${Date.now()}.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, resized, { upsert: true })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!currentAssociation || !user) return
    setSaving(true)
    setError('')
    try {
      let avatar_url: string | null = null
      if (avatarFile) avatar_url = await uploadAvatar(avatarFile)

      const { data: amicaliste, error: insertErr } = await supabase
        .from('amicalistes')
        .insert({
          association_id: currentAssociation.id,
          user_id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          grade: grade || null,
          status,
          join_date: new Date().toISOString().split('T')[0],
          email: email.trim() || null,
          phone: phone.trim() || null,
          avatar_url,
          birth_date: birthDate || null,
          address_street: street.trim() || null,
          address_city: city.trim() || null,
          address_postal_code: postalCode.trim() || null,
          marital_status: maritalStatus || null,
        })
        .select().single()

      if (insertErr) throw insertErr

      if (children.length > 0 && amicaliste) {
        const rows = children
          .filter(c => c.first_name.trim())
          .map(({ _key: _, ...c }) => ({
            amicaliste_id: amicaliste.id,
            first_name: c.first_name.trim(),
            last_name: c.last_name?.trim() || null,
            birth_date: c.birth_date || null,
          }))
        if (rows.length > 0) {
          const { error: childErr } = await supabase.from('amicaliste_children').insert(rows)
          if (childErr) throw childErr
        }
      }

      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Compléter votre profil</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Bienvenue dans l'amicale — quelques informations pour commencer
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-[var(--color-primary)] text-white' :
                  'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : s.icon}
                </div>
                <span className={`text-xs mt-1 font-medium ${i === step ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mt-[-1rem] transition-colors ${i < step ? 'bg-green-500' : 'bg-[var(--color-border)]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow)] p-6">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>
          )}

          {/* ÉTAPE 1 — Identité */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">Votre identité</h2>

              {/* Photo */}
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <div className="relative">
                    <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-primary)]" />
                    <button type="button" onClick={() => { setAvatarPreview(null); setAvatarFile(null) }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-full border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors">
                    <Upload className="w-5 h-5 text-[var(--color-text-muted)]" />
                    <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Photo</span>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                )}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Prénom *</label>
                      <input value={firstName} onChange={e => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                        placeholder="Jean" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Nom *</label>
                      <input value={lastName} onChange={e => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                        placeholder="Dupont" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Grade</label>
                  <select value={grade} onChange={e => setGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30">
                    <option value="">— Sélectionner —</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Statut</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30">
                    {STATUTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Date de naissance</label>
                <div className="flex items-center gap-3">
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                  {birthDate && (
                    <span className="text-sm font-semibold text-[var(--color-primary)] whitespace-nowrap">
                      {formatAge(birthDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 — Coordonnées */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">Vos coordonnées</h2>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Adresse</label>
                <input value={street} onChange={e => setStreet(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  placeholder="12 rue des Pompiers" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Code postal</label>
                  <input value={postalCode} onChange={e => setPostalCode(e.target.value)}
                    maxLength={5}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                    placeholder="60400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Ville</label>
                  <input value={city} onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                    placeholder="Noyon" />
                </div>
              </div>

              <div className="h-px bg-[var(--color-border)]" />

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  placeholder="jean.dupont@email.fr" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Téléphone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  placeholder="06 12 34 56 78" />
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — Famille */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">Situation familiale</h2>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">Statut marital</label>
                <div className="grid grid-cols-1 gap-2">
                  {STATUTS_MARITAUX.map(s => (
                    <button key={s} type="button" onClick={() => setMaritalStatus(s)}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${
                        maritalStatus === s
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                          : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 — Enfants */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-[var(--color-text)]">Vos enfants</h2>
                <button type="button" onClick={addChild}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-semibold rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>

              {children.length === 0 ? (
                <div className="text-center py-10 text-[var(--color-text-muted)]">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">Aucun enfant — cliquez sur "Ajouter" pour en renseigner</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {children.map((child, idx) => (
                    <div key={child._key} className="p-3 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-secondary)] space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Enfant {idx + 1}</span>
                        <button type="button" onClick={() => removeChild(child._key)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] mb-1">Prénom *</label>
                          <input value={child.first_name}
                            onChange={e => updateChild(child._key, 'first_name', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                            placeholder="Prénom" />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] mb-1">Nom</label>
                          <input value={child.last_name || ''}
                            onChange={e => updateChild(child._key, 'last_name', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                            placeholder="Nom" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-[var(--color-text-muted)] mb-1">Date de naissance</label>
                          <input type="date" value={child.birth_date || ''}
                            onChange={e => updateChild(child._key, 'birth_date', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        {child.birth_date && (
                          <span className="text-sm font-semibold text-[var(--color-primary)] mt-4 whitespace-nowrap">
                            {formatAge(child.birth_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--color-border)]">
            <button type="button" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/dashboard')}
              className="flex items-center gap-1.5 px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors">
              <ChevronLeft className="w-4 h-4" />
              {step === 0 ? 'Passer' : 'Retour'}
            </button>

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex items-center gap-1.5 px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Enregistrement...' : 'Terminer'}
                {!saving && <CheckCircle2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
