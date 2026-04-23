import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface AmicalisteStat {
  amicaliste_id: string
  first_name: string
  last_name: string
  grade: string | null
  total_amount: number
  total_calendriers: number
  ventes_count: number
  secteurs_count: number
}

export interface SecteurStat {
  secteur_id: string
  secteur_name: string
  color: string
  total_amount: number
  total_calendriers: number
  ventes_count: number
  objective_amount: number
  objective_calendriers: number
  progression_percent: number
  status: string
}

export interface DailyVente {
  date: string
  amount: number
  quantity: number
}

export function useCalendrierStats(campagneId?: string) {
  const { currentAssociation } = useAssociation()
  const [amicalisteStats, setAmicalisteStats] = useState<AmicalisteStat[]>([])
  const [secteurStats, setSecteurStats] = useState<SecteurStat[]>([])
  const [dailyVentes, setDailyVentes] = useState<DailyVente[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [totalCalendriers, setTotalCalendriers] = useState(0)
  const [totalVentes, setTotalVentes] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!currentAssociation || !campagneId) { setLoading(false); return }
    setLoading(true)

    // Récupérer toutes les ventes de la campagne avec données liées
    const { data: ventes, error } = await supabase
      .from('calendrier_ventes')
      .select(`
        *,
        amicalistes(id, first_name, last_name, grade),
        calendrier_secteurs(id, name, color, objective_amount, objective_calendriers, status)
      `)
      .eq('association_id', currentAssociation.id)
      .eq('campagne_id', campagneId)

    if (error || !ventes) {
      setLoading(false)
      return
    }

    // Total global
    const total = ventes.reduce((sum, v) => sum + Number(v.amount), 0)
    const totalQty = ventes.reduce((sum, v) => sum + v.quantity, 0)
    setTotalAmount(total)
    setTotalCalendriers(totalQty)
    setTotalVentes(ventes.length)

    // Stats par amicaliste
    const amicalisteMap = new Map<string, AmicalisteStat>()
    ventes.forEach((v: any) => {
      if (!v.amicaliste_id || !v.amicalistes) return
      const existing = amicalisteMap.get(v.amicaliste_id)
      if (existing) {
        existing.total_amount += Number(v.amount)
        existing.total_calendriers += v.quantity
        existing.ventes_count += 1
      } else {
        amicalisteMap.set(v.amicaliste_id, {
          amicaliste_id: v.amicaliste_id,
          first_name: v.amicalistes.first_name,
          last_name: v.amicalistes.last_name,
          grade: v.amicalistes.grade,
          total_amount: Number(v.amount),
          total_calendriers: v.quantity,
          ventes_count: 1,
          secteurs_count: 0,
        })
      }
    })

    // Compter les secteurs distincts par amicaliste
    const amicalisteSecteurs = new Map<string, Set<string>>()
    ventes.forEach((v: any) => {
      if (!v.amicaliste_id) return
      if (!amicalisteSecteurs.has(v.amicaliste_id)) {
        amicalisteSecteurs.set(v.amicaliste_id, new Set())
      }
      amicalisteSecteurs.get(v.amicaliste_id)!.add(v.secteur_id)
    })
    amicalisteSecteurs.forEach((secteurs, amicalisteId) => {
      const stat = amicalisteMap.get(amicalisteId)
      if (stat) stat.secteurs_count = secteurs.size
    })

    setAmicalisteStats(Array.from(amicalisteMap.values()).sort((a, b) => b.total_amount - a.total_amount))

    // Stats par secteur
    const secteurMap = new Map<string, SecteurStat>()
    ventes.forEach((v: any) => {
      if (!v.calendrier_secteurs) return
      const existing = secteurMap.get(v.secteur_id)
      if (existing) {
        existing.total_amount += Number(v.amount)
        existing.total_calendriers += v.quantity
        existing.ventes_count += 1
      } else {
        const secteur = v.calendrier_secteurs
        secteurMap.set(v.secteur_id, {
          secteur_id: v.secteur_id,
          secteur_name: secteur.name,
          color: secteur.color,
          status: secteur.status,
          total_amount: Number(v.amount),
          total_calendriers: v.quantity,
          ventes_count: 1,
          objective_amount: Number(secteur.objective_amount),
          objective_calendriers: secteur.objective_calendriers,
          progression_percent: 0,
        })
      }
    })

    // Calcul progression
    secteurMap.forEach((stat) => {
      stat.progression_percent = stat.objective_amount > 0
        ? Math.min(100, (stat.total_amount / stat.objective_amount) * 100)
        : 0
    })

    setSecteurStats(Array.from(secteurMap.values()).sort((a, b) => b.total_amount - a.total_amount))

    // Ventes par jour (derniers 30 jours)
    const dailyMap = new Map<string, DailyVente>()
    ventes.forEach((v: any) => {
      const date = v.sale_date
      const existing = dailyMap.get(date)
      if (existing) {
        existing.amount += Number(v.amount)
        existing.quantity += v.quantity
      } else {
        dailyMap.set(date, { date, amount: Number(v.amount), quantity: v.quantity })
      }
    })

    setDailyVentes(
      Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    )

    setLoading(false)
  }, [currentAssociation, campagneId])

  useEffect(() => { fetchStats() }, [fetchStats])

  return {
    amicalisteStats,
    secteurStats,
    dailyVentes,
    totalAmount,
    totalCalendriers,
    totalVentes,
    loading,
    refetch: fetchStats,
  }
}
