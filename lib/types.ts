export type UserRole = 'landlord' | 'seeker' | 'admin'
export type PropertyType = 'single_room' | 'chamber_hall' | 'house' | 'land'
export type PropertyPurpose = 'rent' | 'sale'
export type ListingStatus = 'pending' | 'active' | 'unavailable' | 'sold' | 'rented' | 'deleted'
export type ListingTier = 'basic' | 'featured' | 'premium'
export type InquiryStatus = 'new' | 'read' | 'closed'

export interface User {
  id: string
  auth_id: string
  full_name: string
  phone: string
  email: string
  role: UserRole
  is_banned: boolean
  is_verified: boolean
  avatar_url?: string
  created_at: string
}

export interface Listing {
  id: string
  landlord_id: string
  title: string
  description?: string
  type: PropertyType
  purpose: PropertyPurpose
  price: number
  is_negotiable: boolean
  bedrooms?: number
  bathrooms?: number
  has_water: boolean
  has_electricity: boolean
  has_borehole: boolean
  has_toilet: boolean
  has_fence: boolean
  has_parking: boolean
  has_security: boolean
  area: string
  address?: string
  lat?: number
  lng?: number
  status: ListingStatus
  tier: ListingTier
  listing_fee?: number
  fee_paid: boolean
  view_count: number
  created_at: string
  updated_at: string
  listing_images?: ListingImage[]
  listing_videos?: ListingVideo[]
  users?: User
}

export interface ListingImage {
  id: string
  listing_id: string
  cloudinary_url: string
  order_index: number
}

export interface ListingVideo {
  id: string
  listing_id: string
  cloudinary_url: string
}

export interface Inquiry {
  id: string
  listing_id: string
  seeker_id: string
  message: string
  status: InquiryStatus
  created_at: string
}

export interface SavedListing {
  id: string
  user_id: string
  listing_id: string
  created_at: string
}
