import { useEffect, useState, useRef } from 'react'
import { X, Mail, Phone, MapPin, Gift, Calendar, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'
import type { Donateur, DonVente } from '@/hooks/useDonateurs'

interface DonateurDetailModalProps {
  isOpen: boolean
  donateur: Donateur | null
  onClose: () => void
  fetchDons: (donateur: Donateur) => Promise<DonVente[]>
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  check: 'Chèque',
  card: 'Carte',
  transfer: 'Virement',
  other: 'Autre',
}

export function DonateurDetailModal({
  isOpen,
  donateur,
  onClose,
  fetchDons,
}: DonateurDetailModalProps) {
  const [dons, setDons] = useState<DonVente[]>([])
  const [loading, setLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const mapInstanceRef = useRef<any>(null)

  // Réinitialiser les états quand le donateur change
  useEffect(() => {
    if (donateur) {
      // Nettoyer la carte précédente
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      // Réinitialiser les états de la carte
      setShowMap(false)
      setMapCoords(null)

      // Charger les dons du nouveau donateur
      setLoading(true)
      fetchDons(donateur)
        .then(setDons)
        .finally(() => setLoading(false))
    } else {
      setDons([])
    }
  }, [donateur, isOpen])

  // Géocoder l'adresse et initialiser la carte
  useEffect(() => {
    if (!showMap || !donateur || mapCoords) return

    const geocodeAddress = async () => {
      if (!donateur.ville) return

      setGeocodingLoading(true)
      try {
        // Essayer d'abord avec l'adresse complète
        let query = `${donateur.adresse}, ${donateur.ville}, France`
        let response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
        )
        let results = await response.json()

        // Si pas de résultats avec l'adresse complète, essayer juste la ville
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
        }
      } catch (err) {
        console.error('Erreur géocodage:', err)
      } finally {
        setGeocodingLoading(false)
      }
    }

    geocodeAddress()
  }, [showMap, donateur, mapCoords])

  // Initialiser Leaflet quand les coords sont disponibles
  useEffect(() => {
    if (!showMap || !mapCoords || mapInstanceRef.current) return

    const initMap = async () => {
      const mapEl = document.getElementById(`map-donateur-${donateur?.id}`)
      if (!mapEl) return

      try {
        const L = (await import('leaflet')).default
        await import('leaflet/dist/leaflet.css')

        const map = L.map(`map-donateur-${donateur?.id}`, {
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
          .bindPopup(`${donateur?.prenom} ${donateur?.nom}`)
          .addTo(map)

        mapInstanceRef.current = map
      } catch (err) {
        console.error('Erreur initialisation carte:', err)
      }
    }

    initMap()
  }, [showMap, mapCoords, donateur])

  // Cleanup au fermeture du modal
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isOpen])

  if (!isOpen || !donateur) return null

  const localisation = [donateur.adresse, donateur.ville].filter(Boolean).join(', ')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              {donateur.prenom} {donateur.nom}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">Fiche donateur</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Coordonnées */}
          <div className="grid sm:grid-cols-2 gap-4">
            {donateur.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-[var(--color-text-muted)]" />
                <a
                  href={`mailto:${donateur.email}`}
                  className="text-[var(--color-text)] hover:text-[var(--color-primary)]"
                >
                  {donateur.email}
                </a>
              </div>
            )}
            {donateur.telephone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-[var(--color-text-muted)]" />
                <a
                  href={`tel:${donateur.telephone}`}
                  className="text-[var(--color-text)] hover:text-[var(--color-primary)]"
                >
                  {donateur.telephone}
                </a>
              </div>
            )}
            {localisation && (
              <button
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-2 text-sm sm:col-span-2 hover:text-[var(--color-primary)] transition group"
              >
                <MapPin className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]" />
                <span className="text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                  {localisation}
                </span>
                {showMap ? (
                  <ChevronUp className="w-4 h-4 ml-auto text-[var(--color-primary)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto text-[var(--color-text-muted)]" />
                )}
              </button>
            )}
          </div>

          {/* Carte */}
          {showMap && localisation && (
            <div className="space-y-2">
              {geocodingLoading ? (
                <div className="flex items-center justify-center bg-gray-100 rounded-xl h-64">
                  <div className="animate-spin w-6 h-6 border-3 border-[var(--color-primary)] border-t-transparent rounded-full" />
                </div>
              ) : mapCoords ? (
                <div id={`map-donateur-${donateur.id}`} className="w-full h-64 rounded-xl bg-gray-100" />
              ) : (
                <div className="flex items-center justify-center bg-gray-100 rounded-xl h-64 text-sm text-[var(--color-text-muted)]">
                  Localisation non trouvée
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-primary)]">
                {Number(donateur.total_dons).toFixed(2)} €
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">Total donné</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-text)]">
                {donateur.nombre_dons}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">Nombre de dons</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-sm font-bold text-[var(--color-text)] mt-1">
                {donateur.derniere_donation
                  ? new Date(donateur.derniere_donation).toLocaleDateString('fr-FR')
                  : '—'}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">Dernier don</div>
            </div>
          </div>

          {/* Notes */}
          {donateur.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-[var(--color-text)]">
              {donateur.notes}
            </div>
          )}

          {/* Liste des dons */}
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text)] mb-3">
              <Gift className="w-5 h-5 text-[var(--color-primary)]" />
              Historique des dons
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
              </div>
            ) : dons.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
                Aucun don enregistré pour ce donateur.
              </p>
            ) : (
              <div className="space-y-2">
                {dons.map((don) => (
                  <div
                    key={don.id}
                    className="flex items-center justify-between p-3 border border-[var(--color-border)] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(don.sale_date).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mt-0.5">
                          <CreditCard className="w-3.5 h-3.5" />
                          {PAYMENT_LABELS[don.payment_method] ?? don.payment_method}
                          {don.quantity > 1 && ` · ${don.quantity} calendriers`}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-[var(--color-text)]">
                      {Number(don.amount).toFixed(2)} €
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
