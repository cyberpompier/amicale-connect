import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, AlertTriangle, Package, TrendingDown, ArrowRightLeft, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierSecteurs } from '@/hooks/useCalendrierSecteurs'

interface StockData {
  secteur_id: string
  secteur_name: string
  allocated_qty: number
  used_qty: number
  returned_qty: number
}

interface StockMovement {
  id: string
  secteur_id: string
  secteur_name: string
  from_qty: number
  to_qty: number
  action: string
  created_at: string
  created_by: string | null
}

export function CalendriersStockPage() {
  const navigate = useNavigate()
  const { currentAssociation } = useAssociation()
  const { activeCampagne, loading: campLoading } = useCalendrierCampagnes()
  const { secteurs } = useCalendrierSecteurs(activeCampagne?.id)

  const [stockData, setStockData] = useState<StockData[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [showRedistribute, setShowRedistribute] = useState(false)
  const [selectedSecteur, setSelectedSecteur] = useState<string | null>(null)
  const [newQty, setNewQty] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showReceiveDelivery, setShowReceiveDelivery] = useState(false)
  const [deliveryQty, setDeliveryQty] = useState<number>(0)
  const [distributionMode, setDistributionMode] = useState<'equal' | 'by_objective'>('equal')

  // Charger les données de stock
  useEffect(() => {
    const fetchStockData = async () => {
      if (!activeCampagne || !currentAssociation) return

      setLoading(true)
      try {
        // Charger TOUS les secteurs
        const { data: secteurs } = await supabase
          .from('calendrier_secteurs')
          .select(
            `
            id,
            name,
            calendrier_stocks(allocated_qty, used_qty, returned_qty)
          `
          )
          .eq('campagne_id', activeCampagne.id)
          .order('name', { ascending: true })

        if (secteurs) {
          const stocks = secteurs.map((s: any) => ({
            secteur_id: s.id,
            secteur_name: s.name,
            allocated_qty: s.calendrier_stocks?.allocated_qty ?? 0,
            used_qty: s.calendrier_stocks?.used_qty ?? 0,
            returned_qty: s.calendrier_stocks?.returned_qty ?? 0,
          }))
          setStockData(stocks)
        }

        // Charger l'historique des mouvements
        const { data: hist } = await supabase
          .from('calendrier_stock_movements')
          .select('*')
          .eq('association_id', currentAssociation.id)
          .eq('campagne_id', activeCampagne.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (hist) {
          setMovements(hist as StockMovement[])
        }
      } catch (err) {
        console.error('Erreur chargement stock:', err)
      }
      setLoading(false)
    }

    fetchStockData()
  }, [activeCampagne, currentAssociation])

  // Calculs
  const stats = useMemo(() => {
    const totalAllocated = stockData.reduce((sum, s) => sum + s.allocated_qty, 0)
    const totalUsed = stockData.reduce((sum, s) => sum + s.used_qty, 0)
    const totalReturned = stockData.reduce((sum, s) => sum + s.returned_qty, 0)
    const remaining = totalAllocated - totalUsed - totalReturned
    const utilizationPercent = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0

    // Secteurs en rupture de stock (remaining <= 0)
    const lowStockSectors = stockData.filter((s) => s.allocated_qty - s.used_qty - s.returned_qty <= 0)

    return {
      totalAllocated,
      totalUsed,
      totalReturned,
      remaining,
      utilizationPercent,
      lowStockSectors,
    }
  }, [stockData])

  const handleReceiveDelivery = async () => {
    if (!activeCampagne || !currentAssociation || deliveryQty <= 0) return
    setSaving(true)

    try {
      console.log('=== RECEIVE DELIVERY START ===')
      console.log('Total delivery qty:', deliveryQty)
      console.log('Distribution mode:', distributionMode)

      // Récupérer tous les secteurs de la campagne avec leurs données
      const { data: campaignSecteurs, error: fetchError } = await supabase
        .from('calendrier_secteurs')
        .select('id, name, objective_calendriers')
        .eq('campagne_id', activeCampagne.id)
        .order('name', { ascending: true })

      if (fetchError) throw fetchError

      if (!campaignSecteurs || campaignSecteurs.length === 0) {
        alert('Aucun secteur trouvé pour cette campagne')
        return
      }

      // Calculer la distribution
      let allocation: { [key: string]: number } = {}

      if (distributionMode === 'equal') {
        // Distribution équitable
        const qtyPerSecteur = Math.floor(deliveryQty / campaignSecteurs.length)
        const remainder = deliveryQty % campaignSecteurs.length

        campaignSecteurs.forEach((s, idx) => {
          allocation[s.id] = qtyPerSecteur + (idx < remainder ? 1 : 0)
        })
        console.log('Equal distribution:', allocation)
      } else {
        // Distribution selon objectifs
        const totalObjective = campaignSecteurs.reduce((sum, s) => sum + (s.objective_calendriers || 0), 0)

        if (totalObjective === 0) {
          // Fallback à équitable si pas d'objectif
          const qtyPerSecteur = Math.floor(deliveryQty / campaignSecteurs.length)
          campaignSecteurs.forEach((s) => {
            allocation[s.id] = qtyPerSecteur
          })
        } else {
          campaignSecteurs.forEach((s) => {
            allocation[s.id] = Math.round((s.objective_calendriers / totalObjective) * deliveryQty)
          })
        }
        console.log('Objective-based distribution:', allocation)
      }

      // Mettre à jour/créer le stock pour chaque secteur
      for (const secteur of campaignSecteurs) {
        const allocQty = allocation[secteur.id] || 0

        // Vérifier si stock existe
        const { data: existingStock } = await supabase
          .from('calendrier_stocks')
          .select('id, allocated_qty')
          .eq('secteur_id', secteur.id)
          .single()

        if (existingStock) {
          // Ajouter à l'allocation existante
          const newAllocQty = existingStock.allocated_qty + allocQty
          await supabase
            .from('calendrier_stocks')
            .update({ allocated_qty: newAllocQty })
            .eq('id', existingStock.id)

          // Enregistrer le mouvement
          await supabase.from('calendrier_stock_movements').insert({
            association_id: currentAssociation.id,
            campagne_id: activeCampagne.id,
            secteur_id: secteur.id,
            secteur_name: secteur.name,
            from_qty: existingStock.allocated_qty,
            to_qty: newAllocQty,
            action: 'delivery_received',
            created_at: new Date().toISOString(),
          })
        } else {
          // Créer nouveau stock
          await supabase
            .from('calendrier_stocks')
            .insert({
              secteur_id: secteur.id,
              allocated_qty: allocQty,
              used_qty: 0,
              returned_qty: 0,
            })

          // Enregistrer le mouvement
          await supabase.from('calendrier_stock_movements').insert({
            association_id: currentAssociation.id,
            campagne_id: activeCampagne.id,
            secteur_id: secteur.id,
            secteur_name: secteur.name,
            from_qty: 0,
            to_qty: allocQty,
            action: 'delivery_received',
            created_at: new Date().toISOString(),
          })
        }
      }

      console.log('Delivery processed for all sectors')

      // Attendre et refetch
      await new Promise(resolve => setTimeout(resolve, 500))

      const { data: freshSecteurs } = await supabase
        .from('calendrier_secteurs')
        .select(`
          id,
          name,
          calendrier_stocks(id, allocated_qty, used_qty, returned_qty)
        `)
        .eq('campagne_id', activeCampagne.id)
        .order('name', { ascending: true })

      if (freshSecteurs) {
        const stocks = freshSecteurs.map((s: any) => ({
          secteur_id: s.id,
          secteur_name: s.name,
          allocated_qty: s.calendrier_stocks?.allocated_qty ?? 0,
          used_qty: s.calendrier_stocks?.used_qty ?? 0,
          returned_qty: s.calendrier_stocks?.returned_qty ?? 0,
        }))
        setStockData(stocks)
      }

      // Fermer le modal
      setShowReceiveDelivery(false)
      setDeliveryQty(0)
      console.log('=== RECEIVE DELIVERY END ===')
    } catch (err: any) {
      console.error('Erreur réception livraison:', err)
      alert(err?.message ?? 'Erreur lors de la réception de livraison')
    }
    setSaving(false)
  }

  const handleRedistribute = async () => {
    if (!selectedSecteur || !activeCampagne || !currentAssociation) return
    setSaving(true)

    try {
      const sector = stockData.find((s) => s.secteur_id === selectedSecteur)
      if (!sector) return

      const oldQty = sector.allocated_qty
      console.log('=== REDISTRIBUTION START ===')
      console.log('Selected secteur:', selectedSecteur)
      console.log('Old qty:', oldQty)
      console.log('New qty:', newQty)
      console.log('Campaign ID:', activeCampagne.id)

      // Vérifier si une entrée stock existe pour ce secteur
      const { data: existingStock, error: checkError } = await supabase
        .from('calendrier_stocks')
        .select('id, allocated_qty, secteur_id')
        .eq('secteur_id', selectedSecteur)
        .single()

      console.log('Check existing stock error:', checkError?.message)
      console.log('Existing stock:', existingStock)

      if (existingStock && !checkError) {
        // Mettre à jour l'entrée existante
        console.log('UPDATE PATH: Updating stock ID:', existingStock.id)
        const { data: updateData, error: updateError } = await supabase
          .from('calendrier_stocks')
          .update({ allocated_qty: newQty })
          .eq('id', existingStock.id)
          .select()

        if (updateError) throw updateError
        console.log('Update result:', updateData)
        console.log('Stock mis à jour pour secteur:', selectedSecteur, 'Nouveau qty:', newQty)
      } else {
        // Créer une nouvelle entrée
        console.log('INSERT PATH: Creating new stock entry for secteur:', selectedSecteur)
        const { data: insertData, error: insertError } = await supabase
          .from('calendrier_stocks')
          .insert({
            secteur_id: selectedSecteur,
            allocated_qty: newQty,
            used_qty: 0,
            returned_qty: 0,
          })
          .select()

        if (insertError) throw insertError
        console.log('Insert result:', insertData)
        console.log('Stock créé pour secteur:', selectedSecteur, 'Qty:', newQty)
      }

      // Enregistrer le mouvement de stock
      console.log('Recording movement...')
      const { data: mvtData, error: mvtError } = await supabase.from('calendrier_stock_movements').insert({
        association_id: currentAssociation.id,
        campagne_id: activeCampagne.id,
        secteur_id: selectedSecteur,
        secteur_name: sector.secteur_name,
        from_qty: oldQty,
        to_qty: newQty,
        action: oldQty === 0 ? 'allocation_initial' : newQty > oldQty ? 'redistribution_in' : 'redistribution_out',
        created_at: new Date().toISOString(),
      }).select()

      if (mvtError) throw mvtError
      console.log('Movement recorded:', mvtData)

      // Attendre que les modifications soient persistées
      console.log('Waiting 500ms for DB to persist...')
      await new Promise(resolve => setTimeout(resolve, 500))

      // Vérifier directement que les données sont dans la base
      console.log('Verifying stock was saved in DB...')
      const { data: verifyStock, error: verifyError } = await supabase
        .from('calendrier_stocks')
        .select('*')
        .eq('secteur_id', selectedSecteur)
        .single()

      console.log('Verify error:', verifyError?.message)
      console.log('Verify stock in DB:', verifyStock)

      // Refetch les données fraîches depuis la base
      console.log('Fetching all secteurs with stocks...')
      const { data: freshSecteurs, error: fetchError } = await supabase
        .from('calendrier_secteurs')
        .select(`
          id,
          name,
          calendrier_stocks(id, allocated_qty, used_qty, returned_qty)
        `)
        .eq('campagne_id', activeCampagne.id)
        .order('name', { ascending: true })

      console.log('Fetch error:', fetchError?.message)
      console.log('Fresh secteurs from DB:', JSON.stringify(freshSecteurs, null, 2))

      if (fetchError) throw fetchError

      if (freshSecteurs) {
        const stocks = freshSecteurs.map((s: any) => ({
          secteur_id: s.id,
          secteur_name: s.name,
          allocated_qty: s.calendrier_stocks?.allocated_qty ?? 0,
          used_qty: s.calendrier_stocks?.used_qty ?? 0,
          returned_qty: s.calendrier_stocks?.returned_qty ?? 0,
        }))
        console.log('Processed stocks for state:', stocks)
        setStockData(stocks)
        console.log('State updated with new stocks')
      }

      // Fermer le modal
      setShowRedistribute(false)
      setSelectedSecteur(null)
      setNewQty(0)
      console.log('=== REDISTRIBUTION END ===')
    } catch (err: any) {
      console.error('Erreur redistribution:', err)
      console.error('Full error:', JSON.stringify(err, null, 2))
      alert(err?.message ?? 'Erreur lors de la redistribution')
    }
    setSaving(false)
  }

  if (campLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!activeCampagne) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
        <p className="text-[var(--color-text-muted)]">Aucune campagne active.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Gestion du Stock</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{activeCampagne.name}</p>
        </div>
      </div>

      {/* Alertes rupture de stock */}
      {stats.lowStockSectors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">Rupture de stock détectée</p>
              <p className="text-sm text-red-700 mt-1">
                {stats.lowStockSectors.length} secteur(s) sans stock disponible :
              </p>
              <ul className="mt-2 space-y-1">
                {stats.lowStockSectors.map((s) => (
                  <li key={s.secteur_id} className="text-sm text-red-700">
                    • {s.secteur_name} ({s.allocated_qty - s.used_qty - s.returned_qty} restant)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-600" />
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Total alloué</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.totalAllocated}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Utilisé</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.totalUsed}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-orange-600" />
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Restant</p>
          </div>
          <p className="text-2xl font-bold text-orange-700">{stats.remaining}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-purple-600" />
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Utilisation</p>
          </div>
          <p className="text-2xl font-bold text-purple-700">{stats.utilizationPercent.toFixed(0)}%</p>
        </div>
      </div>

      {/* Barre de progression globale */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm">
        <p className="text-sm font-bold text-[var(--color-text)] mb-3">Utilisation globale</p>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-primary)] to-orange-500 transition-all duration-500"
            style={{ width: `${Math.min(100, stats.utilizationPercent)}%` }}
          />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          {stats.totalUsed} / {stats.totalAllocated} calendriers utilisés
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowReceiveDelivery(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Package className="w-4 h-4" /> Recevoir livraison
        </button>
        <button
          onClick={() => setShowRedistribute(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <ArrowRightLeft className="w-4 h-4" /> Redistribuer stock
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-sm font-semibold transition-colors"
        >
          <History className="w-4 h-4" /> Historique
        </button>
      </div>

      {/* Tableau des stocks par secteur */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
            <Package className="w-4 h-4 text-[var(--color-primary)]" />
            Stock par secteur
          </h2>
        </div>

        {stockData.length === 0 ? (
          <p className="p-6 text-xs text-[var(--color-text-muted)] italic text-center">
            Aucun stock enregistré.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left font-bold text-[var(--color-text)]">Secteur</th>
                  <th className="px-4 py-3 text-right font-bold text-[var(--color-text)]">Alloué</th>
                  <th className="px-4 py-3 text-right font-bold text-[var(--color-text)]">Utilisé</th>
                  <th className="px-4 py-3 text-right font-bold text-[var(--color-text)]">Retourné</th>
                  <th className="px-4 py-3 text-right font-bold text-[var(--color-text)]">Restant</th>
                  <th className="px-4 py-3 text-center font-bold text-[var(--color-text)]">Utilisation</th>
                  <th className="px-4 py-3 text-center font-bold text-[var(--color-text)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {stockData.map((stock, idx) => {
                  const remaining = stock.allocated_qty - stock.used_qty - stock.returned_qty
                  const utilization =
                    stock.allocated_qty > 0 ? (stock.used_qty / stock.allocated_qty) * 100 : 0
                  const isLowStock = remaining <= 0

                  return (
                    <tr key={stock.secteur_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-secondary)]'}>
                      <td className="px-4 py-3 font-semibold text-[var(--color-text)]">
                        {stock.secteur_name}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-text)]">
                        {stock.allocated_qty}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-text)]">
                        {stock.used_qty}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-text)]">
                        {stock.returned_qty}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          isLowStock
                            ? 'text-red-600'
                            : remaining < stock.allocated_qty / 4
                            ? 'text-orange-600'
                            : 'text-green-600'
                        }`}
                      >
                        {remaining}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                utilization > 80
                                  ? 'bg-red-500'
                                  : utilization > 50
                                  ? 'bg-orange-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, utilization)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedSecteur(stock.secteur_id)
                            setNewQty(stock.allocated_qty || 0)
                            setShowRedistribute(true)
                          }}
                          className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                            stock.allocated_qty === 0
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10'
                          }`}
                        >
                          {stock.allocated_qty === 0 ? 'Ajouter stock' : 'Modifier'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historique */}
      {showHistory && movements.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-[var(--color-primary)]" />
            Historique des mouvements (20 derniers)
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg text-sm">
                <div className="flex-1">
                  <p className="font-semibold text-[var(--color-text)]">{m.secteur_name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {m.from_qty} → {m.to_qty} ({m.action})
                  </p>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {new Date(m.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Recevoir Livraison */}
      {showReceiveDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full">
            <div className="border-b border-[var(--color-border)] p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Recevoir une livraison</h3>
              <button
                onClick={() => setShowReceiveDelivery(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase mb-2">
                  Campagne
                </label>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {activeCampagne?.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase mb-2">
                  Quantité reçue
                </label>
                <input
                  type="number"
                  min="1"
                  value={deliveryQty}
                  onChange={(e) => setDeliveryQty(Number(e.target.value))}
                  placeholder="Ex: 500"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase mb-2">
                  Distribution
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={distributionMode === 'equal'}
                      onChange={() => setDistributionMode('equal')}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-[var(--color-text)]">Équitable (même quantité par secteur)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={distributionMode === 'by_objective'}
                      onChange={() => setDistributionMode('by_objective')}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-[var(--color-text)]">Selon objectifs des secteurs</span>
                  </label>
                </div>
              </div>

              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 text-sm">
                <p className="text-[var(--color-text-muted)]">
                  La livraison sera distribuée entre {stockData.length} secteur(s)
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] p-4 flex gap-2">
              <button
                onClick={() => setShowReceiveDelivery(false)}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-sm font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReceiveDelivery}
                disabled={saving || deliveryQty <= 0}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Redistribution */}
      {showRedistribute && selectedSecteur && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full">
            <div className="border-b border-[var(--color-border)] p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Redistribuer le stock</h3>
              <button
                onClick={() => setShowRedistribute(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase mb-2">
                  Secteur
                </label>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {stockData.find((s) => s.secteur_id === selectedSecteur)?.secteur_name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase mb-2">
                  Nouvelle quantité
                </label>
                <input
                  type="number"
                  min="0"
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                />
              </div>

              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 text-sm">
                <p className="text-[var(--color-text-muted)]">
                  Changement :{' '}
                  <span
                    className={`font-bold ${
                      newQty > (stockData.find((s) => s.secteur_id === selectedSecteur)?.allocated_qty ?? 0)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {newQty - (stockData.find((s) => s.secteur_id === selectedSecteur)?.allocated_qty ?? 0)}
                  </span>
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] p-4 flex gap-2">
              <button
                onClick={() => setShowRedistribute(false)}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-sm font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleRedistribute}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
