import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader,
} from 'lucide-react'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierSecteurs } from '@/hooks/useCalendrierSecteurs'
import { useCalendrierAdressesMap } from '@/hooks/useCalendrierAdressesMap'
import { useCalendrierVentes } from '@/hooks/useCalendrierVentes'

// CSS Leaflet — importé statiquement pour Vite
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

export function CalendriersSecteurMapPage() {
  const { id: secteurId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeCampagne } = useCalendrierCampagnes()
  const { secteurs } = useCalendrierSecteurs(activeCampagne?.id)
  const { adressesWithCoords, selectedAddress, selectedAddressIndex, goToAddressIndex, goToPrevious, goToNext, geocodeAddress } = useCalendrierAdressesMap(secteurId)
  const { ventes } = useCalendrierVentes(activeCampagne?.id, secteurId)

  const [mapInitialized, setMapInitialized] = useState(false)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [geolocationEnabled, setGeolocationEnabled] = useState(false)

  const secteur = useMemo(() => secteurs.find((s) => s.id === secteurId), [secteurs, secteurId])

  // Initialiser la carte (lazy-load Leaflet)
  useEffect(() => {
    if (!secteurId || mapInitialized || adressesWithCoords.length === 0) return

    const initMap = async () => {
      const mapEl = document.getElementById('map')
      if (!mapEl) return

      try {
        // Import dynamique de Leaflet
        const L = (await import('leaflet')).default
        const MarkerClusterGroup = (await import('leaflet.markercluster')).default

        // Créer la carte
        const map = L.map('map', {
          attributionControl: false,
        }).setView([48.8566, 2.3522], 16)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map)

        // Ajouter les markers avec clustering
        const markerClusterGroup = new MarkerClusterGroup()

        const statusColors: Record<string, string> = {
          done: '#10b981',
          absent: '#ef4444',
          refuse: '#f97316',
          todo: '#9ca3af',
          skip: '#6b7280',
        }

        adressesWithCoords.forEach((addr, idx) => {
          const color = statusColors[addr.status] || '#9ca3af'
          const icon = L.divIcon({
            html: `<div style="background: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; border: 4px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.2);">${
              addr.status === 'done' ? '✓' : addr.status === 'todo' ? '○' : '✗'
            }</div>`,
            className: '',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })

          const marker = L.marker([addr.latitude!, addr.longitude!], { icon })
          marker.on('click', () => goToAddressIndex(idx))
          markerClusterGroup.addLayer(marker)
        })

        map.addLayer(markerClusterGroup)

        // Localisation du vendeur
        if ('geolocation' in navigator) {
          navigator.geolocation.watchPosition(
            (position) => {
              const { latitude, longitude } = position.coords
              const userIcon = L.divIcon({
                html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              })
              L.marker([latitude, longitude], { icon: userIcon }).addTo(map)
              setGeolocationEnabled(true)
            },
            () => {
              setGeolocationEnabled(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
          )
        }

        setMapInstance(map)
        setMapInitialized(true)

        return () => {
          map.remove()
        }
      } catch (err) {
        console.error('Erreur chargement carte:', err)
      }
    }

    initMap()
  }, [secteurId, mapInitialized, adressesWithCoords, goToAddressIndex])

  // Centrer sur l'adresse sélectionnée
  useEffect(() => {
    if (mapInstance && selectedAddress && selectedAddress.latitude && selectedAddress.longitude) {
      mapInstance.flyTo([selectedAddress.latitude, selectedAddress.longitude], 17, {
        duration: 0.5,
      })
    }
  }, [mapInstance, selectedAddress])

  if (!secteur || !activeCampagne) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Secteur ou campagne introuvable</p>
        </div>
      </div>
    )
  }

  if (adressesWithCoords.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-red-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center flex-1">
            <div className="font-bold">{secteur.name}</div>
            <div className="text-sm opacity-90">{activeCampagne.name}</div>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 font-medium">Géolocalisation en cours...</p>
            <p className="text-sm text-gray-500 mt-2">
              {adressesWithCoords.length === 0 && ventes.length > 0
                ? 'Conversion des adresses en coordonnées GPS...'
                : 'Aucune adresse géolocalisée pour ce secteur'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const totalCollected = ventes.reduce((sum, v) => sum + Number(v.amount), 0)
  const addressesVisited = adressesWithCoords.filter((a) => a.status === 'done').length

  return (
    <div className="flex flex-col h-screen bg-white fixed inset-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-3 flex items-center justify-between flex-shrink-0 safe-top">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-red-700 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <div className="font-bold text-sm">{secteur.name}</div>
          <div className="text-xs opacity-90">{addressesVisited}/{adressesWithCoords.length} • {totalCollected.toFixed(0)}€</div>
        </div>
        <div className="w-10" />
      </div>

      {/* Carte */}
      <div id="map" className="flex-1 relative" />

      {/* Adresse actuelle flottante */}
      {selectedAddress && (
        <div className="absolute top-16 left-4 right-4 bg-white rounded-lg p-3 shadow-lg z-400 max-w-96">
          <div className="text-xs text-gray-500 font-bold uppercase mb-1">Adresse actuelle</div>
          <div className="font-bold text-lg mb-2">
            {selectedAddress.number ? `${selectedAddress.number} ` : ''}
            {selectedAddress.street_name}
          </div>
          <span
            className={`inline-block text-xs font-bold px-2 py-1 rounded ${
              selectedAddress.status === 'done'
                ? 'bg-green-100 text-green-700'
                : selectedAddress.status === 'todo'
                ? 'bg-gray-100 text-gray-700'
                : selectedAddress.status === 'absent'
                ? 'bg-red-100 text-red-700'
                : 'bg-orange-100 text-orange-700'
            }`}
          >
            {selectedAddress.status === 'done'
              ? '✓ Visitée'
              : selectedAddress.status === 'todo'
              ? '○ À faire'
              : selectedAddress.status === 'absent'
              ? '⊘ Absent'
              : '✗ Refusé'}
          </span>
        </div>
      )}

      {/* Bottom panel actions */}
      <div className="bg-white border-t border-gray-200 p-4 flex flex-col gap-3 flex-shrink-0 safe-bottom">
        {/* Mini légende */}
        <div className="grid grid-cols-4 gap-2 p-2 bg-gray-50 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="truncate">Visitée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="truncate">À faire</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="truncate">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span className="truncate">Refusé</span>
          </div>
        </div>

        {/* Compteur */}
        <div className="text-center text-xs text-gray-500 p-2 bg-gray-50 rounded-lg">
          {selectedAddressIndex !== null ? `Adresse ${selectedAddressIndex + 1} sur ${adressesWithCoords.length}` : 'Cliquez sur un point'}
        </div>

        {/* Boutons d'action */}
        <button
          onClick={() => navigate(`/calendriers/secteurs/${secteurId}/vente`)}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg text-sm active:scale-95"
        >
          📝 Saisir un don
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button className="border border-gray-300 bg-white hover:bg-gray-50 font-bold py-2 rounded-lg text-sm">
            ℹ️ Détail
          </button>
          <button className="border border-gray-300 bg-white hover:bg-gray-50 font-bold py-2 rounded-lg text-sm">
            ⊘ Absent
          </button>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={goToPrevious}
            disabled={selectedAddressIndex === 0}
            className="border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédente
          </button>
          <button
            onClick={goToNext}
            disabled={selectedAddressIndex === adressesWithCoords.length - 1}
            className="border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"
          >
            Suivante
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
