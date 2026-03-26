'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Shield, Users, Home, Flag, CheckCircle2,
  XCircle, Trash2, Edit2, Eye, Ban, LogOut,
  Loader2, MapPin, Clock, AlertTriangle,
  ToggleLeft, ChevronRight, Star
} from 'lucide-react'

type Tab = 'pending' | 'listings' | 'users' | 'reports'

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')
  const [adminUser, setAdminUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Data
  const [pendingListings, setPendingListings] = useState<any[]>([])
  const [allListings, setAllListings] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])

  // Counts
  const [counts, setCounts] = useState({ pending: 0, listings: 0, users: 0, reports: 0 })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return }

      const { data: userData } = await supabase
        .from('users').select('*').eq('auth_id', user.id).single()

      if (userData?.role !== 'admin') { router.push('/'); return }
      setAdminUser(userData)

      await Promise.all([fetchPending(), fetchListings(), fetchUsers(), fetchReports()])
      setLoading(false)
    }
    init()
  }, [])

  const fetchPending = async () => {
    const { data, count } = await supabase
      .from('listings')
      .select('*, listing_images(cloudinary_url, order_index), users(full_name, phone, is_verified)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (data) { setPendingListings(data); setCounts(c => ({ ...c, pending: count || 0 })) }
  }

  const fetchListings = async () => {
    const { data, count } = await supabase
      .from('listings')
      .select('*, listing_images(cloudinary_url, order_index), users(full_name, phone)', { count: 'exact' })
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) { setAllListings(data); setCounts(c => ({ ...c, listings: count || 0 })) }
  }

  const fetchUsers = async () => {
    const { data, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .neq('role', 'admin')
      .order('created_at', { ascending: false })
    if (data) { setUsers(data); setCounts(c => ({ ...c, users: count || 0 })) }
  }

  const fetchReports = async () => {
    const { data, count } = await supabase
      .from('reports')
      .select('*, listings(title, area), users(full_name)', { count: 'exact' })
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (data) { setReports(data); setCounts(c => ({ ...c, reports: count || 0 })) }
  }

  const logAction = async (action: string, targetType: string, targetId: string, notes?: string) => {
    await supabase.from('admin_log').insert({
      admin_id: adminUser.id,
      action, target_type: targetType, target_id: targetId, notes
    })
  }

  const approveListing = async (id: string) => {
    setActionLoading(id)
    await supabase.from('listings').update({ status: 'active' }).eq('id', id)
    await logAction('approved_listing', 'listing', id)
    setPendingListings(prev => prev.filter(l => l.id !== id))
    setCounts(c => ({ ...c, pending: c.pending - 1 }))
    setActionLoading(null)
  }

  const rejectListing = async (id: string) => {
    setActionLoading(id + '_reject')
    await supabase.from('listings').update({ status: 'deleted' }).eq('id', id)
    await logAction('rejected_listing', 'listing', id)
    setPendingListings(prev => prev.filter(l => l.id !== id))
    setCounts(c => ({ ...c, pending: c.pending - 1 }))
    setActionLoading(null)
  }

  const deleteListing = async (id: string) => {
    if (!confirm('Permanently delete this listing?')) return
    setActionLoading(id + '_del')
    await supabase.from('listings').update({ status: 'deleted' }).eq('id', id)
    await logAction('deleted_listing', 'listing', id)
    setAllListings(prev => prev.filter(l => l.id !== id))
    setActionLoading(null)
  }

  const setListingStatus = async (id: string, status: string) => {
    setActionLoading(id + '_status')
    await supabase.from('listings').update({ status }).eq('id', id)
    await logAction(`set_listing_${status}`, 'listing', id)
    setAllListings(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    setActionLoading(null)
  }

  const toggleVerifyLandlord = async (userId: string, current: boolean) => {
    setActionLoading(userId + '_verify')
    await supabase.from('users').update({ is_verified: !current }).eq('id', userId)
    await logAction(current ? 'unverified_user' : 'verified_user', 'user', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !current } : u))
    setActionLoading(null)
  }

  const toggleBanUser = async (userId: string, current: boolean) => {
    if (!confirm(current ? 'Unban this user?' : 'Ban this user? They will be locked out immediately.')) return
    setActionLoading(userId + '_ban')
    await supabase.from('users').update({ is_banned: !current }).eq('id', userId)
    await logAction(current ? 'unbanned_user' : 'banned_user', 'user', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !current } : u))
    setActionLoading(null)
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user and all their listings? This cannot be undone.')) return
    setActionLoading(userId + '_deluser')
    await supabase.from('users').delete().eq('id', userId)
    await logAction('deleted_user', 'user', userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
    setActionLoading(null)
  }

  const dismissReport = async (reportId: string) => {
    setActionLoading(reportId)
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId)
    await logAction('dismissed_report', 'report', reportId)
    setReports(prev => prev.filter(r => r.id !== reportId))
    setActionLoading(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'pending', label: 'Pending', icon: Clock, count: counts.pending },
    { key: 'listings', label: 'Listings', icon: Home, count: counts.listings },
    { key: 'users', label: 'Users', icon: Users, count: counts.users },
    { key: 'reports', label: 'Reports', icon: Flag, count: counts.reports },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Admin header */}
      <header className="bg-gray-900 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={16} />
            </div>
            <div>
              <span className="font-bold text-sm">HOMZ PROPS</span>
              <span className="text-gray-400 text-xs ml-2">Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{adminUser?.full_name}</span>
            <Link href="/" className="text-xs text-gray-400 hover:text-white">View site</Link>
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <t.icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  t.key === 'pending' || t.key === 'reports'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* PENDING TAB */}
        {tab === 'pending' && (
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-4">
              Pending approval ({pendingListings.length})
            </h2>
            {pendingListings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3" />
                <p className="text-gray-500 font-medium">All caught up — no pending listings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingListings.map(listing => {
                  const image = listing.listing_images?.[0]?.cloudinary_url
                  return (
                    <div key={listing.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {image
                          ? <img src={image} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-300"><MapPin size={24} /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">{listing.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {listing.area} · GHC {listing.price?.toLocaleString()} · {listing.type?.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              By {listing.users?.full_name} · {listing.users?.phone}
                            </p>
                          </div>
                          <Link href={`/listings/${listing.id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0">
                            <Eye size={11} /> Preview
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => approveListing(listing.id)}
                            disabled={actionLoading === listing.id}
                            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-1.5 rounded-full disabled:opacity-60"
                          >
                            {actionLoading === listing.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : <CheckCircle2 size={11} />
                            }
                            Approve
                          </button>
                          <button
                            onClick={() => rejectListing(listing.id)}
                            disabled={actionLoading === listing.id + '_reject'}
                            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-1.5 rounded-full disabled:opacity-60"
                          >
                            {actionLoading === listing.id + '_reject'
                              ? <Loader2 size={11} className="animate-spin" />
                              : <XCircle size={11} />
                            }
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* LISTINGS TAB */}
        {tab === 'listings' && (
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-4">All listings ({counts.listings})</h2>
            <div className="space-y-3">
              {allListings.map(listing => {
                const image = listing.listing_images?.[0]?.cloudinary_url
                const statusColors: Record<string, string> = {
                  active: 'bg-green-100 text-green-700',
                  pending: 'bg-amber-100 text-amber-700',
                  sold: 'bg-blue-100 text-blue-700',
                  rented: 'bg-purple-100 text-purple-700',
                  unavailable: 'bg-gray-100 text-gray-600',
                }
                return (
                  <div key={listing.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {image
                        ? <img src={image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300"><MapPin size={20} /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{listing.title}</h3>
                          <p className="text-xs text-gray-500">{listing.area} · GHC {listing.price?.toLocaleString()} · By {listing.users?.full_name}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[listing.status] || 'bg-gray-100 text-gray-600'}`}>
                          {listing.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Link href={`/listings/${listing.id}`} className="flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-50">
                          <Eye size={10} /> View
                        </Link>
                        <Link href={`/admin/edit/${listing.id}`} className="flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-50">
                          <Edit2 size={10} /> Edit
                        </Link>
                        {listing.status !== 'sold' && (
                          <button onClick={() => setListingStatus(listing.id, 'sold')} disabled={!!actionLoading} className="flex items-center gap-1 text-xs border border-blue-200 text-blue-600 px-2.5 py-1 rounded-full hover:bg-blue-50">
                            <Star size={10} /> Mark sold
                          </button>
                        )}
                        {listing.status !== 'rented' && listing.type !== 'land' && (
                          <button onClick={() => setListingStatus(listing.id, 'rented')} disabled={!!actionLoading} className="flex items-center gap-1 text-xs border border-purple-200 text-purple-600 px-2.5 py-1 rounded-full hover:bg-purple-50">
                            <Star size={10} /> Mark rented
                          </button>
                        )}
                        <button
                          onClick={() => deleteListing(listing.id)}
                          disabled={actionLoading === listing.id + '_del'}
                          className="flex items-center gap-1 text-xs border border-red-200 text-red-500 px-2.5 py-1 rounded-full hover:bg-red-50 ml-auto"
                        >
                          {actionLoading === listing.id + '_del'
                            ? <Loader2 size={10} className="animate-spin" />
                            : <Trash2 size={10} />
                          }
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-4">All users ({counts.users})</h2>
            <div className="space-y-2">
              {users.map(user => (
                <div key={user.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${user.is_banned ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                    {user.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        user.role === 'landlord' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>{user.role}</span>
                      {user.is_verified && (
                        <span className="text-xs flex items-center gap-0.5 text-green-600">
                          <CheckCircle2 size={11} /> Verified
                        </span>
                      )}
                      {user.is_banned && (
                        <span className="text-xs flex items-center gap-0.5 text-red-600">
                          <Ban size={11} /> Banned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{user.email} · {user.phone}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {user.role === 'landlord' && (
                      <button
                        onClick={() => toggleVerifyLandlord(user.id, user.is_verified)}
                        disabled={actionLoading === user.id + '_verify'}
                        title={user.is_verified ? 'Remove verification' : 'Verify landlord'}
                        className={`p-2 rounded-full border text-xs transition-colors ${
                          user.is_verified
                            ? 'border-green-300 text-green-600 hover:bg-green-50'
                            : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        {actionLoading === user.id + '_verify'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <CheckCircle2 size={14} />
                        }
                      </button>
                    )}
                    <button
                      onClick={() => toggleBanUser(user.id, user.is_banned)}
                      disabled={actionLoading === user.id + '_ban'}
                      title={user.is_banned ? 'Unban user' : 'Ban user'}
                      className={`p-2 rounded-full border text-xs transition-colors ${
                        user.is_banned
                          ? 'border-orange-300 text-orange-500 hover:bg-orange-50'
                          : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {actionLoading === user.id + '_ban'
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Ban size={14} />
                      }
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      disabled={actionLoading === user.id + '_deluser'}
                      title="Delete user"
                      className="p-2 rounded-full border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {actionLoading === user.id + '_deluser'
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {tab === 'reports' && (
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-4">Open reports ({reports.length})</h2>
            {reports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3" />
                <p className="text-gray-500 font-medium">No open reports</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <div key={report.id} className="bg-white rounded-2xl border border-amber-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle size={14} className="text-amber-500" />
                          <p className="font-medium text-sm text-gray-900">
                            {report.listings?.title || 'Unknown listing'}
                          </p>
                          <span className="text-xs text-gray-400">· {report.listings?.area}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{report.reason}</p>
                        <p className="text-xs text-gray-400">Reported by {report.users?.full_name}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={`/listings/${report.listing_id}`}
                          className="flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-full hover:bg-gray-50"
                        >
                          <Eye size={10} /> View
                        </Link>
                        <button
                          onClick={() => dismissReport(report.id)}
                          disabled={actionLoading === report.id}
                          className="flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-full hover:bg-gray-50"
                        >
                          {actionLoading === report.id
                            ? <Loader2 size={10} className="animate-spin" />
                            : <XCircle size={10} />
                          }
                          Dismiss
                        </button>
                        <button
                          onClick={() => deleteListing(report.listing_id)}
                          className="flex items-center gap-1 text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-full hover:bg-red-600"
                        >
                          <Trash2 size={10} /> Remove listing
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
