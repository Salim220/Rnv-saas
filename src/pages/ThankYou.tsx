import { CheckCircle2, Heart, Link2 } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { formatMoney } from '../lib/format'
import type { Donation, Profile } from '../lib/types'

interface ThankYouState {
  donation?: Donation
  recipient?: Profile
}

export function ThankYou() {
  const { state } = useLocation() as { state: ThankYouState | null }
  const donation = state?.donation
  const recipient = state?.recipient

  if (!donation || !recipient) return <Navigate to="/" replace />

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
