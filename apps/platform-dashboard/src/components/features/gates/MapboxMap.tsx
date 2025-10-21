import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getMapboxToken } from '@/lib/mapbox'
import type { Database } from '@/types/database.types'

type Gate = Database['public']['Tables']['gates']['Row']

interface MapboxMapProps {
  gates: Gate[]
  center?: [number, number] // [longitude, latitude]
  zoom?: number
  onGateClick?: (gate: Gate) => void
  selectedGateId?: string | null
  className?: string
}

// Gate type color mapping
const GATE_COLORS = {
  vehicle: '#3B82F6', // blue
  pedestrian: '#10B981', // green
  service: '#F59E0B', // amber
  delivery: '#8B5CF6', // purple
} as const

export function MapboxMap({
  gates,
  center = [120.9842, 14.5995], // Default to Manila, Philippines
  zoom = 12,
  onGateClick,
  selectedGateId,
  className = '',
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = getMapboxToken()
    if (!token) {
      console.error('Mapbox token not configured')
      return
    }

    mapboxgl.accessToken = token

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      markers.current.forEach((marker) => marker.remove())
      markers.current.clear()
      map.current?.remove()
      map.current = null
    }
  }, [center, zoom])

  // Update markers when gates change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove markers that no longer exist
    const currentGateIds = new Set(gates.map((g) => g.id))
    markers.current.forEach((marker, gateId) => {
      if (!currentGateIds.has(gateId)) {
        marker.remove()
        markers.current.delete(gateId)
      }
    })

    // Add or update markers
    gates.forEach((gate) => {
      let marker = markers.current.get(gate.id)

      if (!marker) {
        // Create new marker
        const el = createMarkerElement(gate, selectedGateId === gate.id)

        marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
        })
          .setLngLat([gate.longitude, gate.latitude])
          .addTo(map.current!)

        // Add click handler
        el.addEventListener('click', () => {
          onGateClick?.(gate)
        })

        markers.current.set(gate.id, marker)

        // Add popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
        }).setHTML(createPopupContent(gate))

        marker.setPopup(popup)

        // Show popup on hover
        el.addEventListener('mouseenter', () => {
          marker!.getPopup().addTo(map.current!)
        })
        el.addEventListener('mouseleave', () => {
          marker!.getPopup().remove()
        })
      } else {
        // Update existing marker position and style
        marker.setLngLat([gate.longitude, gate.latitude])
        const el = marker.getElement()
        updateMarkerElement(el, gate, selectedGateId === gate.id)

        // Update popup content
        marker.getPopup().setHTML(createPopupContent(gate))
      }
    })

    // Fit bounds if there are gates
    if (gates.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      gates.forEach((gate) => {
        bounds.extend([gate.longitude, gate.latitude])
      })

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      })
    }
  }, [gates, mapLoaded, selectedGateId, onGateClick])

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="h-full w-full rounded-lg" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Create custom marker element
 */
function createMarkerElement(gate: Gate, isSelected: boolean): HTMLDivElement {
  const el = document.createElement('div')
  updateMarkerElement(el, gate, isSelected)
  el.style.cursor = 'pointer'
  return el
}

/**
 * Update marker element styling
 */
function updateMarkerElement(el: HTMLDivElement, gate: Gate, isSelected: boolean): void {
  const color = GATE_COLORS[gate.type as keyof typeof GATE_COLORS] || GATE_COLORS.vehicle
  const size = isSelected ? 36 : 30
  const opacity = gate.is_active ? '1' : '0.5'

  el.className = 'gate-marker'
  el.style.width = `${size}px`
  el.style.height = `${size}px`
  el.style.borderRadius = '50%'
  el.style.backgroundColor = color
  el.style.border = isSelected ? '3px solid white' : '2px solid white'
  el.style.boxShadow = isSelected
    ? '0 4px 6px rgba(0, 0, 0, 0.3), 0 0 0 2px ' + color
    : '0 2px 4px rgba(0, 0, 0, 0.2)'
  el.style.opacity = opacity
  el.style.transition = 'all 0.2s ease'
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'

  // Add icon based on gate type
  const icon = getGateIcon(gate.type)
  el.innerHTML = `<span style="color: white; font-size: ${size * 0.5}px;">${icon}</span>`
}

/**
 * Get icon for gate type
 */
function getGateIcon(type: string): string {
  switch (type) {
    case 'vehicle':
      return '🚗'
    case 'pedestrian':
      return '🚶'
    case 'service':
      return '🔧'
    case 'delivery':
      return '📦'
    default:
      return '🚪'
  }
}

/**
 * Create popup content HTML
 */
function createPopupContent(gate: Gate): string {
  const statusBadge = gate.is_active
    ? '<span style="background: #10B981; color: white; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">Active</span>'
    : '<span style="background: #6B7280; color: white; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">Inactive</span>'

  return `
    <div style="padding: 8px; min-width: 180px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <strong style="font-size: 14px; color: #111827;">${gate.name}</strong>
        ${statusBadge}
      </div>
      <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
        <strong>Type:</strong> ${gate.type.charAt(0).toUpperCase() + gate.type.slice(1)}
      </div>
      ${
        gate.description
          ? `<div style="font-size: 12px; color: #6B7280; margin-top: 4px;">${gate.description}</div>`
          : ''
      }
      <div style="font-size: 11px; color: #9CA3AF; margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
        ${gate.latitude.toFixed(6)}, ${gate.longitude.toFixed(6)}
      </div>
    </div>
  `
}
