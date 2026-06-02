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

export function useCalendrierAdressesMap(secteurId?: string) {
  const [adresses, setAdresses] = useState<CalendrierAdresseMap[]>([])
  const [loading, setLoading] = useState(true)
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
  const geocodeAddress = useCallback(
    async (id: string, streetName: string, number?: string | null) => {
      try {
        const query = number ? `${number} ${streetName}` : streetName
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=housenumber&limit=1`
        )
        const data = await response.json()

        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].geometry.coordinates
          const { error } = await supabase
            .from('calendrier_adresses')
            .update({
              latitude: lat,
              longitude: lng,
              geocoded_at: new Date().toISOString(),
            })
            .eq('id', id)

          if (!error) {
            await fetchAdresses()
            return { lat, lng }
          }
        }
      } catch (err) {
        console.error('Géocodage échoué:', err)
      }
      return null
    },
    [fetchAdresses]
  )

  // Filtrer les adresses avec coordonnées
  const adressesWithCoords = adresses.filter((a) => a.latitude && a.longitude)

  // Navigation entre adresses
  const goToAddressIndex = (index: number) => {
    if (index >= 0 && index < adresses.length) {
      setSelectedAddressIndex(index)
    }
  }

  const goToPrevious = () => {
    if (selectedAddressIndex !== null && selectedAddressIndex > 0) {
      goToAddressIndex(selectedAddressIndex - 1)
    }
  }

  const goToNext = () => {
    if (selectedAddressIndex !== null && selectedAddressIndex < adresses.length - 1) {
      goToAddressIndex(selectedAddressIndex + 1)
    }
  }

  const selectedAddress = selectedAddressIndex !== null ? adresses[selectedAddressIndex] : null

  return {
    adresses,
    adressesWithCoords,
    loading,
    selectedAddress,
    selectedAddressIndex,
    refetch: fetchAdresses,
    geocodeAddress,
    goToAddressIndex,
    goToPrevious,
    goToNext,
  }
}
