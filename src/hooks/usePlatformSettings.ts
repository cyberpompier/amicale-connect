import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function usePlatformSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('platform_settings').select('key, value')
    if (!error) {
      const map: Record<string, string> = {}
      for (const row of data || []) map[row.key] = row.value ?? ''
      setSettings(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    if (error) throw error
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return { settings, loading, updateSetting, refetch: fetchSettings }
}
