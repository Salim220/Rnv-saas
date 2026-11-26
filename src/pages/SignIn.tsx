import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { sendMagicLink } from '../lib/data'

export function SignIn() {
  const { user } = useUser()
  const location = useLocation()
  // Set by /dashboard and /admin when they bounce a signed-out visitor here,
  // so the page can say what the link was for and send them back afterwards.
  const from = (location.state as { from?: string } | null)?.from
  const target = from === 'admin' ? '/admin' : '/dashboard'
  const targetLabel = from === 'admin' ? 'Go to admin console' : 'Go to dashboard'
  const [step, setStep] = useState<'email' | 'sent'>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSend(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await sendMagicLink(email)
      setStep('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in link.')
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <div className="mx-auto max-w-md px-5 py-24">
        <div className="card p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
          <h1 className="mt-5 text-2xl font-extrabold">You&apos;re signed in</h1>
          <p className="mt-2 text-sm text-slate-500">Signed in as {user.email}</p>
          <Link to={target} className="primary-btn mt-8 w-full">
            {targetLabel} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16 sm:py-24">
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-8 py-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
            {step === 'email' ? <Mail size={22} /> : <CheckCircle2 size={22} className="text-emerald-500" />}
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            {step === 'email' ? 'Sign in to GiveFlow' : 'Check your inbox'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === 'email'
              ? 'We’ll e-mail you a sign-in link. No password needed.'
              : `We sent a sign-in link to ${email}. Open it on this device to continue.`}
          </p>
        </div>

        <div className="p-8">
          {step === 'email' ? (
            <form onSubmit={handleSend}>
              {from && (
                <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Sign in to open the {from === 'admin' ? 'admin console' : 'dashboard'}.
                </p>
              )}
              <label className="label" htmlFor="email">E-mail address</label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="you@example.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <button className="primary-btn mt-5 w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send me a sign-in link'} <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm leading-relaxed text-slate-600">
                Click the link in the e-mail — you&apos;ll land back here and be signed in automatically.
              </p>
              {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <button
                type="button"
                onClick={() => { setStep('email'); setError('') }}
                className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft size={15} /> Use a different e-mail
              </button>
            </div>
          )}

          <div className="mt-8 flex items-start gap-2 border-t border-slate-100 pt-6 text-xs leading-relaxed text-slate-400">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            <span>Your payout details are only visible to the two administrators. No password is ever requested.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
