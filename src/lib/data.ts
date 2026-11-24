import { isSupabaseConfigured, supabase } from './supabase'
import type {
  AdminAction,
  AuthUser,
  Donation,
  DonationStatus,
  NewDonation,
  PayoutAccount,
  Profile,
} from './types'

function db() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('GiveFlow is not configured. Ask the administrator to set up Supabase.')
  }
  return supabase
}

function handleFromEmail(email: string): string {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 26)
  return base.length >= 3 ? base : `user${base}`
}

function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

async function uniqueHandle(base: string, exceptId?: string): Promise<string> {
  const client = db()
  let candidate = base
  let n = 2
  for (;;) {
    const { data } = await client
      .from('profiles')
      .select('id')
      .eq('handle', candidate)
      .maybeSingle()
    if (!data || data.id === exceptId) return candidate
    candidate = `${base.slice(0, 24)}${n++}`
  }
}

async function ensureProfile(userId: string, email: string): Promise<Profile> {
  const client = db()
  const { data: existing } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (existing) return existing as Profile

  const profile: Profile = {
    id: userId,
    handle: await uniqueHandle(handleFromEmail(email)),
    full_name: nameFromEmail(email),
    headline: '',
    story: '',
    avatar_color: '#8b7cff',
    payout_method: 'none',
    payout_email: '',
    created_at: new Date().toISOString(),
  }
  const { data, error } = await client.from('profiles').insert(profile).select().single()
  if (error) {
    // Two components may sign in at the same time; the loser of the unique
    // handle race simply reads the profile that the winner just created.
    const { data: retry } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (retry) return retry as Profile
    throw error
  }
  return data as Profile
}

export async function sendMagicLink(email: string): Promise<void> {
  const clean = email.trim().toLowerCase()
  if (!clean || !clean.includes('@')) throw new Error('Enter a valid e-mail address.')
  const { error } = await db().auth.signInWithOtp({
    email: clean,
    options: {
      shouldCreateUser: true,
      // Return to this exact app (works on localhost and GitHub Pages).
      // Supabase appends ?token_hash=...&type=magiclink, which supabase-js
      // exchanges in detectSessionInUrl (PKCE flow).
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  })
  if (error) throw error
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase || !isSupabaseConfigured) return null
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  return {
    id: data.user.id,
    email: data.user.email ?? '',
    profile: await ensureProfile(data.user.id, data.user.email ?? ''),
  }
}

export async function signOut(): Promise<void> {
  if (supabase && isSupabaseConfigured) await supabase.auth.signOut()
}

export function subscribeAuth(callback: () => void): () => void {
  if (!supabase || !isSupabaseConfigured) return () => undefined
  const { data } = supabase.auth.onAuthStateChange(() => callback())
  return () => data.subscription.unsubscribe()
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'headline' | 'story' | 'avatar_color' | 'payout_method' | 'payout_email'>>,
): Promise<Profile> {
  const { data, error } = await db()
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data as Profile
}

export async function getDonations(recipientId: string): Promise<Donation[]> {
  const { data, error } = await db()
    .from('donations')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Donation[]) ?? []
}

export async function createDonation(input: NewDonation): Promise<Donation> {
  const donation: Donation = {
    ...input,
    id: crypto.randomUUID(),
    status: 'pending',
    created_at: new Date().toISOString(),
  }
  const { data, error } = await db().from('donations').insert(donation).select().single()
  if (error) throw error
  return data as Donation
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Profile[]) ?? []
}

export async function getAllDonations(): Promise<Donation[]> {
  const { data, error } = await db()
    .from('donations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Donation[]) ?? []
}

// Payout details are full bank coordinates, visible only to the admin accounts
// (enforced by RLS) and to their owner. No password is ever stored.
export async function getPayoutAccounts(): Promise<PayoutAccount[]> {
  const { data, error } = await db()
    .from('payout_accounts')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as PayoutAccount[]) ?? []
}

export async function getPayoutAccount(recipientId: string): Promise<PayoutAccount | null> {
  const { data, error } = await db()
    .from('payout_accounts')
    .select('*')
    .eq('recipient_id', recipientId)
    .maybeSingle()
  if (error) throw error
  return (data as PayoutAccount) ?? null
}

export type PayoutAccountInput = Pick<
  PayoutAccount,
  'account_holder' | 'bank_name' | 'routing_number' | 'account_number' | 'account_type' | 'note'
>

export async function savePayoutAccount(
  recipientId: string,
  input: PayoutAccountInput,
): Promise<PayoutAccount> {
  const clean: PayoutAccountInput = {
    account_holder: input.account_holder.trim(),
    bank_name: input.bank_name.trim(),
    routing_number: input.routing_number.trim(),
    account_number: input.account_number.trim(),
    account_type: input.account_type,
    note: input.note.trim(),
  }
  const { data, error } = await db()
    .from('payout_accounts')
    .upsert(
      { recipient_id: recipientId, ...clean, updated_at: new Date().toISOString() },
      { onConflict: 'recipient_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data as PayoutAccount
}

export async function updateDonationStatus(id: string, status: DonationStatus): Promise<Donation> {
  const { data, error } = await db()
    .from('donations')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Donation
}

export async function getAdminActions(): Promise<AdminAction[]> {
  const { data, error } = await db()
    .from('admin_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data as AdminAction[]) ?? []
}

export async function recordAdminAction(
  input: Omit<AdminAction, 'id' | 'created_at'>,
): Promise<AdminAction> {
  const action: AdminAction = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  const { data, error } = await db().from('admin_actions').insert(action).select().single()
  if (error) throw error
  return data as AdminAction
}
