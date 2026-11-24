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

const DEMO_KEY = 'giveflow.demo.v4'

interface DemoDb {
  profiles: Profile[]
  donations: Donation[]
  payoutAccounts: PayoutAccount[]
  actions: AdminAction[]
  otps: Record<string, { code: string; expiresAt: number }>
  sessionEmail: string | null
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

function seedDb(): DemoDb {
  const jane: Profile = {
    id: 'jane@demo.local',
    handle: 'jane',
    full_name: 'Jane Miller',
    headline: 'Freelance illustrator · paying off student loans',
    story:
      "Hi! I'm Jane, an illustrator in Austin. I'm saving up for a studio upgrade so I can take on more freelance work. Every little bit helps — thank you for being here.",
    avatar_color: '#8b7cff',
    payout_method: 'bank',
    payout_email: 'jane@example.com',
    created_at: daysAgo(40),
  }
  const marcus: Profile = {
    id: 'marcus@demo.local',
    handle: 'marcus',
    full_name: 'Marcus Reed',
    headline: 'Dad, mechanic, and weekend guitar teacher',
    story:
      "I'm fixing up my old garage workshop and would love a hand with the new tools. I'll share photos of the finished build!",
    avatar_color: '#22c55e',
    payout_method: 'bank',
    payout_email: 'marcus@example.com',
    created_at: daysAgo(25),
  }

  const donation = (id: string, recipient_id: string, amount_cents: number, days: number): Donation => ({
    id,
    recipient_id,
    amount_cents,
    provider: 'demo',
    status: 'completed',
    created_at: daysAgo(days),
  })

  const payoutAccount = (
    id: string,
    recipient_id: string,
    account_holder: string,
    bank_name: string,
    account_reference: string,
    days: number,
  ): PayoutAccount => ({
    id,
    recipient_id,
    account_holder,
    bank_name,
    account_reference,
    note: 'Checking account',
    created_at: daysAgo(days + 20),
    updated_at: daysAgo(days),
  })

  return {
    profiles: [jane, marcus],
    donations: [
      donation('d1', jane.id, 5000, 1),
      donation('d2', jane.id, 2500, 3),
      donation('d3', jane.id, 10000, 8),
      donation('d4', jane.id, 1000, 14),
      donation('d5', marcus.id, 7500, 2),
      donation('d6', marcus.id, 2500, 6),
    ],
    payoutAccounts: [
      payoutAccount('pa1', jane.id, 'Jane Miller', 'Chase', '•••• 4242', 2),
      payoutAccount('pa2', marcus.id, 'Marcus Reed', 'Bank of America', '•••• 8871', 4),
    ],
    otps: {},
    actions: [],
    sessionEmail: null,
  }
}

function readDemo(): DemoDb {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return JSON.parse(raw) as DemoDb
  } catch {
    // corrupted storage -> start fresh
  }
  const fresh = seedDb()
  writeDemo(fresh)
  return fresh
}

function writeDemo(db: DemoDb) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(db))
  } catch {
    // private browsing / quota — the prototype still works in memory
  }
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
  let candidate = base
  let n = 2
  for (;;) {
    if (supabase && isSupabaseConfigured) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', candidate)
        .maybeSingle()
      if (!data || data.id === exceptId) return candidate
    } else {
      const found = readDemo().profiles.find((p) => p.handle === candidate && p.id !== exceptId)
      if (!found) return candidate
    }
    candidate = `${base.slice(0, 24)}${n++}`
  }
}

async function ensureProfile(userId: string, email: string): Promise<Profile> {
  if (supabase && isSupabaseConfigured) {
    const { data: existing } = await supabase
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
    const { data, error } = await supabase.from('profiles').insert(profile).select().single()
    if (error) {
      // Two components may sign in at the same time; the loser of the unique
      // handle race simply reads the profile that the winner just created.
      const { data: retry } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (retry) return retry as Profile
      throw error
    }
    return data as Profile
  }

  const db = readDemo()
  const existing = db.profiles.find((p) => p.id === userId)
  if (existing) return existing
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
  db.profiles.push(profile)
  writeDemo(db)
  return profile
}

export async function sendOtp(email: string): Promise<{ demoCode?: string }> {
  const clean = email.trim().toLowerCase()
  if (!clean || !clean.includes('@')) throw new Error('Enter a valid e-mail address.')

  if (supabase && isSupabaseConfigured) {
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    })
    if (error) throw error
    return {}
  }

  const db = readDemo()
  const code = String(Math.floor(100000 + Math.random() * 900000))
  db.otps[clean] = { code, expiresAt: Date.now() + 10 * 60_000 }
  writeDemo(db)
  return { demoCode: code }
}

export async function verifyOtp(email: string, code: string): Promise<AuthUser> {
  const clean = email.trim().toLowerCase()

  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: clean,
      token: code.trim(),
      type: 'email',
    })
    if (error) throw error
    if (!data.user) throw new Error('Could not verify this code.')
    return {
      id: data.user.id,
      email: data.user.email ?? clean,
      profile: await ensureProfile(data.user.id, data.user.email ?? clean),
    }
  }

  const db = readDemo()
  const record = db.otps[clean]
  if (!record || record.expiresAt < Date.now()) throw new Error('Code expired. Request a new one.')
  if (record.code !== code.trim()) throw new Error('Wrong code. Try again.')
  db.sessionEmail = clean
  delete db.otps[clean]
  writeDemo(db)
  const profile = await ensureProfile(clean, clean)
  return { id: clean, email: clean, profile }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      profile: await ensureProfile(data.user.id, data.user.email ?? ''),
    }
  }

  const db = readDemo()
  if (!db.sessionEmail) return null
  const profile = db.profiles.find((p) => p.id === db.sessionEmail)
  if (!profile) return null
  return { id: profile.id, email: db.sessionEmail, profile }
}

export async function signOut(): Promise<void> {
  if (supabase && isSupabaseConfigured) {
    await supabase.auth.signOut()
  } else {
    const db = readDemo()
    db.sessionEmail = null
    writeDemo(db)
    window.dispatchEvent(new Event('giveflow:auth'))
  }
}

export function subscribeAuth(callback: () => void): () => void {
  let unsubscribeSupabase: (() => void) | undefined
  if (supabase && isSupabaseConfigured) {
    const { data } = supabase.auth.onAuthStateChange(() => callback())
    unsubscribeSupabase = data.subscription.unsubscribe
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === DEMO_KEY) callback()
  }
  const onLocalEvent = () => callback()
  window.addEventListener('storage', onStorage)
  window.addEventListener('giveflow:auth', onLocalEvent)
  return () => {
    unsubscribeSupabase?.()
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('giveflow:auth', onLocalEvent)
  }
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const clean = handle.toLowerCase()
  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase.from('profiles').select('*').eq('handle', clean).maybeSingle()
    return (data as Profile) ?? null
  }
  return readDemo().profiles.find((p) => p.handle === clean) ?? null
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'headline' | 'story' | 'avatar_color' | 'payout_method' | 'payout_email'>>,
): Promise<Profile> {
  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data as Profile
  }

  const db = readDemo()
  const index = db.profiles.findIndex((p) => p.id === userId)
  if (index < 0) throw new Error('Profile not found.')
  db.profiles[index] = { ...db.profiles[index], ...patch }
  writeDemo(db)
  window.dispatchEvent(new Event('giveflow:auth'))
  return db.profiles[index]
}

export async function getDonations(recipientId: string): Promise<Donation[]> {
  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase
      .from('donations')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
    return (data as Donation[]) ?? []
  }
  return readDemo()
    .donations.filter((d) => d.recipient_id === recipientId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function createDonation(input: NewDonation): Promise<Donation> {
  const donation: Donation = {
    ...input,
    id: crypto.randomUUID(),
    status: 'pending',
    created_at: new Date().toISOString(),
  }

  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase.from('donations').insert(donation).select().single()
    if (error) throw error
    return data as Donation
  }

  const db = readDemo()
  db.donations.unshift(donation)
  writeDemo(db)
  return donation
}

// Admin console — reads every profile and every donation.
// Prototype only: in production this must be backed by server-side auth + RLS.
export async function getAllProfiles(): Promise<Profile[]> {
  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    return (data as Profile[]) ?? []
  }
  return [...readDemo().profiles].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getAllDonations(): Promise<Donation[]> {
  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false })
    return (data as Donation[]) ?? []
  }
  return [...readDemo().donations].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// Payout references are masked on purpose: no full account number or password
// is ever stored. Full details stay with the bank / payment provider.
export async function getPayoutAccounts(): Promise<PayoutAccount[]> {
  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase
      .from('payout_accounts')
      .select('*')
      .order('updated_at', { ascending: false })
    return (data as PayoutAccount[]) ?? []
  }
  return [...readDemo().payoutAccounts].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export async function getPayoutAccount(recipientId: string): Promise<PayoutAccount | null> {
  const accounts = await getPayoutAccounts()
  return accounts.find((account) => account.recipient_id === recipientId) ?? null
}

export type PayoutAccountInput = Pick<
  PayoutAccount,
  'account_holder' | 'bank_name' | 'account_reference' | 'note'
>

export async function savePayoutAccount(
  recipientId: string,
  input: PayoutAccountInput,
): Promise<PayoutAccount> {
  const now = new Date().toISOString()
  const clean: PayoutAccountInput = {
    account_holder: input.account_holder.trim(),
    bank_name: input.bank_name.trim(),
    account_reference: input.account_reference.trim(),
    note: input.note.trim(),
  }

  if (supabase && isSupabaseConfigured) {
    const { data: existing } = await supabase
      .from('payout_accounts')
      .select('id, created_at')
      .eq('recipient_id', recipientId)
      .maybeSingle()
    const record = {
      recipient_id: recipientId,
      ...clean,
      updated_at: now,
    }
    const { data, error } = existing
      ? await supabase.from('payout_accounts').update(record).eq('id', existing.id).select().single()
      : await supabase
          .from('payout_accounts')
          .insert({ ...record, id: crypto.randomUUID(), created_at: now })
          .select()
          .single()
    if (error) throw error
    return data as PayoutAccount
  }

  const db = readDemo()
  const index = db.payoutAccounts.findIndex((account) => account.recipient_id === recipientId)
  if (index >= 0) {
    db.payoutAccounts[index] = { ...db.payoutAccounts[index], ...clean, updated_at: now }
    writeDemo(db)
    return db.payoutAccounts[index]
  }
  const created: PayoutAccount = {
    id: crypto.randomUUID(),
    recipient_id: recipientId,
    ...clean,
    created_at: now,
    updated_at: now,
  }
  db.payoutAccounts.unshift(created)
  writeDemo(db)
  return created
}

export async function updateDonationStatus(id: string, status: DonationStatus): Promise<Donation> {
  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('donations')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Donation
  }

  const db = readDemo()
  const index = db.donations.findIndex((d) => d.id === id)
  if (index < 0) throw new Error('Donation not found.')
  db.donations[index] = { ...db.donations[index], status }
  writeDemo(db)
  return db.donations[index]
}

export async function getAdminActions(): Promise<AdminAction[]> {
  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    return (data as AdminAction[]) ?? []
  }
  return [...readDemo().actions].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function recordAdminAction(
  input: Omit<AdminAction, 'id' | 'created_at'>,
): Promise<AdminAction> {
  const action: AdminAction = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }

  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase.from('admin_actions').insert(action).select().single()
    if (error) throw error
    return data as AdminAction
  }

  const db = readDemo()
  db.actions.unshift(action)
  writeDemo(db)
  return action
}
