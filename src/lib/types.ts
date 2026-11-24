export type PayoutMethod = 'none' | 'paypal' | 'dwolla'
export type DonationProvider = 'demo' | 'paypal' | 'dwolla'
export type DonationStatus = 'completed' | 'pending' | 'failed'

export interface Profile {
  id: string
  handle: string
  full_name: string
  headline: string
  story: string
  avatar_color: string
  payout_method: PayoutMethod
  payout_email: string
  created_at: string
}

export interface Donation {
  id: string
  recipient_id: string
  amount_cents: number
  provider: DonationProvider
  status: DonationStatus
  created_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile
}

export interface NewDonation {
  recipient_id: string
  amount_cents: number
  provider: DonationProvider
}
