import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAmicalisteChildren } from '@/hooks/useAmicalisteChildren'
import { supabase } from '@/lib/supabase'
import { resizeImage } from '@/lib/imageResize'
import { PageHeader } from '@/components/ui/PageHeader'
import { Upload, X, Plus, Trash2, Save, CheckCircle2, AlertCircle, User } from 'lucide-react'
import type { Amicaliste } from '@/hooks/useAmicalistes'

const GRADES = [
  'Sapeur','Caporal','Caporal-chef','Sergent','Sergent-chef',
  'Adjudant','Adjudant-chef','Lieutenant','Capitaine','Commandant',
  'Lieutenant-colonel','Colonel','Retraité','Civil',
]
const STATUTS_MARITAUX = ['Célibataire','Marié(e)','Pacsé(e)','Divorcé(e)','Veuf/Veuve']

function calcAge(birth: string): number | null {
  if (!birth) return null
  const today = new Date()
  const b = new Date(birth)
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age >= 0 ? age : null
}

export function ProfilPage() {
  const { user } = useAuthContext()
  const { currentAssociation } = useAssociation()
  const navigate = useNavigate()

  const [amicaliste, setAmicaliste] = useState<Amicaliste | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Champs du formulaire
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [grade, setGrade] = useState('')
  const [status, setStatus] = useState('actif')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [notes, setNotes] = useState('')

  const { children, loading: childrenLoading, saveAll } = useAmicalisteChildren(amicaliste?.id ?? null)
  const [localChildren, setLocalChildren] = useState<{ _key: number; first_name: string; last_name: string | null; birth_date: string | null }[]>([])
  const [childKey, setChildKey] = useState(0)

  // Charger la fiche amicaliste liée au user
  useEffect(() => {
    if (!user || !currentAssociation) return
    supabase
      .from('amicalistes')
      .select('*')
      .eq('user_id', user.id)
      .eq('association_id', currentAssociation.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAmicaliste(data)
          setFirstName(data.first_name || '')
          setLastName(data.last_name || '')
          setGrade(data.grade || '')
          setStatus(data.status || 'actif')
          setBirthDate(data.birth_date || '')
          setEmail(data.email || user.email || '')
          setPhone(data.phone || '')
          setStreet(data.address_street || '')
          setCity(data.address_city || '')
          setPostalCode(data.address_postal_code || '')
          setMaritalStatus(data.marital_status || '')
          setNotes(data.notes || '')
          setAvatarPreview(data.avatar_url || null)
        } else {
          // Pré-remplir l'email depuis le compte auth
          setEmail(user.email || '')
        }
        setLoading(false)
      })
  }, [user, currentAssociation])

  // Sync enfants depuis DB → local
  useEffect(() => {
    if (!childrenLoading) {
      setLocalChildren(children.map((c, i) => ({ _key: i, first_name: c.first_name, last_name: c.last_name, birth_date: c.birth_date })))
      setChildKey(children.length)
    }
  }, [childrenLoading, children.length])

  const addChild = () => {
    setLocalChildren(prev => [...prev, { _key: childKey, first_name: '', last_name: null, birth_date: null }])
    setChildKey(k => k + 1)
  }
  const updateChild = (key: number, field: string, value: string | null) =>
    setLocalChildren(prev => prev.map(c => c._key === key ? { ...c, [field]: value } : c))
  const removeChild = (key: number) => setLocalChildren(prev => prev.filter(c => c._key !== key))

  const uploadAvatar = async (file: File): Promise<string> => {
    const resized = await resizeImage(file)
    const path = `amicalistes/${user!.id}.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, resized, { upsert: true })
    if (error) throw new Error(error.message)
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !currentAssociation) return
    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont obligatoires')
      return
    }
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      let avatar_url = amicaliste?.avatar_url ?? null
      if (avatarFile) avatar_url = await uploadAvatar(avatarFile)

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        grade: grade || null,
        status,
        email: email.trim() || null,
        phone: phone.trim() || null,
        avatar_url,
        birth_date: birthDate || null,
        address_street: street.trim() || null,
        address_city: city.trim() || null,
        address_postal_code: postalCode.trim() || null,
        marital_status: maritalStatus || null,
        notes: notes.trim() || null,
      }

      let saved: Amicaliste
      if (amicaliste) {
        // Mise à jour
        const { data: updated, error: updateErr } = await supabase
          .from('amicalistes')
          .update(payload)
          .eq('id', amicaliste.id)
          .select().single()
        if (updateErr) throw updateErr
        saved = updated
      } else {
        // Création de la fiche amicaliste liée au compte
        const { data: created, error: createErr } = await supabase
          .from('amicalistes')
          .insert({
            ...payload,
            user_id: user.id,
            association_id: currentAssociation.id,
            join_date: new Date().toISOString().split('T')[0],
          })
          .select().single()
        if (createErr) throw createErr
        saved = created
      }

      setAmicaliste(saved)
      setAvatarFile(null)

      // Sauvegarder enfants
      await saveAll(saved.id, localChildren
        .filter(c => c.first_name.trim())
        .map(({ _key: _, ...c }) => ({ ...c, first_name: c.first_name.trim() }))
      )

      // Rediriger vers la fiche complète
      navigate(`/membres/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  )

  const age = birthDate ? calcAge(birthDate) : null

  return (
    <div>
      <PageHeader
        title="Mon profil"
        subtitle={amicaliste ? 'Vos informations personnelles' : 'Créer votre fiche dans la liste des amicalistes'}
      />

      {!amicaliste && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-xl mb-6 max-w-2xl">
          <User className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Votre compte n'est pas encore lié à une fiche amicaliste. Remplissez le formulaire ci-dessous pour créer votre profil et apparaître dans la liste des membres.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

        {/* Section identité */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Identité</h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              {avatarPreview ? (
                <div className="relative flex-shrink-0">
                  <img src={avatarPreview} alt="Photo" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-primary)]" />
                  <button type="button" onClick={() => { setAvatarPreview(null); setAvatarFile(null) }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-full border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-primary)] transition-colors flex-shrink-0">
                  <Upload className="w-5 h-5 text-[var(--color-text-muted)]" />
                  <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Photo</span>
                  <input type="file" accept="image/*" onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
                  }} className="hidden" />
                </label>
              )}
              <div className="flex-1">
                {avatarPreview && (
                  <label className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-xs font-medium cursor-pointer hover:bg-[var(--color-bg-secondary)] transition-colors w-fit">
                    <Upload className="w-3.5 h-3.5" /> Changer la photo
                    <input type="file" accept="image/*" onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
                    }} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Prénom *</label>
                <input required value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Nom *</label>
                <input required value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Grade</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30">
                  <option value="">— Sélectionner —</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30">
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="honoraire">Honoraire</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Date de naissance</label>
              <div className="flex items-center gap-3">
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]" />
                {age !== null && (
                  <span className="text-sm font-semibold text-[var(--color-primary)] whitespace-nowrap">
                    {age} an{age > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section coordonnées */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Coordonnées</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Téléphone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
                  placeholder="06 12 34 56 78" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Adresse</label>
              <input value={street} onChange={e => setStreet(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
                placeholder="12 rue des Pompiers" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Code postal</label>
                <input value={postalCode} onChange={e => setPostalCode(e.target.value)} maxLength={5}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1">Ville</label>
                <input value={city} onChange={e => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]" />
              </div>
            </div>
          </div>
        </section>

        {/* Section famille */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Situation familiale</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-2">Statut marital</label>
              <div className="flex flex-wrap gap-2">
                {STATUTS_MARITAUX.map(s => (
                  <button key={s} type="button" onClick={() => setMaritalStatus(maritalStatus === s ? '' : s)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      maritalStatus === s
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                        : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--color-text)]">Enfants</label>
                <button type="button" onClick={addChild}
                  className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline font-medium">
                  <Plus className="w-3.5 h-3.5" /> Ajouter un enfant
                </button>
              </div>

              {localChildren.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] py-3 text-center border border-dashed border-[var(--color-border)] rounded-lg">
                  Aucun enfant renseigné
                </p>
              ) : (
                <div className="space-y-2">
                  {localChildren.map((child, idx) => (
                    <div key={child._key} className="p-3 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-secondary)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Enfant {idx + 1}</span>
                        <button type="button" onClick={() => removeChild(child._key)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={child.first_name} onChange={e => updateChild(child._key, 'first_name', e.target.value)}
                          placeholder="Prénom *"
                          className="px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                        <input value={child.last_name || ''} onChange={e => updateChild(child._key, 'last_name', e.target.value || null)}
                          placeholder="Nom"
                          className="px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="date" value={child.birth_date || ''} onChange={e => updateChild(child._key, 'birth_date', e.target.value || null)}
                          className="flex-1 px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                        {child.birth_date && (() => {
                          const a = calcAge(child.birth_date)
                          return a !== null ? <span className="text-xs font-semibold text-[var(--color-primary)] whitespace-nowrap">{a} an{a > 1 ? 's' : ''}</span> : null
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Notes</h2>
          </div>
          <div className="p-6">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notes libres..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] resize-none" />
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2.5 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Profil mis à jour avec succès !
          </div>
        )}

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 shadow-sm">
          <Save className="w-4 h-4" />
          {saving ? 'Enregistrement...' : 'Sauvegarder'}
        </button>
      </form>
    </div>
  )
}
