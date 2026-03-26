'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function ClickHandler({ onPin }: { onPin: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPin(e.latlng.lat, e.latlng.lng) }
  })
  return null
}

interface PinMapProps {
  lat: number | null
  lng: number | null
  onPin: (lat: number, lng: number) => void
}

export default function PinMap({ lat, lng, onPin }: PinMapProps) {
  const center: [number, number] = [10.8941, -1.0924]
  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPin={onPin} />
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  )
}
