import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface CalendrierAdresseMap {
  id: string
  secteur_id: string
  street_name: string
  number: string | null
  building: string | null
  status: 'todo' | 'done' | 'absent' | 'refuse' | 'skip'
  latitude: number | null
  longitude: number | null
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
        // Construire la requête avec numéro + rue + ville + code postal
        const streetPart = addr.number ? `${addr.number} ${addr.street_name}` : addr.street_name
        const cityPart = city ? ` ${city}` : ''
        const query = `${streetPart}${cityPart}`

        const params = new URLSearchParams({
          q: query,
          limit: '1',
        })
        if (postalCode) params.append('postcode', postalCode)

        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?${params.toString()}`
        )
        if (!response.ok) return null

        const data = await response.json()
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].geometry.coordinates
          const score = data.features[0].properties.score

          // On n'accepte que les résultats avec un bon score de confiance
          if (score < 0.5) return null

          await supabase
            .from('calendrier_adresses')
            .update({
              latitude: lat,
              longitude: lng,
              geocoded_at: new Date().toISOString(),
            })
            .eq('id', addr.id)

          return { lat, lng }
        }
      } catch (err) {
        console.error('Géocodage échoué pour', addr.street_name, err)
      }
      return null
    },
    [city, postalCode]
  )

  // Auto-géocodage de toutes les adresses sans coordonnées
  const autoGeocode = useCallback(async () => {
    const toGeocode = adresses.filter((a) => !a.latitude || !a.longitude)
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
