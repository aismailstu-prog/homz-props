'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Listing, PropertyPurpose } from '@/lib/types'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function formatPrice(price: number, purpose: PropertyPurpose) {
  return `GHC ${price.toLocaleString()}${purpose === 'rent' ? '/mo' : ''}`
}

interface MapViewProps {
  listings: Listing[]
}

export default function MapView({ listings }: MapViewProps) {
  const listingsWithCoords = listings.filter(l => l.lat && l.lng)

  // Default center: Navrongo, Upper East Region
  const center: [number, number] = [10.8941, -1.0924]

  return (
    <MapContainer
      center={center}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {listingsWithCoords.map(listing => (
        <Marker
          key={listing.id}
          position={[listing.lat!, listing.lng!]}
        >
          <Popup maxWidth={200}>
            <div className="text-sm">
              {listing.listing_images?.[0] && (
                <img
                  src={listing.listing_images[0].cloudinary_url}
                  alt={listing.title}
                  className="w-full h-24 object-cover rounded mb-2"
                />
              )}
              <p className="font-semibold text-gray-900 leading-tight mb-1">{listing.title}</p>
              <p className="text-blue-600 font-bold mb-1">
                {formatPrice(listing.price, listing.purpose)}
              </p>
              <p className="text-gray-500 text-xs mb-2">{listing.area}</p>
              <Link
                href={`/listings/${listing.id}`}
                className="block text-center text-xs bg-blue-600 text-white py-1 rounded-full hover:bg-blue-700"
              >
                View details
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}

      {listingsWithCoords.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
          <div className="bg-white rounded-xl px-4 py-3 shadow text-sm text-gray-500 text-center">
            No listings with map pins yet
          </div>
        </div>
      )}
    </MapContainer>
  )
}
