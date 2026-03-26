'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Listing } from '@/lib/types'
import {
  MapPin, BedDouble, Bath, Zap, Droplets, Shield,
  Car, Fence, Phone, MessageSquare, Heart, Share2,
  Flag, ChevronLeft, ChevronRight, Play, X,
  CheckCircle2, XCircle, Eye, Calendar, Star,
  ArrowLeft, Loader2
} from 'lucide-react'

const DetailMap = dynamic(() => import('@/components/DetailMap'), { ssr: false })

const TYPE_LABELS: Record<string, string> = {
  single_room: 'Single Room',
  chamber_hall: 'Chamber & Hall',
  house: 'House',
  land: 'Land',
}

function formatPrice(price: number, purpose: string) {
  return `GHC ${price.toLocaleString()}${purpose === 'rent' ? ' / month' : ''}`
}

function AmenityRow({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${active ? 'text-green-700' : 'text-gray-400'}`}>
      {active
        ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
        : <XCircle size={16} className="text-gray-300 shrink-0" />
      }
      {label}
    </div>
  )
}

// Photo carousel
function Gallery({ images, videoUrl }: { images: string[]; videoUrl?: string }) {
  const [current, setCurrent] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const all = images

  const prev = () => setCurrent(i => (i - 1 + all.length) % all.length)
  const next = () => setCurrent(i => (i + 1) % all.length)

  return (
    <>
      {/* Main gallery */}
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden h-72 sm:h-96 group">
        {all.length > 0 ? (
          <img
            src={all[current]}
            alt={`Photo ${current + 1}`}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setFullscreen(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <MapPin size={48} />
          </div>
        )}

        {/* Navigation arrows */}
        {all.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
          {current + 1} / {all.length}
        </div>

        {/* Video button */}
        {videoUrl && (
          <button
            onClick={() => setShowVideo(true)}
            className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
          >
            <Play size={12} className="fill-white" /> Watch video
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {all.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {all.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                i === current ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
            <X size={24} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); prev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronLeft size={32} />
          </button>
          <img
            src={all[current]}
            alt=""
            className="max-h-screen max-w-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={e => { e.stopPropagation(); next() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronRight size={32} />
          </button>
          <div className="absolute bottom-4 text-white/70 text-sm">
            {current + 1} / {all.length}
          </div>
        </div>
      )}

      {/* Video modal */}
      {showVideo && videoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setShowVideo(false)}
        >
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
            <X size={24} />
          </button>
          <video
            src={videoUrl}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// Inquiry form
function InquiryForm({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!message.trim() || !name.trim() || !phone.trim()) {
      setError('Please fill in all fields')
      return
    }
    setSending(true)
    setError('')

    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Please log in to send an inquiry')
      setSending(false)
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!userData) {
      setError('User profile not found. Please log in again.')
      setSending(false)
      return
    }

    const { error: insertError } = await supabase.from('inquiries').insert({
      listing_id: listingId,
      seeker_id: userData.id,
      message: `${message}\n\nName: ${name}\nPhone: ${phone}`,
    })

    if (insertError) {
      setError('Failed to send. Please try again.')
    } else {
      setSent(true)
    }
    setSending(false)
  }

  if (sent) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
        <p className="font-semibold text-gray-800">Inquiry sent!</p>
        <p className="text-sm text-gray-500 mt-1">The landlord will contact you shortly.</p>
      </div>
    )
  }

  return (
    <div id="inquire" className="space-y-3">
      <h3 className="font-semibold text-gray-900">Send an inquiry</h3>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="tel"
        placeholder="Your phone number"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        placeholder={`I'm interested in "${listingTitle}". Is it still available?`}
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={4}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={submit}
        disabled={sending}
        className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
        {sending ? 'Sending...' : 'Send inquiry'}
      </button>
    </div>
  )
}

// Report modal
function ReportModal({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!reason.trim()) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSending(false); return }
    const { data: userData } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!userData) { setSending(false); return }
    await supabase.from('reports').insert({
      listing_id: listingId,
      reporter_id: userData.id,
      reason,
    })
    setDone(true)
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 size={36} className="text-green-500 mx-auto mb-2" />
            <p className="font-semibold">Report submitted</p>
            <p className="text-sm text-gray-500 mt-1">Admin will review this listing.</p>
            <button onClick={onClose} className="mt-4 text-sm text-blue-600">Close</button>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-gray-900 mb-3">Report this listing</h3>
            <textarea
              placeholder="Describe why this listing is suspicious or incorrect..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={sending || !reason.trim()}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm hover:bg-red-600 disabled:opacity-50"
              >
                {sending ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [listing, setListing] = useState<Listing | null>(null)
  const [similar, setSimilar] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    const fetchListing = async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          listing_images ( cloudinary_url, order_index ),
          listing_videos ( cloudinary_url ),
          users ( full_name, phone, is_verified, avatar_url )
        `)
        .eq('id', params.id)
        .eq('status', 'active')
        .single()

      if (error || !data) { router.push('/'); return }
      setListing(data as Listing)

      // Increment view count
      await supabase.rpc('increment_view_count', { listing_uuid: params.id })

      // Fetch similar listings
      const { data: sim } = await supabase
        .from('listings')
        .select('*, listing_images ( cloudinary_url, order_index )')
        .eq('status', 'active')
        .eq('type', data.type)
        .eq('area', data.area)
        .neq('id', params.id)
        .limit(3)

      if (sim) setSimilar(sim as Listing[])
      setLoading(false)
    }

    if (params.id) fetchListing()
  }, [params.id])

  useEffect(() => {
    const savedIds = JSON.parse(localStorage.getItem('homz_saved') || '[]')
    setSaved(savedIds.includes(params.id))
  }, [params.id])

  const toggleSave = () => {
    const savedIds: string[] = JSON.parse(localStorage.getItem('homz_saved') || '[]')
    const next = saved
      ? savedIds.filter(id => id !== params.id)
      : [...savedIds, params.id as string]
    localStorage.setItem('homz_saved', JSON.stringify(next))
    setSaved(!saved)
  }

  const shareWhatsApp = () => {
    const url = window.location.href
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this property on HOMZ PROPS: ${listing?.title}\n${url}`)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-gray-500 text-sm">Loading property...</p>
        </div>
      </div>
    )
  }

  if (!listing) return null

  const images = (listing.listing_images || [])
    .sort((a, b) => a.order_index - b.order_index)
    .map(img => img.cloudinary_url)

  const videoUrl = listing.listing_videos?.[0]?.cloudinary_url
  const landlord = listing.users as any

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">HOMZ <span className="text-blue-600">PROPS</span></span>
          </Link>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column — main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* Gallery */}
            <Gallery images={images} videoUrl={videoUrl} />

            {/* Title & price */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                      {listing.purpose === 'rent' ? 'For Rent' : 'For Sale'}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      {TYPE_LABELS[listing.type]}
                    </span>
                    {listing.tier !== 'basic' && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        listing.tier === 'premium'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {listing.tier}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">{listing.title}</h1>
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                    <MapPin size={13} />
                    <span>{listing.area}</span>
                    {listing.address && <span className="text-gray-300">·</span>}
                    {listing.address && <span>{listing.address}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPrice(listing.price, listing.purpose)}
                  </div>
                  {listing.is_negotiable && (
                    <span className="text-xs text-purple-600 font-medium">Negotiable</span>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
                <span className="flex items-center gap-1"><Eye size={12} /> {listing.view_count} views</span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  Listed {new Date(listing.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {listing.bedrooms && <span className="flex items-center gap-1"><BedDouble size={12} /> {listing.bedrooms} bed</span>}
                {listing.bathrooms && <span className="flex items-center gap-1"><Bath size={12} /> {listing.bathrooms} bath</span>}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={toggleSave}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    saved
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Heart size={14} className={saved ? 'fill-red-500' : ''} />
                  {saved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  <Share2 size={14} /> Share
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 ml-auto"
                >
                  <Flag size={14} /> Report
                </button>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {/* Amenities */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3">Amenities</h2>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                <AmenityRow active={listing.has_water} label="Pipe water" />
                <AmenityRow active={listing.has_electricity} label="Electricity" />
                <AmenityRow active={listing.has_borehole} label="Borehole" />
                <AmenityRow active={listing.has_toilet} label="Indoor toilet" />
                <AmenityRow active={listing.has_fence} label="Fence / compound" />
                <AmenityRow active={listing.has_parking} label="Parking" />
                <AmenityRow active={listing.has_security} label="Security" />
              </div>
            </div>

            {/* Map */}
            {listing.lat && listing.lng && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-3">Location</h2>
                <div className="h-56 rounded-xl overflow-hidden">
                  <DetailMap lat={listing.lat} lng={listing.lng} title={listing.title} />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Exact address shared after inquiry is accepted.
                </p>
              </div>
            )}

            {/* Similar listings */}
            {similar.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-3">Similar properties in {listing.area}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {similar.map(sim => (
                    <Link key={sim.id} href={`/listings/${sim.id}`}>
                      <div className="rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="h-28 bg-gray-100 overflow-hidden">
                          {sim.listing_images?.[0] ? (
                            <img
                              src={sim.listing_images[0].cloudinary_url}
                              alt={sim.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <MapPin size={24} />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-900 line-clamp-1">{sim.title}</p>
                          <p className="text-xs text-blue-600 font-semibold mt-0.5">
                            GHC {sim.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — sticky contact card */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">

              {/* Landlord card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg overflow-hidden">
                    {landlord?.avatar_url
                      ? <img src={landlord.avatar_url} alt="" className="w-full h-full object-cover" />
                      : landlord?.full_name?.[0]?.toUpperCase() || 'L'
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{landlord?.full_name || 'Landlord'}</p>
                    {landlord?.is_verified && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 size={11} /> Verified landlord
                      </span>
                    )}
                  </div>
                </div>

                {/* Call button */}
                {landlord?.phone && (
                  <a
                    href={`tel:${landlord.phone}`}
                    className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors mb-3"
                  >
                    <Phone size={16} /> Call landlord
                  </a>
                )}
              </div>

              {/* Inquiry form */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <InquiryForm listingId={listing.id} listingTitle={listing.title} />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Report modal */}
      {showReport && (
        <ReportModal listingId={listing.id} onClose={() => setShowReport(false)} />
      )}
    </div>
  )
}
