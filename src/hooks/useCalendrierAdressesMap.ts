import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface CalendrierAdresseMap {
  id: string
  secteur_id: string
  street_name: string
  number: string | null
  building: string | null
  status: 'todo' | 'done' | 'absent' | 'refuse' | 'skip'
  city: string | null
  latitude: number | null
  longitude: number | null
  geocoded_at: string | null
  visited_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function useCalendrierAdressesMap(
  secteurId?: string,
  city?: string | null,
  postalCode?: string | null
) {
  const [adresses, setAdresses] = useState<CalendrierAdresseMap[]>([])
  const [loading, setLoading] = useState(true)
  const [geocodingProgress, setGeocodingProgress] = useState(0)
  const [geocodingTotal, setGeocodingTotal] = useState(0)
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null)

  const fetchAdresses = useCallback(async () => {
    if (!secteurId) {
      setLoading(false)
      return
    }
    setLoading(true)

    const { data, error } = await supabase
      .from('calendrier_adresses')
      .select('*')
      .eq('secteur_id', secteurId)
      .order('street_name', { ascending: true })
      .order('number', { ascending: true })

    if (!error && data) {
      setAdresses(data as CalendrierAdresseMap[])
    }
    setLoading(false)
  }, [secteurId])

  useEffect(() => {
    fetchAdresses()
  }, [fetchAdresses])

  // Géocoder une adresse via API Adresse (data.gouv.fr)
  const geocodeOne = useCallback(
    async (addr: CalendrierAdresseMap): Promise<{ lat: number; lng: number } | null> => {
      try {
        const hasNumber = !!addr.number?.trim()
        const streetPart = hasNumber ? `${addr.number} ${addr.street_name}` : addr.street_name
        // Cascade : ville de l'adresse → ville du secteur → ville de l'association
        const resolvedCity = addr.city || city
        const cityPart = resolvedCity ? ` ${resolvedCity}` : ''
        const query = `${streetPart}${cityPart}`

        // 1er essai : avec numéro de rue (type housenumber si numéro présent)
        const params = new URLSearchParams({ q: query, limit: '1' })
        if (postalCode) params.append('postcode', postalCode)
        if (hasNumber) params.append('type', 'housenumber')

        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?${params.toString()}`
        )
        if (!response.ok) return null

        const data = await response.json()

        let coords: { lat: number; lng: number } | null = null

        if (data.features && data.features.length > 0) {
          const feature = data.features[0]
          const score = feature.properties.score
          const type = feature.properties.type

          // Résultat housenumber exact → on accepte même avec score moyen
          if (type === 'housenumber' && score >= 0.3) {
            const [lng, lat] = feature.geometry.coordinates
            coords = { lat, lng }
          }
          // Résultat sans numéro → score plus strict
          else if (score >= 0.5) {
            const [lng, lat] = feature.geometry.coordinates
            coords = { lat, lng }
          }
        }

        // 2ème essai sans type=housenumber si aucun résultat (fallback rue)
        if (!coords && hasNumber) {
          const fallbackParams = new URLSearchParams({ q: query, limit: '1' })
          if (postalCode) fallbackParams.append('postcode', postalCode)
          const fallbackRes = await fetch(
            `https://api-adresse.data.gouv.fr/search/?${fallbackParams.toString()}`
          )
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json()
            if (fallbackData.features?.length > 0 && fallbackData.features[0].properties.score >= 0.4) {
              const [lng, lat] = fallbackData.features[0].geometry.coordinates
              coords = { lat, lng }
            }
          }
        }

        if (coords) {
          await supabase
            .from('calendrier_adresses')
            .update({
              latitude: coords.lat,
              longitude: coords.lng,
              geocoded_at: new Date().toISOString(),
            })
            .eq('id', addr.id)
          return coords
        }
      } catch (err) {
        console.error('Géocodage échoué pour', addr.street_name, err)
      }
      return null
    },
    [city, postalCode]
  )

  // Auto-géocodage de toutes les adresses sans coordonnées
  // (ou déjà géocodées SANS numéro alors qu'elles en ont un → re-géocodage précis)
  const autoGeocode = useCallback(async () => {
    const toGeocode = adresses.filter(
      (a) =>
        !a.latitude ||
        !a.longitude ||
        // Re-géocoder si l'adresse a un numéro mais n'a pas encore été géocodée avec précision
        (a.number?.trim() && !a.geocoded_at)
    )
    if (toGeocode.length === 0) return

    setGeocodingTotal(toGeocode.length)
    setGeocodingProgress(0)

    for (let i = 0; i < toGeocode.length; i++) {
      const result = await geocodeOne(toGeocode[i])
      if (result) {
        // Mettre à jour localement sans refetch complet
        setAdresses((prev) =>
          prev.map((a) =>
            a.id === toGeocode[i].id
              ? { ...a, latitude: result.lat, longitude: result.lng }
              : a
          )
        )
      }
      setGeocodingProgress(i + 1)
      // Petit délai pour ne pas surcharger l'API (5 req/s max)
      await new Promise((r) => setTimeout(r, 220))
    }

    setGeocodingTotal(0)
    setGeocodingProgress(0)
  }, [adresses, geocodeOne])

  // Lancer l'auto-géocodage dès que les adresses sont chargées
  useEffect(() => {
    if (loading) return
    const hasUngeocoded = adresses.some((a) => !a.latitude || !a.longitude)
    if (hasUngeocoded) {
      autoGeocode()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // Adresses avec coordonnées
  const adressesWithCoords = adresses.filter(
    (a) => a.latitude != null && a.longitude != null
  )

  // Navigation
  const goToAddressIndex = (index: number) => {
    if (index >= 0 && index < adressesWithCoords.length) {
      setSelectedAddressIndex(index)
    }
  }
  const goToPrevious = () => {
    if (selectedAddressIndex !== null && selectedAddressIndex > 0) {
      setSelectedAddressIndex(selectedAddressIndex - 1)
    }
  }
  const goToNext = () => {
    if (selectedAddressIndex !== null && selectedAddressIndex < adressesWithCoords.length - 1) {
      setSelectedAddressIndex(selectedAddressIndex + 1)
    }
  }

  const selectedAddress =
    selectedAddressIndex !== null ? adressesWithCoords[selectedAddressIndex] : null

  const isGeocoding = geocodingTotal > 0

  return {
    adresses,
    adressesWithCoords,
    loading,
    isGeocoding,
    geocodingProgress,
    geocodingTotal,
    selectedAddress,
    selectedAddressIndex,
    refetch: fetchAdresses,
    goToAddressIndex,
    goToPrevious,
    goToNext,
  }
}
