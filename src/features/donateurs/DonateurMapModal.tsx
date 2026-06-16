import { useEffect, useState, useRef } from 'react'
import { X, Loader } from 'lucide-react'
import type { Donateur } from '@/hooks/useDonateurs'

interface DonateurMapModalProps {
  isOpen: boolean
  donateur: Donateur | null
  onClose: () => void
}

export function DonateurMapModal({ isOpen, donateur, onClose }: DonateurMapModalProps) {
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!isOpen || !donateur) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      setMapCoords(null)
      setError(null)
      return
    }

    const geocode = async () => {
      if (!donateur.ville) {
        setError('Pas d\'adresse disponible')
        return
      }

      setLoading(true)
      setError(null)

      try {
        let query = `${donateur.adresse}, ${donateur.ville}, France`
        let response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
        )
        let results = await response.json()

        if (results.length === 0 && donateur.adresse) {
          query = `${donateur.ville}, France`
          response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
          )
          results = await response.json()
        }

        if (results.length > 0) {
          const { lat, lon } = results[0]
          setMapCoords({ lat: parseFloat(lat), lng: parseFloat(lon) })
        } else {
          setError('Adresse non trouvée')
        }
      } catch (err) {
        console.error('Erreur géocodage:', err)
        setError('Erreur de géolocalisation')
      } finally {
        setLoading(false)
      }
    }

    geocode()
  }, [isOpen, donateur])

  useEffect(() => {
    if (!mapCoords || !isOpen || !donateur) return

    const initMap = async () => {
      const mapEl = document.getElementById('donateur-map-modal')
      if (!mapEl) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      try {
        const L = (await import('leaflet')).default
        await import('leaflet/dist/leaflet.css')

        const map = L.map('donateur-map-modal', {
          attributionControl: false,
          zoomControl: true,
        }).setView([mapCoords.lat, mapCoords.lng], 16)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map)

        L.marker([mapCoords.lat, mapCoords.lng], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        })
          .bindPopup(`${donateur.prenom} ${donateur.nom}`)
          .addTo(map)

        mapInstanceRef.current = map
      } catch (err) {
        console.error('Erreur initialisation carte:', err)
      }
    }

    initMap()
  }, [mapCoords, isOpen, donateur])

  if (!isOpen || !donateur) return null

  const localisation = [donateur.adresse, donateur.ville].filter(Boolean).join(', ')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              {donateur.prenom} {donateur.nom}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">{localisation}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
            </div>
          ) : mapCoords ? (
            <div id="donateur-map-modal" className="w-full h-64 rounded-lg bg-gray-100" />
          ) : null}
        </div>
      </div>
    </div>
  )
}
