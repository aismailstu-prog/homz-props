'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Listing, User } from '@/lib/types'
import {
  MapPin, Plus, Eye, MessageSquare, TrendingUp,
  CheckCircle2, Clock, XCircle, Home, LogOut,
  Edit2, Trash2, ToggleLeft, ToggleRight, Loader2,
  Bell, Star
} from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-green-100 text-green-700 border-green-200',
  pending:     'bg-amber-100 text-amber-700 border-amber-200',
  unavailable: 'bg-gray-100 text-gray-600 border-gray-200',
  sold:        'bg-blue-100 text-blue-700 border-blue-200',
  rented:      'bg-purple-100 text-purple-700 border-purple-200',
  deleted:     'bg-red-100 text-red-600 border-red-200',
}

const STATUS_ICONS: Record<string, any> = {
  active:      CheckCircle2,
  pending:     Clock,
  unavailable: ToggleLeft,
  sold:        Star,
  rented:      Star,
  deleted:     XCircle,
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [inquiryCounts, setInquiryCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/auth/login'); return }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single()

      if (!userData || userData.role !== 'landlord') {
        router.push('/')
        return
      }

      setUser(userData)

      const { data: listingsData } = await supabase
        .from('listings')
        .select('*, listing_images(cloudinary_url, order_index)')
        .eq('landlord_id', userData.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

      if (listingsData) {
        setListings(listingsData as Listing[])

        // Fetch inquiry counts per listing
        const counts: Record<string, number> = {}
        for (const l of listingsData) {
          const { count } = await supabase
            .from('inquiries')
            .select('*', { count: 'exact', head: true })
            .eq('listing_id', l.id)
          counts[l.id] = count || 0
        }
        setInquiryCounts(counts)
      }

      setLoading(false)
    }
    init()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setDeleting(id)
    await supabase.from('listings').update({ status: 'deleted' }).eq('id', id)
    setListings(prev => prev.filter(l => l.id !== id))
    setDeleting(null)
  }

  const toggleAvailability = async (listing: Listing) => {
    const newStatus = listing.status === 'active' ? 'unavailable' : 'active'
    await supabase.from('listings').update({ status: newStatus }).eq('id', listing.id)
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: newStatus as any } : l))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const totalViews = listings.reduce((sum, l) => sum + (l.view_count || 0), 0)
  const totalInquiries = Object.values(inquiryCounts).reduce((a, b) => a + b, 0)
  const activeCount = listings.filter(l => l.status === 'active').length
  const pendingCount = listings.filter(l => l.status === 'pending').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

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
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">Landlord</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Active listings', value: activeCount, icon: Home, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pending approval', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Total views', value: totalViews, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total inquiries', value: totalInquiries, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">My listings</h2>
          <Link
            href="/dashboard/new"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-full transition-colors"
          >
            <Plus size={16} /> Add listing
          </Link>
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Home size={40} className="mx-auto text-gray-300 mb-3" />
            <h3 className="font-semibold text-gray-700 mb-1">No listings yet</h3>
            <p className="text-sm text-gray-400 mb-4">Add your first property to get started</p>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm px-5 py-2 rounded-full hover:bg-blue-700"
            >
              <Plus size={15} /> Add your first listing
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map(listing => {
              const StatusIcon = STATUS_ICONS[listing.status] || Clock
              const image = listing.listing_images?.[0]?.cloudinary_url
              return (
                <div key={listing.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 items-start">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {image
                      ? <img src={image} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300"><MapPin size={24} /></div>
                    }
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{listing.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{listing.area} · GHC {listing.price.toLocaleString()}{listing.purpose === 'rent' ? '/mo' : ''}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${STATUS_STYLES[listing.status]}`}>
                        <StatusIcon size={10} />
                        {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Eye size={11} /> {listing.view_count} views</span>
                      <span className="flex items-center gap-1"><MessageSquare size={11} /> {inquiryCounts[listing.id] || 0} inquiries</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Link
                        href={`/dashboard/edit/${listing.id}`}
                        className="flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-50"
                      >
                        <Edit2 size={11} /> Edit
                      </Link>

                      {(listing.status === 'active' || listing.status === 'unavailable') && (
                        <button
                          onClick={() => toggleAvailability(listing)}
                          className="flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-50"
                        >
                          {listing.status === 'active'
                            ? <><ToggleLeft size={11} /> Mark unavailable</>
                            : <><ToggleRight size={11} /> Mark available</>
                          }
                        </button>
                      )}

                      <Link
                        href={`/listings/${listing.id}`}
                        className="flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-50"
                      >
                        <Eye size={11} /> View
                      </Link>

                      <button
                        onClick={() => handleDelete(listing.id)}
                        disabled={deleting === listing.id}
                        className="flex items-center gap-1 text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-full hover:bg-red-50 ml-auto"
                      >
                        {deleting === listing.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Trash2 size={11} />
                        }
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
