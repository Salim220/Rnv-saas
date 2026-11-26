export type PayoutMethod = 'none' | 'bank'
export type AccountType = 'checking' | 'savings'
export type DonationProvider = 'manual'
export type DonationStatus = 'pending' | 'completed' | 'paid' | 'rejected' | 'failed'

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

// Columns exposed by the public.public_profiles view (no payout e-mail, no
// payout method): exactly what the public donation page needs.
export type PublicProfile = Pick<
  Profile,
  'id' | 'handle' | 'full_name' | 'headline' | 'story' | 'avatar_color' | 'created_at'
>

export interface PayoutAccount {
  id: string
  recipient_id: string
  account_holder: string
  bank_name: string
  routing_number: string
  account_number: string
  account_type: AccountType
  note: string
  created_at: string
  updated_at: string
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

export type AdminActionType =
  | 'approve'
  | 'reject'
  | 'mark_paid'
  | 'view_profile'
  | 'request_sensitive_data'

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
