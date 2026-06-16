import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface PlatformProductStat {
  global_produit_id: string
  product_name: string
  nb_associations_actives: number
  total_revenue: number
  total_commission: number
  total_quantity: number
  cost_price: number | null
  total_margin: number
}

export function usePlatformDropshippingStats() {
  const [stats, setStats] = useState<PlatformProductStat[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_platform_dropshipping_stats')
    if (!error) setStats(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  return { stats, loading, refetch: fetchStats }
}
