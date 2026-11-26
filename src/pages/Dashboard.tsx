import { ArrowUpRight, Check, Clock, Copy, ExternalLink, Heart, Landmark, Save, Wallet } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { useUser } from '../hooks/useUser'
import { getDonations, getPayoutAccount, savePayoutAccount, updateProfile } from '../lib/data'
import { formatMoney, pageUrl, timeAgo } from '../lib/format'
import type { AccountType, Donation, DonationStatus, PayoutMethod } from '../lib/types'

const COLORS = ['#8b7cff', '#22c55e', '#f97316', '#0ea5e9', '#ec4899', '#0f172a']

interface ProfileForm {
  full_name: string
  headline: string
  story: string
  avatar_color: string
  payout_method: PayoutMethod
  payout_email: string
}

interface PayoutForm {
  account_holder: string
  bank_name: string
  routing_number: string
  account_number: string
  account_type: AccountType
  note: string
}

const emptyPayout: PayoutForm = {
  account_holder: '',
  bank_name: '',
  routing_number: '',
  account_number: '',
  account_type: 'checking',
  note: '',
}

const trackingSteps = ['Requested', 'Reviewed', 'Paid out']

function stepIndex(status: DonationStatus): number {
  if (status === 'paid') return 2
  if (status === 'completed') return 1
  return 0
}

function statusLabel(status: DonationStatus): string {
  if (status === 'paid') return 'Paid out'
  if (status === 'completed') return 'Approved'
  if (status === 'pending') return 'Awaiting review'
  if (status === 'rejected') return 'Rejected'
  return status
}

function statusClass(status: DonationStatus): string {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-700'
  if (status === 'completed') return 'bg-sky-50 text-sky-700'
  if (status === 'pending') return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

export function Dashboard() {
  const { user, loading, refresh } = useUser()
  const [donations, setDonations] = useState<Donation[]>([])
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [payout, setPayout] = useState<PayoutForm>(emptyPayout)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [payoutSaved, setPayoutSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [payoutBusy, setPayoutBusy] = useState(false)
  const [error, setError] = useState('')
  const initialized = useRef<string | null>(null)

  useEffect(() => {
    if (!user) return
    const load = () => {
      getDonations(user.id).then(setDonations).catch(() => setDonations([]))
    }
    load()
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(load, 15_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user || initialized.current === user.id) return
    initialized.current = user.id
    setForm({
      full_name: user.profile.full_name,
      headline: user.profile.headline,
      story: user.profile.story,
      avatar_color: user.profile.avatar_color,
      payout_method: user.profile.payout_method,
      payout_email: user.profile.payout_email,
    })
    getPayoutAccount(user.id)
      .then((account) => setPayout(account ? {
        account_holder: account.account_holder,
        bank_name: account.bank_name,
        routing_number: account.routing_number,
        account_number: account.account_number,
        account_type: account.account_type,
        note: account.note,
      } : emptyPayout))
      .catch(() => setPayout(emptyPayout))
  }, [user])

  if (loading) {
    return <div className="mx-auto max-w-6xl px-5 py-24 text-center text-sm text-slate-500">Loading…</div>
  }
  if (!user) return <Navigate to="/signin" replace state={{ from: 'dashboard' }} />

  const counted = donations.filter((d) => d.status === 'completed' || d.status === 'paid')
  const total = counted.reduce((sum, d) => sum + d.amount_cents, 0)
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000
  const thisMonth = counted
    .filter((d) => new Date(d.created_at).getTime() >= thirtyDaysAgo)
    .reduce((sum, d) => sum + d.amount_cents, 0)
  const pendingCount = donations.filter((d) => d.status === 'pending').length
  const link = pageUrl(user.profile.handle)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const input = document.createElement('textarea')
      input.value = link
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!form || !user) return
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const updated = await updateProfile(user.id, form)
      setForm((current) => ({ ...current!, full_name: updated.full_name }))
      refresh()
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSavePayout(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    if (payout.routing_number.replace(/\D/g, '').length !== 9) {
      setError('Routing number must contain 9 digits.')
      return
    }
    setPayoutBusy(true)
    setError('')
    setPayoutSaved(false)
    try {
      await savePayoutAccount(user.id, payout)
      await updateProfile(user.id, {
        payout_method: 'bank',
        payout_email: form?.payout_email ?? user.profile.payout_email,
      })
      refresh()
      setPayoutSaved(true)
      window.setTimeout(() => setPayoutSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save bank details.')
    } finally {
      setPayoutBusy(false)
    }
  }

  const stats = [
    { label: 'Approved support', value: formatMoney(total), icon: Heart, accent: 'text-brand-600 bg-brand-500/10' },
    { label: 'Completed requests', value: String(counted.length), icon: ArrowUpRight, accent: 'text-sky-600 bg-sky-500/10' },
    { label: 'Last 30 days', value: formatMoney(thisMonth), icon: Wallet, accent: 'text-emerald-600 bg-emerald-500/10' },
    { label: 'Awaiting review', value: String(pendingCount), icon: Clock, accent: 'text-amber-600 bg-amber-500/10' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={form?.full_name || user.email} color={form?.avatar_color || user.profile.avatar_color} size="lg" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Welcome back{form?.full_name ? `, ${form.full_name.split(' ')[0]}` : ''}.</h1>
            <p className="mt-1 text-sm text-slate-500">Here's how your page is doing.</p>
          </div>
        </div>
        <Link to={`/u/${user.profile.handle}`} className="ghost-btn">
          View public page <ExternalLink size={16} />
        </Link>
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="card p-5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}><Icon size={18} /></div>
            <p className="mt-5 text-2xl font-extrabold tracking-tight">{value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Your donation link</h2>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-2 pl-4">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">{link}</span>
              <button onClick={copyLink} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink-950 px-3 py-2 text-xs font-semibold text-white">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">This is your personal page — share the exact link above anywhere.</p>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Your page</h2>
              {saved && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} /> Saved</span>}
            </div>
            {form && (
              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div>
                  <label className="label" htmlFor="full_name">Display name</label>
                  <input id="full_name" className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="headline">One-line headline</label>
                  <input id="headline" className="input" placeholder="What you're raising support for" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="story">Your story</label>
                  <textarea id="story" rows={4} className="input resize-none" placeholder="Tell supporters why this matters…" value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
                </div>
                <div>
                  <span className="label">Profile color</span>
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => setForm({ ...form, avatar_color: color })}
                        className={`h-8 w-8 rounded-full ring-offset-2 transition ${form.avatar_color === color ? 'ring-2 ring-slate-900' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Choose color ${color}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-5">
                  <label className="label" htmlFor="payout_email">Contact e-mail for payout</label>
                  <input id="payout_email" type="email" className="input" placeholder="you@example.com" value={form.payout_email} onChange={(e) => setForm({ ...form, payout_email: e.target.value })} />
                  <p className="mt-2 text-xs text-slate-500">Used by the admin only to contact you about a payout.</p>
                </div>

                {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                <button className="primary-btn w-full" disabled={busy}>
                  <Save size={16} /> {busy ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            )}
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark size={18} className="text-brand-600" />
                <h2 className="text-base font-bold">Bank details (private)</h2>
              </div>
              {payoutSaved && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} /> Saved</span>}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              These coordinates are used to send your transfer manually. They are shown only in the admin console and to you. No password is requested or stored.
            </p>
            <form onSubmit={handleSavePayout} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="account_holder">Account holder</label>
                <input id="account_holder" className="input" placeholder="Jane Miller" value={payout.account_holder} onChange={(e) => setPayout({ ...payout, account_holder: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="bank_name">Bank name</label>
                <input id="bank_name" className="input" placeholder="Chase" value={payout.bank_name} onChange={(e) => setPayout({ ...payout, bank_name: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="routing_number">Routing number (ABA)</label>
                  <input
                    id="routing_number"
                    className="input font-mono"
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="021000021"
                    value={payout.routing_number}
                    onChange={(e) => setPayout({ ...payout, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="account_number">Account number</label>
                  <input
                    id="account_number"
                    className="input font-mono"
                    inputMode="numeric"
                    maxLength={24}
                    placeholder="000123456789"
                    value={payout.account_number}
                    onChange={(e) => setPayout({ ...payout, account_number: e.target.value.replace(/[^\dA-Za-z]/g, '').slice(0, 24) })}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="account_type">Account type</label>
                <select
                  id="account_type"
                  className="input"
                  value={payout.account_type}
                  onChange={(e) => setPayout({ ...payout, account_type: e.target.value as AccountType })}
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="payout_note">Note <span className="font-normal text-slate-400">(optional)</span></label>
                <input id="payout_note" className="input" placeholder="Checking account" value={payout.note} onChange={(e) => setPayout({ ...payout, note: e.target.value })} />
              </div>
              <button type="submit" className="primary-btn w-full" disabled={payoutBusy}>
                <Save size={16} /> {payoutBusy ? 'Saving…' : 'Save bank details'}
              </button>
            </form>
          </section>
        </div>

        <section className="card h-fit p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Donation tracking</h2>
              <p className="mt-1 text-xs text-slate-500">Updates automatically while this page is open.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{donations.length} total</span>
          </div>
          {donations.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="mx-auto text-slate-200" size={36} />
              <p className="mt-3 text-sm text-slate-500">No requests yet. Share your link to get started.</p>
            </div>
          ) : (
            <ol className="mt-6 space-y-6">
              {donations.map((donation) => {
                const step = stepIndex(donation.status)
                return (
                  <li key={donation.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar name="Anonymous supporter" color="#e2e8f0" size="sm" />
                        <div>
                          <p className="text-sm font-semibold">Anonymous supporter</p>
                          <p className="text-xs text-slate-400">{timeAgo(donation.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-emerald-600">{formatMoney(donation.amount_cents)}</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(donation.status)}`}>
                          {statusLabel(donation.status)}
                        </span>
                      </div>
                    </div>
                    {donation.status === 'rejected' ? (
                      <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">This request was not approved.</p>
                    ) : (
                      <div className="relative mt-5 flex justify-between">
                        <div className="absolute left-0 right-0 top-1.5 h-0.5 bg-slate-200" />
                        <div
                          className="absolute left-0 top-1.5 h-0.5 bg-brand-600 transition-all"
                          style={{ width: `${(step / (trackingSteps.length - 1)) * 100}%` }}
                        />
                        {trackingSteps.map((label, index) => (
                          <div key={label} className="relative z-10 flex flex-col items-center" style={{ width: 70 }}>
                            <span className={`h-3 w-3 rounded-full ring-4 ring-white ${index <= step ? 'bg-brand-600' : 'bg-slate-200'}`} />
                            <span className={`mt-1.5 text-center text-[10px] font-semibold ${index <= step ? 'text-brand-700' : 'text-slate-400'}`}>
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
