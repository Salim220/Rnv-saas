import { ArrowUpRight, Check, Copy, ExternalLink, Heart, Save, Wallet } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { useUser } from '../hooks/useUser'
import { getDonations, updateProfile } from '../lib/data'
import { formatMoney, pageUrl, timeAgo } from '../lib/format'
import type { Donation, PayoutMethod } from '../lib/types'

const COLORS = ['#8b7cff', '#22c55e', '#f97316', '#0ea5e9', '#ec4899', '#0f172a']

interface ProfileForm {
  full_name: string
  headline: string
  story: string
  avatar_color: string
  payout_method: PayoutMethod
  payout_email: string
}

export function Dashboard() {
  const { user, loading, refresh } = useUser()
  const [donations, setDonations] = useState<Donation[]>([])
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const initialized = useRef<string | null>(null)

  useEffect(() => {
    if (user) getDonations(user.id).then(setDonations).catch(() => setDonations([]))
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
  }, [user])

  if (loading) {
    return <div className="mx-auto max-w-6xl px-5 py-24 text-center text-sm text-slate-500">Loading…</div>
  }
  if (!user) return <Navigate to="/signin" replace />

  const completed = donations.filter((d) => d.status === 'completed')
  const total = completed.reduce((sum, d) => sum + d.amount_cents, 0)
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000
  const thisMonth = completed
    .filter((d) => new Date(d.created_at).getTime() >= thirtyDaysAgo)
    .reduce((sum, d) => sum + d.amount_cents, 0)
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

  const stats = [
    { label: 'Total raised', value: formatMoney(total), icon: Heart, accent: 'text-brand-600 bg-brand-500/10' },
    { label: 'Donations', value: String(completed.length), icon: ArrowUpRight, accent: 'text-sky-600 bg-sky-500/10' },
    { label: 'Last 30 days', value: formatMoney(thisMonth), icon: Wallet, accent: 'text-emerald-600 bg-emerald-500/10' },
    { label: 'Average gift', value: formatMoney(completed.length ? Math.round(total / completed.length) : 0), icon: Heart, accent: 'text-amber-600 bg-amber-500/10' },
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
            <p className="mt-3 text-xs text-slate-500">
             giveflow.com/u/<strong>{user.profile.handle}</strong> — share this anywhere.
            </p>
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
                  <h3 className="text-sm font-bold">Payout account</h3>
                  <p className="mt-1 text-xs text-slate-500">Your bank details go to the provider, never to GiveFlow.</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, payout_method: 'paypal' })}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${form.payout_method === 'paypal' ? 'border-brand-500 bg-brand-500/5 text-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      PayPal
                    </button>
                    <button type="button" disabled title="Requires a server-side integration" className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-400 opacity-60">
                      Dwolla (soon)
                    </button>
                  </div>
                  {form.payout_method === 'paypal' && (
                    <div className="mt-4">
                      <label className="label" htmlFor="payout_email">PayPal e-mail</label>
                      <input id="payout_email" type="email" className="input" placeholder="you@example.com" value={form.payout_email} onChange={(e) => setForm({ ...form, payout_email: e.target.value })} />
                    </div>
                  )}
                </div>

                {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                <button className="primary-btn w-full" disabled={busy}>
                  <Save size={16} /> {busy ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            )}
          </section>
        </div>

        <section className="card h-fit p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Recent donations</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{donations.length} total</span>
          </div>
          {donations.length === 0 ? (
            <div className="py-16 text-center">
              <Heart className="mx-auto text-slate-200" size={36} />
              <p className="mt-3 text-sm text-slate-500">No donations yet. Share your link to get started.</p>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-slate-100">
              {donations.slice(0, 12).map((donation) => (
                <li key={donation.id} className="flex items-start gap-3 py-4">
                  <Avatar name="Anonymous supporter" color="#e2e8f0" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Anonymous supporter</p>
                    <p className="mt-1 text-xs text-slate-400">{timeAgo(donation.created_at)}</p>
                    {donation.status !== 'completed' && (
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${donation.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                        {donation.status === 'pending' ? 'Awaiting review' : donation.status}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-emerald-600">{formatMoney(donation.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
