import { CheckCircle2, Heart, Link2, MailQuestion } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { formatMoney } from '../lib/format'
import type { Donation, PublicProfile } from '../lib/types'

interface ThankYouState {
  donation?: Donation
  recipient?: PublicProfile
}

// A confirmation is attached to the navigation, so a reload would lose it and
// bounce the visitor back home. Keeping the last one for the tab makes
// #/thank-you a real page: it survives refresh and can be reopened.
const STORAGE_KEY = 'giveflow:last-request'

function readSaved(): ThankYouState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ThankYouState) : null
  } catch {
    return null
  }
}

export function ThankYou() {
  const { state } = useLocation() as { state: ThankYouState | null }
  const [saved] = useState<ThankYouState | null>(readSaved)

  const confirmed: { donation: Donation; recipient: PublicProfile } | null =
    state?.donation && state?.recipient
      ? { donation: state.donation, recipient: state.recipient }
      : saved?.donation && saved?.recipient
        ? { donation: saved.donation, recipient: saved.recipient }
        : null

  useEffect(() => {
    if (!state?.donation || !state?.recipient) return
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ donation: state.donation, recipient: state.recipient }),
      )
    } catch {
      // Private mode or full storage: the confirmation still shows from state.
    }
  }, [state])

  if (!confirmed) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20">
        <div className="card p-9 text-center">
          <MailQuestion className="mx-auto text-slate-300" size={52} />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight">No support request to confirm</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            This page shows the confirmation right after a request is sent. Open the page of the
            person you want to support to create one.
          </p>
          <Link to="/" className="primary-btn mt-8">
            <Heart size={16} /> Explore GiveFlow
          </Link>
        </div>
      </div>
    )
  }

  const { donation, recipient } = confirmed

  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <div className="card p-9 text-center">
        <CheckCircle2 className="mx-auto text-emerald-500" size={56} />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Thank you!</h1>
        <p className="mt-3 text-slate-600">
          Your support request of <strong>{formatMoney(donation.amount_cents)}</strong> for <strong>{recipient.full_name}</strong> has been recorded and is awaiting admin review.
        </p>
        <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800">
          No payment was taken on this site. The administrator will review the request and send the transfer manually; the recipient follows each step in their dashboard.
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to={`/u/${recipient.handle}`} className="ghost-btn">
            <Link2 size={16} /> Back to the page
          </Link>
          <Link to="/" className="primary-btn">
            <Heart size={16} /> Explore GiveFlow
          </Link>
        </div>
      </div>
    </div>
  )
}
