import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/features/auth/AuthContext'

export function usePlatformAdmin() {
  const { user } = useAuthContext()
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsPlatformAdmin(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setIsPlatformAdmin(!!data)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  return { isPlatformAdmin, loading }
}
