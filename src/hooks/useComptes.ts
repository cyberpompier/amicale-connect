import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface Compte {
  id: string
  association_id: string
  nom: string
  type: 'courant' | 'caisse' | 'epargne' | 'autre'
  solde_initial: number
  couleur: string
  icone: string
  actif: boolean
  ordre: number
  created_at: string
  updated_at: string
}

export type CompteInput = Omit<Compte, 'id' | 'created_at' | 'updated_at' | 'association_id'>

export const COMPTE_TYPES: Record<Compte['type'], { label: string; icone: string; couleur: string }> = {
  courant:  { label: 'Compte courant',  icone: '🏦', couleur: '#6366f1' },
  caisse:   { label: 'Caisse',          icone: '💵', couleur: '#10b981' },
  epargne:  { label: 'Épargne / Livret', icone: '📈', couleur: '#f59e0b' },
  autre:    { label: 'Autre',           icone: '💼', couleur: '#8b5cf6' },
}

export interface CompteAvecSolde extends Compte {
  solde: number           // solde_initial + recettes - dépenses
  total_recettes: number
  total_depenses: number
  nb_transactions: number
}

export function useComptes() {
  const { currentAssociation } = useAssociation()
  const [comptes, setComptes] = useState<CompteAvecSolde[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchComptes = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)
    setError(null)

    // 1. Récupérer les comptes
    const { data: comptesData, error: eComptes } = await supabase
      .from('comptes')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .order('ordre', { ascending: true })

    if (eComptes) { setError(eComptes.message); setLoading(false); return }

    const liste = comptesData || []

    // 2. Agréger les transactions par compte
    const { data: txData } = await supabase
      .from('transactions')
      .select('compte_id, type, amount')
      .eq('association_id', currentAssociation.id)
      .not('compte_id', 'is', null)

    // 3. Agréger les virements (entrées/sorties)
    const { data: virData } = await supabase
      .from('virements')
      .select('compte_source_id, compte_destination_id, montant')
      .eq('association_id', currentAssociation.id)

    // Construire les soldes
    const soldeMap: Record<string, { recettes: number; depenses: number; virIn: number; virOut: number; nb: number }> = {}
    liste.forEach(c => { soldeMap[c.id] = { recettes: 0, depenses: 0, virIn: 0, virOut: 0, nb: 0 } })

    ;(txData || []).forEach(tx => {
      if (!tx.compte_id || !soldeMap[tx.compte_id]) return
      soldeMap[tx.compte_id].nb++
      if (tx.type === 'income')   soldeMap[tx.compte_id].recettes  += Number(tx.amount)
      if (tx.type === 'expense')  soldeMap[tx.compte_id].depenses  += Number(tx.amount)
    })
    ;(virData || []).forEach(v => {
      if (soldeMap[v.compte_source_id])      soldeMap[v.compte_source_id].virOut      += Number(v.montant)
      if (soldeMap[v.compte_destination_id]) soldeMap[v.compte_destination_id].virIn  += Number(v.montant)
    })

    const result: CompteAvecSolde[] = liste.map(c => {
      const s = soldeMap[c.id] ?? { recettes: 0, depenses: 0, virIn: 0, virOut: 0, nb: 0 }
      return {
        ...c,
        total_recettes: s.recettes + s.virIn,
        total_depenses: s.depenses + s.virOut,
        solde: Number(c.solde_initial) + s.recettes + s.virIn - s.depenses - s.virOut,
        nb_transactions: s.nb,
      }
    })

    setComptes(result)
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => { fetchComptes() }, [fetchComptes])

  const addCompte = async (input: CompteInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')
    const { error } = await supabase.from('comptes').insert({ ...input, association_id: currentAssociation.id })
    if (error) throw error
    await fetchComptes()
  }

  const updateCompte = async (id: string, updates: Partial<CompteInput>) => {
    const { error } = await supabase.from('comptes').update(updates).eq('id', id)
    if (error) throw error
    await fetchComptes()
  }

  const deleteCompte = async (id: string) => {
    const { error } = await supabase.from('comptes').delete().eq('id', id)
    if (error) throw error
    await fetchComptes()
  }

  const totalSolde = comptes.reduce((sum, c) => sum + c.solde, 0)

  return { comptes, loading, error, totalSolde, refetch: fetchComptes, addCompte, updateCompte, deleteCompte }
}
