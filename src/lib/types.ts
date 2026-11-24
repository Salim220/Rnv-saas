export type PayoutMethod = 'none' | 'paypal' | 'dwolla'
export type DonationProvider = 'demo' | 'paypal' | 'dwolla'
export type DonationStatus = 'pending' | 'completed' | 'rejected' | 'failed'

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

export type AdminActionType = 'approve' | 'reject' | 'view_profile' | 'request_sensitive_data'

export interface AdminAction {
  id: string
  admin_id: string
  admin_email: string
  action: AdminActionType
  target_id: string
  target_label: string
  reason: string
  created_at: string
}

export interface NewDonation {
  recipient_id: string
  amount_cents: number
  provider: DonationProvider
}
