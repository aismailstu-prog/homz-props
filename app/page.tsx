'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Listing, PropertyType, PropertyPurpose } from '@/lib/types'
import {
  Search, SlidersHorizontal, MapPin, Grid3X3,
  Map, BedDouble, Bath, Wifi, Zap, Droplets,
  Shield, Heart, Phone, ChevronDown, X, Star
} from 'lucide-react'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

const AREAS = [
  'Navrongo', 'Bolgatanga', 'Bawku', 'Zebilla',
  'Sandema', 'Chiana', 'Paga', 'Tongo', 'Bongo'
]

const TYPE_LABELS: Record<PropertyType, string> = {
  single_room: 'Single Room',
  chamber_hall: 'Chamber & Hall',
  house: 'House',
  land: 'Land',
}

const TIER_STYLES: Record<string, string> = {
  premium: 'bg-amber-100 text-amber-800 border border-amber-300',
  featured: 'bg-blue-100 text-blue-800 border border-blue-300',
  basic: 'bg-gray-100 text-gray-600 border border-gray-200',
}

function formatPrice(price: number, purpose: PropertyPurpose) {
  return `GHC ${price.toLocaleString()}${purpose === 'rent' ? '/mo' : ''}`
}

function AmenityBadge({ icon: Icon, label, active }: { icon: any; label: string; active: boolean }) {
  if (!active) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
      <Icon size={10} />
      {label}
    </span>
  )
}

function ListingCard({ listing, saved, onToggleSave }: {
  listing: Listing
  saved: boolean
  onToggleSave: (id: string) => void
}) {
  const image = listing.listing_images?.[0]?.cloudinary_url
  const isVerified = (listing.users as any)?.is_verified

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
      <Link href={`/listings/${listing.id}`}>
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <MapPin size={40} />
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            {listing.tier !== 'basic' && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIER_STYLES[listing.tier]}`}>
                {listing.tier === 'premium' ? 'Premium' : 'Featured'}
              </span>
            )}
            {listing.is_negotiable && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                Negotiable
              </span>
            )}
          </div>
          <button
            onClick={e => { e.preventDefault(); onToggleSave(listing.id) }}
            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
          >
            <Heart
              size={16}
              className={saved ? 'fill-red-500 text-red-500' : 'text-gray-400'}
            />
          </button>
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {listing.listing_images?.length || 0} photos
          </div>
        </div>
      </Link>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link href={`/listings/${listing.id}`}>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight hover:text-blue-600 transition-colors line-clamp-1">
              {listing.title}
            </h3>
          </Link>
          <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
            {formatPrice(listing.price, listing.purpose)}
          </span>
        </div>

        <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
          <MapPin size={10} />
          <span>{listing.area}</span>
          <span className="mx-1">·</span>
          <span className="capitalize">{TYPE_LABELS[listing.type]}</span>
          {isVerified && (
            <>
              <span className="mx-1">·</span>
              <span className="flex items-center gap-0.5 text-green-600">
                <Shield size={10} /> Verified
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {listing.bedrooms && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <BedDouble size={10} /> {listing.bedrooms} bed
            </span>
          )}
          {listing.bathrooms && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 ml-2">
              <Bath size={10} /> {listing.bathrooms} bath
            </span>
          )}
          <AmenityBadge icon={Zap} label="Electricity" active={listing.has_electricity} />
          <AmenityBadge icon={Droplets} label="Water" active={listing.has_water} />
          <AmenityBadge icon={Shield} label="Security" active={listing.has_security} />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">
            {new Date(listing.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </span>
          <div className="flex gap-2">
            {listing.users && (listing.users as any).phone && (
              <a
                href={`tel:${(listing.users as any).phone}`}
                className="flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded-full hover:bg-green-700 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Phone size={10} /> Call
              </a>
            )}
            <Link
              href={`/listings/${listing.id}#inquire`}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded-full hover:bg-blue-700 transition-colors"
            >
              Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [type, setType] = useState<PropertyType | ''>('')
  const [purpose, setPurpose] = useState<PropertyPurpose | ''>('')
  const [area, setArea] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')

  const fetchListings = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select(`
        *,
        listing_images ( cloudinary_url, order_index ),
        listing_videos ( cloudinary_url ),
        users ( full_name, phone, is_verified )
      `)
      .eq('status', 'active')

    if (type) query = query.eq('type', type)
    if (purpose) query = query.eq('purpose', purpose)
    if (area) query = query.eq('area', area)
    if (minPrice) query = query.gte('price', Number(minPrice))
    if (maxPrice) query = query.lte('price', Number(maxPrice))
    if (search) query = query.ilike('title', `%${search}%`)

    if (sort === 'newest') query = query.order('created_at', { ascending: false })
    else if (sort === 'price_asc') query = query.order('price', { ascending: true })
    else query = query.order('price', { ascending: false })

    // Premium and featured listings come first
    query = query.order('tier', { ascending: false })

    const { data, error } = await query
    if (!error && data) setListings(data as Listing[])
    setLoading(false)
  }, [search, type, purpose, area, minPrice, maxPrice, sort])

  useEffect(() => { fetchListings() }, [fetchListings])

  // Load saved listings from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('homz_saved') || '[]')
    setSavedIds(new Set(saved))
  }, [])

  const toggleSave = (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('homz_saved', JSON.stringify([...next]))
      return next
    })
  }

  const clearFilters = () => {
    setType(''); setPurpose(''); setArea('')
    setMinPrice(''); setMaxPrice(''); setSearch('')
    setSort('newest')
  }

  const hasFilters = type || purpose || area || minPrice || maxPrice || search

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">HOMZ <span className="text-blue-600">PROPS</span></span>
          </Link>

          <div className="flex-1 max-w-md relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">Login</Link>
            <Link href="/auth/register" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors">
              List Property
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-blue-600 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">Find Your Perfect Property</h1>
          <p className="text-blue-100 text-sm">Rooms, houses & land for rent or sale across Upper East Region</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-[57px] z-30">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">

          <select
            value={purpose}
            onChange={e => setPurpose(e.target.value as PropertyPurpose | '')}
            className="text-sm border border-gray-200 rounded-full px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Rent or Sale</option>
            <option value="rent">For Rent</option>
            <option value="sale">For Sale</option>
          </select>

          <select
            value={type}
            onChange={e => setType(e.target.value as PropertyType | '')}
            className="text-sm border border-gray-200 rounded-full px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="single_room">Single Room</option>
            <option value="chamber_hall">Chamber & Hall</option>
            <option value="house">House</option>
            <option value="land">Land</option>
          </select>

          <select
            value={area}
            onChange={e => setArea(e.target.value)}
            className="text-sm border border-gray-200 rounded-full px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Areas</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal size={14} />
            Price & More
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
            >
              <X size={14} /> Clear
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="text-sm border border-gray-200 rounded-full px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>

            <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`p-2 ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Grid3X3 size={15} />
              </button>
              <button
                onClick={() => setView('map')}
                className={`p-2 ${view === 'map' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Map size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded price filters */}
        {showFilters && (
          <div className="max-w-7xl mx-auto mt-3 flex items-center gap-3 flex-wrap pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Min price</label>
              <input
                type="number"
                placeholder="GHC 0"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="w-28 text-sm border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Max price</label>
              <input
                type="number"
                placeholder="No limit"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="w-28 text-sm border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${listings.length} propert${listings.length === 1 ? 'y' : 'ies'} found`}
          </p>
          {hasFilters && (
            <div className="flex flex-wrap gap-1">
              {type && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">{TYPE_LABELS[type]}</span>}
              {purpose && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 capitalize">{purpose}</span>}
              {area && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">{area}</span>}
            </div>
          )}
        </div>

        {/* Map view */}
        {view === 'map' && (
          <div className="h-[500px] rounded-2xl overflow-hidden border border-gray-200 mb-6">
            <MapView listings={listings} />
          </div>
        )}

        {/* Grid view */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <MapPin size={40} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-gray-600 font-medium mb-1">No properties found</h3>
            <p className="text-gray-400 text-sm">Try adjusting your filters</p>
            <button onClick={clearFilters} className="mt-4 text-sm text-blue-600 hover:underline">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                saved={savedIds.has(listing.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-12 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">HOMZ <span className="text-blue-600">PROPS</span></span>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} HOMZ PROPS · Upper East Region, Ghana
          </p>
          <div className="flex gap-4 text-xs text-gray-500">
            <Link href="/admin/login" className="hover:text-gray-700">Admin</Link>
            <Link href="/auth/register" className="hover:text-gray-700">List Property</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
