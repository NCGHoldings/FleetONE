import { useEffect, useMemo, useState, useRef } from 'react'
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api'
import { Badge } from '@/components/ui/badge'
import { Locate, Navigation, Clock } from 'lucide-react'

interface TrackingData {
  id: string
  bus_id: string
  bus_no: string
  current_location: string
  gps_coordinates?: { lat: number; lng: number }
  route_id?: string
  route_name?: string
  speed_kmh: number
  status: string
  last_update: string
  fuel_level?: number
  fuel_level_liters?: number // Fuel in liters from FIOS
  tire_pressure?: {
    front_left: number
    front_right: number
    rear_left: number
    rear_right: number
  }
  engine_health: string
  engine_temperature?: number
  oil_pressure?: number
  battery_voltage?: number
  odometer_reading?: number
  driver_id?: string
  driver_name?: string
  alerts?: any[]
}

interface FleetTrackingMapProps {
  trackingData: TrackingData[]
  apiKey: string
  isLoading?: boolean
}

const FleetTrackingMap = ({ trackingData, apiKey, isLoading = false }: FleetTrackingMapProps) => {
  const [selectedBus, setSelectedBus] = useState<TrackingData | null>(null)
  const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 }) // Colombo, Sri Lanka
  const [mapZoom, setMapZoom] = useState(8)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)

  // Filter out buses without valid GPS coordinates
  const validBuses = useMemo(() => {
    return trackingData.filter(bus => 
      bus.gps_coordinates && 
      bus.gps_coordinates.lat !== 0 && 
      bus.gps_coordinates.lng !== 0
    )
  }, [trackingData])

  // Auto-center map to show all buses (only after map is loaded)
  useEffect(() => {
    if (!isMapLoaded || !window.google || !window.google.maps || validBuses.length === 0) return
    
    try {
      const bounds = new google.maps.LatLngBounds()
      validBuses.forEach(bus => {
        if (bus.gps_coordinates) {
          bounds.extend(new google.maps.LatLng(bus.gps_coordinates.lat, bus.gps_coordinates.lng))
        }
      })
      
      // Calculate center
      const center = bounds.getCenter()
      setMapCenter({ lat: center.lat(), lng: center.lng() })
      
      // Adjust zoom based on bounds
      if (validBuses.length === 1) {
        setMapZoom(14)
      } else {
        setMapZoom(10)
      }
      
      // Fit bounds if we have a map reference
      if (mapRef.current) {
        mapRef.current.fitBounds(bounds)
      }
    } catch (error) {
      console.error('Error setting map bounds:', error)
    }
  }, [validBuses, isMapLoaded])
  
  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map
    setIsMapLoaded(true)
  }

  const getMarkerIcon = (bus: TrackingData) => {
    // Check if Google Maps API is fully loaded
    if (!window.google || !window.google.maps || !window.google.maps.SymbolPath) {
      return undefined
    }
    
    let color = '#6B7280' // grey for inactive
    
    if (bus.status === 'active' && bus.speed_kmh && bus.speed_kmh > 0) {
      color = '#10B981' // green for moving
    } else if (bus.status === 'active' && bus.speed_kmh === 0) {
      color = '#F59E0B' // yellow for idle
    } else if (bus.engine_health === 'critical') {
      color = '#EF4444' // red for critical
    }

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 8,
    }
  }

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    
    return date.toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500'
      case 'maintenance':
        return 'bg-yellow-500'
      case 'inactive':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getEngineHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'good':
      case 'excellent':
        return 'bg-green-500'
      case 'fair':
      case 'warning':
        return 'bg-yellow-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  if (validBuses.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg border">
        <div className="text-center space-y-4 p-8">
          <Locate className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No GPS Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Waiting for vehicles to report their GPS coordinates. This may take a few moments.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const mapContainerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '500px',
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={handleMapLoad}
        options={{
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {isMapLoaded && validBuses.map((bus) => (
          <Marker
            key={bus.id}
            position={bus.gps_coordinates!}
            icon={getMarkerIcon(bus)}
            onClick={() => setSelectedBus(bus)}
            title={bus.bus_no}
          />
        ))}

        {selectedBus && selectedBus.gps_coordinates && (
          <InfoWindow
            position={selectedBus.gps_coordinates}
            onCloseClick={() => setSelectedBus(null)}
          >
            <div className="p-3 space-y-3 min-w-[250px]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">{selectedBus.bus_no}</h3>
                <Badge className={getStatusColor(selectedBus.status)}>
                  {selectedBus.status}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    Speed: <strong>{selectedBus.speed_kmh || 0} km/h</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground text-xs">
                    {formatLastUpdate(selectedBus.last_update)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Engine:</span>
                  <Badge className={getEngineHealthColor(selectedBus.engine_health)} variant="outline">
                    {selectedBus.engine_health}
                  </Badge>
                </div>

                {(selectedBus.fuel_level_liters || selectedBus.fuel_level) && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Fuel:</span>
                    <span className="text-foreground font-medium">{Math.round(selectedBus.fuel_level_liters || selectedBus.fuel_level || 0)} L</span>
                  </div>
                )}

                <div className="pt-2 border-t text-xs text-muted-foreground">
                  <div>Lat: {selectedBus.gps_coordinates.lat.toFixed(6)}</div>
                  <div>Lng: {selectedBus.gps_coordinates.lng.toFixed(6)}</div>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  )
}

export default FleetTrackingMap
