import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface SourceRevenu {
  recettes: number
  depenses: number
  benefice: number
  margePercent: number | null
  label: string
}

export interface RevenusKPI {
  calendriers: SourceRevenu & { campagneName: string; campagneYear: number }
  brocantes: SourceRevenu & { evenementsCount: number }
  boutique: SourceRevenu & { commandesCount: number }
  evenements: SourceRevenu & { evenementsCount: number }
  total: SourceRevenu
  annee: number
  loading: boolean
}

function calcMarge(recettes: number, depenses: number): number | null {
  if (recettes === 0) return null
  return ((recettes - depenses) / recettes) * 100
}

// Mots-clés pour matcher les catégories de transactions aux sources
const KEYWORDS: Record<string, string[]> = {
  calendriers: ['calendrier'],
  brocantes: ['brocante'],
  boutique: ['boutique'],
  evenements: ['événement', 'evenement', 'evenements', 'événements', 'repas', 'bal', 'fête', 'fete'],
}

export function useRevenusKPI(annee?: number) {
  const { currentAssociation } = useAssociation()
  const year = annee ?? new Date().getFullYear()

  const emptySource = (label: string): SourceRevenu => ({
    recettes: 0, depenses: 0, benefice: 0, margePercent: null, label,
  })

  const [kpi, setKpi] = useState<RevenusKPI>({
    calendriers: { ...emptySource('Calendriers'), campagneName: '', campagneYear: year },
    brocantes: { ...emptySource('Brocantes'), evenementsCount: 0 },
    boutique: { ...emptySource('Boutique'), commandesCount: 0 },
    evenements: { ...emptySource('Événements'), evenementsCount: 0 },
    total: emptySource('Total annuel'),
    annee: year,
    loading: true,
  })

  const fetchKPI = useCallback(async () => {
    if (!currentAssociation) {
      setKpi(prev => ({ ...prev, loading: false }))
      return
    }

    setKpi(prev => ({ ...prev, loading: true }))

    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    const [campagnesRes, ventesRes, boutiquesRes, evenementsRes, transactionsRes] = await Promise.all([
      // Campagne calendrier de l'année N
      supabase
        .from('calendrier_campagnes')
        .select('id, name, year')
        .eq('association_id', currentAssociation.id)
        .eq('year', year)
        .order('created_at', { ascending: false })
        .limit(1),

      // Ventes calendrier de l'année N
      supabase
        .from('calendrier_ventes')
        .select('amount, calendrier_campagnes!inner(year)')
        .eq('association_id', currentAssociation.id)
        .eq('calendrier_campagnes.year', year),

      // Commandes boutique payées de l'année N
      supabase
        .from('boutique_commandes')
        .select('total_amount')
        .eq('association_id', currentAssociation.id)
        .eq('payment_status', 'completed')
        .gte('created_at', `${yearStart}T00:00:00`)
        .lte('created_at', `${yearEnd}T23:59:59`),

      // Événements de l'année N avec participants payés
      supabase
        .from('evenements')
        .select(`
          id, titre, tarif_amicaliste, tarif_exterieur,
          evenement_participants(paiement),
          evenement_invites(paiement)
        `)
        .eq('association_id', currentAssociation.id)
        .gte('date', yearStart)
        .lte('date', yearEnd),

      // Toutes les transactions de dépenses de l'année N avec catégorie
      supabase
        .from('transactions')
        .select('amount, type, categories(name)')
        .eq('association_id', currentAssociation.id)
        .eq('type', 'expense')
        .gte('date', yearStart)
        .lte('date', yearEnd),
    ])

    // ── Recettes calendriers ───────────────────────────────────────────────────
    const campagne = campagnesRes.data?.[0] ?? null
    const calRecettes = (ventesRes.data ?? []).reduce((s, v) => s + Number(v.amount), 0)

    // ── Recettes boutique ──────────────────────────────────────────────────────
    const commandes = boutiquesRes.data ?? []
    const boutiqueRecettes = commandes.reduce((s, c) => s + Number(c.total_amount), 0)

    // ── Recettes événements (brocante séparée) ─────────────────────────────────
    let brocantesRecettes = 0, brocantesCount = 0
    let evtRecettes = 0, evtCount = 0

    for (const evt of (evenementsRes.data ?? [])) {
      const tarifMembre = Number(evt.tarif_amicaliste ?? 0)
      const tarifExterne = Number(evt.tarif_exterieur ?? 0)
      const parts = (evt.evenement_participants ?? []) as { paiement: string }[]
      const invs = (evt.evenement_invites ?? []) as { paiement: string }[]
      const rev = parts.filter(p => p.paiement === 'paye').length * tarifMembre
             + invs.filter(i => i.paiement === 'paye').length * tarifExterne

      if (evt.titre?.toLowerCase().includes('brocante')) {
        brocantesRecettes += rev; brocantesCount++
      } else {
        evtRecettes += rev; evtCount++
      }
    }

    // ── Dépenses par source via catégories ────────────────────────────────────
    const transactions = (transactionsRes.data ?? []) as { amount: number; type: string; categories?: { name: string } | null }[]

    const depenses = { calendriers: 0, brocantes: 0, boutique: 0, evenements: 0 }

    for (const t of transactions) {
      const catName = t.categories?.name?.toLowerCase() ?? ''
      let matched = false
      for (const [source, kws] of Object.entries(KEYWORDS)) {
        if (kws.some(kw => catName.includes(kw))) {
          depenses[source as keyof typeof depenses] += Number(t.amount)
          matched = true
          break
        }
      }
      // Les dépenses non catégorisées ou hors sources ne sont pas imputées
      void matched
    }

    // ── Calcul bénéfices ───────────────────────────────────────────────────────
    const calBenef = calRecettes - depenses.calendriers
    const brocBenef = brocantesRecettes - depenses.brocantes
    const boutBenef = boutiqueRecettes - depenses.boutique
    const evtBenef = evtRecettes - depenses.evenements

    const totalRecettes = calRecettes + brocantesRecettes + boutiqueRecettes + evtRecettes
    const totalDepenses = depenses.calendriers + depenses.brocantes + depenses.boutique + depenses.evenements
    const totalBenef = totalRecettes - totalDepenses

    setKpi({
      calendriers: {
        recettes: calRecettes,
        depenses: depenses.calendriers,
        benefice: calBenef,
        margePercent: calcMarge(calRecettes, depenses.calendriers),
        label: 'Calendriers',
        campagneName: campagne?.name ?? `Campagne ${year}`,
        campagneYear: year,
      },
      brocantes: {
        recettes: brocantesRecettes,
        depenses: depenses.brocantes,
        benefice: brocBenef,
        margePercent: calcMarge(brocantesRecettes, depenses.brocantes),
        label: 'Brocantes',
        evenementsCount: brocantesCount,
      },
      boutique: {
        recettes: boutiqueRecettes,
        depenses: depenses.boutique,
        benefice: boutBenef,
        margePercent: calcMarge(boutiqueRecettes, depenses.boutique),
        label: 'Boutique',
        commandesCount: commandes.length,
      },
      evenements: {
        recettes: evtRecettes,
        depenses: depenses.evenements,
        benefice: evtBenef,
        margePercent: calcMarge(evtRecettes, depenses.evenements),
        label: 'Événements',
        evenementsCount: evtCount,
      },
      total: {
        recettes: totalRecettes,
        depenses: totalDepenses,
        benefice: totalBenef,
        margePercent: calcMarge(totalRecettes, totalDepenses),
        label: 'Total annuel',
      },
      annee: year,
      loading: false,
    })
  }, [currentAssociation, year])

  useEffect(() => { fetchKPI() }, [fetchKPI])

  return { ...kpi, refetch: fetchKPI }
}
