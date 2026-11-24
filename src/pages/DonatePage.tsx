import { ArrowLeft, Heart, LockKeyhole, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { createDonation, getProfileByHandle } from '../lib/data'
import { formatMoney } from '../lib/format'
import type { Profile } from '../lib/types'

const PRESETS = [1000, 2500, 5000, 10000]

export function DonatePage() {
  const { handle = '' } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [amountCents, setAmountCents] = useState<number | 'custom'>(2500)
  const [customAmount, setCustomAmount] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    getProfileByHandle(handle)
      .then((found) => { if (alive) setProfile(found) })
      .catch(() => { if (alive) setProfile(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [handle])

  const effectiveCents = amountCents === 'custom'
    ? Math.round(Number(customAmount || 0) * 100)
    : amountCents

  function openConfirm(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!Number.isFinite(effectiveCents) || effectiveCents < 100 || effectiveCents > 1_000_000) {
      setError('Choose an amount between $1 and $10,000.')
      return
    }
    setConfirmOpen(true)
  }

  async function confirmRequest() {
    if (!profile) return
    setBusy(true)
    setError('')
    try {
      const donation = await createDonation({
        recipient_id: profile.id,
        amount_cents: effectiveCents,
        provider: 'manual',
      })
      navigate('/thank-you', { state: { donation, recipient: profile } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the donation.')
      setConfirmOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-5 py-24 text-center text-sm text-slate-500">Loading page…</div>
  }
  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-3xl font-extrabold">This page isn't available</h1>
        <p className="mt-3 text-slate-500">Check the link, or discover another supporter page.</p>
        <Link to="/u/jane" className="primary-btn mt-8">See an example page</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Back to GiveFlow
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_.85fr] lg:items-start">
        <section className="card overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-ink-950 via-slate-800 to-brand-600" />
          <div className="px-7 pb-8">
            <div className="-mt-10">
              <Avatar name={profile.full_name} color={profile.avatar_color} size="xl" />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{profile.full_name}</h1>
            {profile.headline && <p className="mt-1 text-sm font-medium text-brand-600">{profile.headline}</p>}
            {profile.story && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{profile.story}</p>}
            <div className="mt-7 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
              <ShieldCheck size={16} /> 100% of your support goes to {profile.full_name.split(' ')[0]}.
            </div>
          </div>
        </section>

        <section className="card p-7">
          <h2 className="text-xl font-extrabold">Send support</h2>
          <p className="mt-1 text-sm text-slate-500">Pick an amount. No account and no personal details needed.</p>

          <form onSubmit={openConfirm} className="mt-6 space-y-5">
            <div>
              <span className="label">Amount</span>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((cents) => (
                  <button
                    type="button"
                    key={cents}
                    onClick={() => setAmountCents(cents)}
                    className={`rounded-xl border py-2.5 text-sm font-bold transition ${amountCents === cents ? 'border-brand-500 bg-brand-500/5 text-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {formatMoney(cents)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAmountCents('custom')}
                className={`mt-2 w-full rounded-xl border py-2.5 text-sm font-semibold transition ${amountCents === 'custom' ? 'border-brand-500 bg-brand-500/5 text-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Other amount
              </button>
              {amountCents === 'custom' && (
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400">$</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    autoFocus
                    className="input pl-8"
                    placeholder="25"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
              Your support is anonymous: no name, e-mail or bank details are collected.
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-500/5 px-4 py-3 text-xs leading-relaxed text-slate-600">
              <p className="font-bold text-brand-700">How this works</p>
              <p className="mt-1">
                No online payment is taken here. Your request is reviewed by an admin, then the
                recipient is paid out manually and can follow every step in their dashboard.
              </p>
            </div>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <button className="primary-btn w-full">
              Send support request · {formatMoney(effectiveCents || 0)}
            </button>
            <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-400">
              <LockKeyhole size={13} /> Prototype — no card is charged and no bank detail is requested here.
            </p>
          </form>
        </section>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-5 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white"><Heart size={20} fill="currentColor" /></div>
              <button onClick={() => setConfirmOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <h3 className="mt-5 text-xl font-extrabold">Confirm support request</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Nothing is charged. The request will appear in the recipient's tracking and in the admin console for review.
            </p>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Support for {profile.full_name.split(' ')[0]}</span>
              <span className="text-lg font-extrabold">{formatMoney(effectiveCents)}</span>
            </div>
            <button className="primary-btn mt-5 w-full disabled:opacity-50" onClick={confirmRequest} disabled={busy}>
              {busy ? 'Sending…' : `Send ${formatMoney(effectiveCents)} request`}
            </button>
            <button onClick={() => setConfirmOpen(false)} className="mt-3 w-full text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
