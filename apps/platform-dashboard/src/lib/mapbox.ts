import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Initialize Mapbox with access token from env
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

export { mapboxgl }

// Get Mapbox access token from environment
export function getMapboxToken(): string | undefined {
  return MAPBOX_TOKEN
}

// Default map configuration
export const DEFAULT_MAP_CONFIG = {
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [120.9842, 14.5995] as [number, number], // Manila, Philippines (default)
  zoom: 12,
}

// Gate marker icons configuration
export const GATE_MARKER_COLORS = {
  vehicle: '#3b82f6', // blue
  pedestrian: '#10b981', // green
  service: '#f59e0b', // amber
  delivery: '#8b5cf6', // purple
} as const

// Helper function to create custom gate marker
export function createGateMarkerElement(type: keyof typeof GATE_MARKER_COLORS) {
  const el = document.createElement('div')
  el.className = 'gate-marker'
  el.style.width = '30px'
  el.style.height = '30px'
  el.style.borderRadius = '50%'
  el.style.backgroundColor = GATE_MARKER_COLORS[type]
  el.style.border = '2px solid white'
  el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
  el.style.cursor = 'pointer'
  return el
}
