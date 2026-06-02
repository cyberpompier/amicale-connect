import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useAssociation } from '@/features/association/AssociationContext'

// CSS Leaflet — importé statiquement pour Vite
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

export function CalendriersSecteurMapPage() {
  const { id: secteurId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeCampagne } = useCalendrierCampagnes()
  const { secteurs } = useCalendrierSecteurs(activeCampagne?.id)
  const { currentAssociation } = useAssociation()
  const secteur = useMemo(() => secteurs.find((s) => s.id === secteurId), [secteurs, secteurId])

  const { adressesWithCoords, adresses, isGeocoding, geocodingProgress, geocodingTotal, selectedAddress, selectedAddressIndex, goToAddressIndex, goToPrevious, goToNext } = useCalendrierAdressesMap(
    secteurId,
    secteur?.city || currentAssociation?.city,   // ville du secteur en priorité
    currentAssociation?.postal_code
  )
  const { ventes } = useCalendrierVentes(activeCampagne?.id, secteurId)

  const [mapInitialized, setMapInitialized] = useState(false)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const markersRef = useRef<any[]>([])
  const clusterGroupRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)

  // Initialiser la carte (lazy-load Leaflet)
  useEffect(() => {
    if (!secteurId || mapInitialized || adressesWithCoords.length === 0) return

    const initMap = async () => {
      const mapEl = document.getElementById('map')
      if (!mapEl) return

      try {
        // Import dynamique de Leaflet
        const L = (await import('leaflet')).default
        await import('leaflet.markercluster')
        leafletRef.current = L

        // Créer la carte — centrage initial sur la première adresse
        const firstAddr = adressesWithCoords[0]
        const map = L.map('map', {
          attributionControl: false,
        }).setView([firstAddr.latitude!, firstAddr.longitude!], 15)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map)

        // Ajouter les markers avec clustering
        const markerClusterGroup = (L as any).markerClusterGroup({ maxClusterRadius: 40 })
        clusterGroupRef.current = markerClusterGroup

        const statusColors: Record<string, string> = {
          done: '#10b981',
          absent: '#ef4444',
          refuse: '#f97316',
          todo: '#9ca3af',
          skip: '#6b7280',
        }

        const buildIcon = (addr: typeof adressesWithCoords[0], selected = false) => {
          const color = statusColors[addr.status] || '#9ca3af'
          const size = selected ? 52 : 40
          const border = selected ? '4px solid #1e40af' : '4px solid white'
          const shadow = selected
            ? '0 0 0 4px rgba(30,64,175,0.3), 0 4px 14px rgba(0,0,0,0.3)'
            : '0 3px 10px rgba(0,0,0,0.2)'
          const symbol = addr.status === 'done' ? '✓' : addr.status === 'todo' ? '○' : '✗'
          return L.divIcon({
            html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${selected ? 24 : 20}px;border:${border};box-shadow:${shadow};transition:all 0.2s;">${symbol}</div>`,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          })
        }

        const markers: any[] = []
        adressesWithCoords.forEach((addr, idx) => {
          const marker = L.marker([addr.latitude!, addr.longitude!], {
            icon: buildIcon(addr, false),
          })
          marker.on('click', () => goToAddressIndex(idx))
          markers.push(marker)
          markerClusterGroup.addLayer(marker)
        })
        markersRef.current = markers

        // Stocker buildIcon et adresses pour usage ultérieur
        ;(map as any)._buildIcon = buildIcon
        ;(map as any)._adressesWithCoords = adressesWithCoords

        map.addLayer(markerClusterGroup)

        // Centrer sur l'ensemble des adresses du secteur
        const bounds = L.latLngBounds(
          adressesWithCoords.map((a) => [a.latitude!, a.longitude!] as [number, number])
        )
        map.fitBounds(bounds.pad(0.2))

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
            },
            () => {
              // Géolocalisation refusée ou indisponible
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

  // Centrer sur l'adresse sélectionnée + mettre en évidence le marker
  useEffect(() => {
    if (!mapInstance || !selectedAddress?.latitude || !selectedAddress?.longitude) return

    const L = leafletRef.current
    const buildIcon = (mapInstance as any)._buildIcon
    const addrs = (mapInstance as any)._adressesWithCoords

    // Remettre tous les markers à leur icône normale
    if (L && buildIcon && addrs) {
      markersRef.current.forEach((marker, idx) => {
        marker.setIcon(buildIcon(addrs[idx], idx === selectedAddressIndex))
      })
    }

    // Extraire le marker du cluster si nécessaire et zoomer dessus
    const marker = markersRef.current[selectedAddressIndex ?? -1]
    if (marker && clusterGroupRef.current) {
      clusterGroupRef.current.zoomToShowLayer(marker, () => {
        mapInstance.panTo([selectedAddress.latitude!, selectedAddress.longitude!])
      })
    } else {
      mapInstance.flyTo([selectedAddress.latitude, selectedAddress.longitude], 17, { duration: 0.4 })
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

  // Aucune adresse du tout dans ce secteur
  if (!isGeocoding && adresses.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-red-700 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center flex-1 font-bold">{secteur.name}</div>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-600">Aucune adresse dans ce secteur</p>
            <p className="text-sm text-gray-400 mt-1">Ajoutez des adresses depuis la page détail du secteur</p>
            <button
              onClick={() => navigate(`/calendriers/secteurs/${secteurId}`)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold"
            >
              Aller au détail
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totalCollected = ventes.reduce((sum, v) => sum + Number(v.amount), 0)
  const addressesVisited = adressesWithCoords.filter((a) => a.status === 'done').length

  return (
    <div className="flex flex-col bg-white -m-4 md:-m-6" style={{ height: 'calc(100vh - 120px)' }}>
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

      {/* Barre de géocodage */}
      {isGeocoding && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
          <Loader className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-blue-700 font-medium">
              Géocodage {geocodingProgress}/{geocodingTotal} adresses...
            </div>
            <div className="w-full h-1.5 bg-blue-200 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${geocodingTotal > 0 ? (geocodingProgress / geocodingTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-blue-600 font-bold flex-shrink-0">
            {geocodingTotal > 0 ? Math.round((geocodingProgress / geocodingTotal) * 100) : 0}%
          </div>
        </div>
      )}

      {/* Carte + adresse flottante */}
      <div className="flex-1 relative overflow-hidden">
        <div id="map" className="absolute inset-0" />

      {/* Adresse actuelle flottante par-dessus la carte */}
      {selectedAddress && (
        <div className="absolute top-3 left-3 right-3 bg-white rounded-lg p-3 shadow-lg z-[400]">
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
      </div>

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
