'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import {
  MapPin, Upload, X, Loader2, CheckCircle2,
  ArrowLeft, Video, Image as ImageIcon, Info
} from 'lucide-react'

const PinMap = dynamic(() => import('@/components/PinMap'), { ssr: false })

const AREAS = [
  'Navrongo', 'Bolgatanga', 'Bawku', 'Zebilla',
  'Sandema', 'Chiana', 'Paga', 'Tongo', 'Bongo'
]

const TIERS = [
  { value: 'basic', label: 'Basic', price: 'Free', desc: 'Standard listing' },
  { value: 'featured', label: 'Featured', price: 'GHC 40', desc: 'Top of search results' },
  { value: 'premium', label: 'Premium', price: 'GHC 80', desc: 'Featured + WhatsApp broadcast' },
]

async function uploadToCloudinary(file: File, type: 'image' | 'video'): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'homz-props')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  return data.secure_url
}

export default function NewListingPage() {
  const router = useRouter()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [landlordId, setLandlordId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('single_room')
  const [purpose, setPurpose] = useState('rent')
  const [price, setPrice] = useState('')
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [tier, setTier] = useState('basic')

  // Amenities
  const [amenities, setAmenities] = useState({
    has_water: false, has_electricity: false, has_borehole: false,
    has_toilet: false, has_fence: false, has_parking: false, has_security: false,
  })

  // Media
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('users').select('id, role').eq('auth_id', user.id).single()
      if (!data || data.role !== 'landlord') { router.push('/'); return }
      setLandlordId(data.id)
    }
    init()
  }, [])

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 6 - photos.length)
    setPhotos(prev => [...prev, ...newFiles])
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => setPhotoPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const addVideo = (files: FileList | null) => {
    if (!files || !files[0]) return
    setVideo(files[0])
    setVideoPreview(URL.createObjectURL(files[0]))
  }

  const toggleAmenity = (key: string) => {
    setAmenities(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  const handleSubmit = async () => {
    if (!title || !price || !area || !type || !purpose) {
      setError('Please fill in all required fields')
      return
    }
    if (photos.length === 0) {
      setError('Please add at least one photo')
      return
    }
    if (!landlordId) return

    setSubmitting(true)
    setUploading(true)
    setError('')

    try {
      // Upload all photos
      const imageUrls: string[] = []
      for (const photo of photos) {
        const url = await uploadToCloudinary(photo, 'image')
        imageUrls.push(url)
      }

      // Upload video if provided
      let videoUrl: string | null = null
      if (video) {
        videoUrl = await uploadToCloudinary(video, 'video')
      }

      setUploading(false)

      // Insert listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          landlord_id: landlordId,
          title, description, type, purpose,
          price: parseFloat(price),
          is_negotiable: isNegotiable,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          bathrooms: bathrooms ? parseInt(bathrooms) : null,
          area, address, lat, lng,
          tier,
          status: 'pending',
          ...amenities,
        })
        .select()
        .single()

      if (listingError) throw listingError

      // Insert images
      const imageInserts = imageUrls.map((url, i) => ({
        listing_id: listing.id,
        cloudinary_url: url,
        order_index: i,
      }))
      await supabase.from('listing_images').insert(imageInserts)

      // Insert video
      if (videoUrl) {
        await supabase.from('listing_videos').insert({
          listing_id: listing.id,
          cloudinary_url: videoUrl,
        })
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.')
    }

    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-sm w-full">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Listing submitted!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your property is pending review. We'll activate it shortly.
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm text-center hover:bg-gray-50">
              My listings
            </Link>
            <button
              onClick={() => { setSuccess(false); setTitle(''); setPrice(''); setPhotos([]); setPhotoPreviews([]) }}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700"
            >
              Add another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">HOMZ <span className="text-blue-600">PROPS</span></span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add a new listing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the details below. All listings are reviewed before going live.</p>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Photos <span className="text-red-500">*</span></h2>
          <p className="text-xs text-gray-400 mb-3">Add up to 6 photos. First photo is the cover image.</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {photoPreviews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={src} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">Cover</div>
                )}
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                <ImageIcon size={20} />
                <span className="text-xs mt-1">Add</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => addPhotos(e.target.files)}
          />
        </div>

        {/* Video */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Video walkthrough</h2>
          <p className="text-xs text-gray-400 mb-3">Optional. Max 1 video. Helps seekers see the property better.</p>
          {videoPreview ? (
            <div className="relative rounded-xl overflow-hidden bg-gray-900">
              <video src={videoPreview} controls className="w-full max-h-48 object-contain" />
              <button
                onClick={() => { setVideo(null); setVideoPreview(null) }}
                className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => videoInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              <Video size={24} />
              <span className="text-sm mt-2">Click to upload video</span>
            </button>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={e => addVideo(e.target.files)}
          />
        </div>

        {/* Core details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Property details</h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. Spacious 2-bedroom house in Navrongo"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Type <span className="text-red-500">*</span></label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="single_room">Single Room</option>
                <option value="chamber_hall">Chamber & Hall</option>
                <option value="house">House</option>
                <option value="land">Land</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Purpose <span className="text-red-500">*</span></label>
              <select value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="rent">For Rent</option>
                <option value="sale">For Sale</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Price (GHC) {purpose === 'rent' && <span className="text-gray-400">/ month</span>} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNegotiable}
                  onChange={e => setIsNegotiable(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Price is negotiable</span>
              </label>
            </div>
          </div>

          {type !== 'land' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Bedrooms</label>
                <input type="number" min="0" placeholder="0" value={bedrooms} onChange={e => setBedrooms(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Bathrooms</label>
                <input type="number" min="0" placeholder="0" value={bathrooms} onChange={e => setBathrooms(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              placeholder="Describe the property — size, condition, nearby landmarks, etc."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Amenities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'has_water', label: 'Pipe water' },
              { key: 'has_electricity', label: 'Electricity' },
              { key: 'has_borehole', label: 'Borehole' },
              { key: 'has_toilet', label: 'Indoor toilet' },
              { key: 'has_fence', label: 'Fence / compound' },
              { key: 'has_parking', label: 'Parking' },
              { key: 'has_security', label: 'Security' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleAmenity(key)}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition-colors ${
                  amenities[key as keyof typeof amenities]
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <CheckCircle2 size={14} className={amenities[key as keyof typeof amenities] ? 'text-green-500' : 'text-gray-300'} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Location</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Area <span className="text-red-500">*</span></label>
              <select value={area} onChange={e => setArea(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select area</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Address / landmark</label>
              <input
                type="text"
                placeholder="e.g. Near Catholic Hospital"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Map pin */}
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Info size={12} /> Click the map to drop a pin at the property location
          </p>
          <div className="h-56 rounded-xl overflow-hidden border border-gray-200">
            <PinMap lat={lat} lng={lng} onPin={(la, ln) => { setLat(la); setLng(ln) }} />
          </div>
          {lat && lng && (
            <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={12} /> Pin set at {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          )}
        </div>

        {/* Tier */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Listing tier</h2>
          <p className="text-xs text-gray-400 mb-3">Choose how prominent your listing appears</p>
          <div className="space-y-2">
            {TIERS.map(t => (
              <button
                key={t.value}
                onClick={() => setTier(t.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                  tier === t.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${tier === t.value ? 'text-blue-700' : 'text-gray-800'}`}>{t.label}</p>
                  <p className="text-xs text-gray-500">{t.desc}</p>
                </div>
                <span className={`text-sm font-bold ${tier === t.value ? 'text-blue-600' : 'text-gray-700'}`}>{t.price}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          {submitting
            ? <><Loader2 size={16} className="animate-spin" /> {uploading ? 'Uploading photos...' : 'Submitting...'}</>
            : 'Submit listing for review'
          }
        </button>
      </div>
    </div>
  )
}
