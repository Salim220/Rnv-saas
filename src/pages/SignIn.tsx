import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { sendOtp, verifyOtp } from '../lib/data'
import { isSupabaseConfigured } from '../lib/supabase'

export function SignIn() {
  const { user, refresh } = useUser()
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState<string | undefined>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSend(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await sendOtp(email)
      setDemoCode(result.demoCode)
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.')
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await verifyOtp(email, code)
      refresh()
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code.')
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <div className="mx-auto max-w-md px-5 py-24">
        <div className="card p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
          <h1 className="mt-5 text-2xl font-extrabold">You're signed in</h1>
          <p className="mt-2 text-sm text-slate-500">Signed in as {user.email}</p>
          <Link to="/dashboard" className="primary-btn mt-8 w-full">
            Go to dashboard <ArrowRight size={16} />
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
            <Mail size={22} />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            {step === 'email' ? 'Sign in to GiveFlow' : 'Check your inbox'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === 'email'
              ? 'We’ll e-mail you a one-time code. No password needed.'
              : `Enter the 6-digit code sent to ${email}.`}
          </p>
        </div>

        <div className="p-8">
          {!isSupabaseConfigured && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              <strong>Demo mode:</strong> no e-mail is sent. {step === 'code' ? 'Your code is below.' : 'The code will appear on the next screen.'}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSend}>
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
              <button className="primary-btn mt-5 w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send me a code'} <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              {demoCode && (
                <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-brand-500/30 bg-brand-500/5 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-brand-600">Demo code</p>
                    <p className="font-mono text-xl font-bold tracking-[0.3em] text-ink-950">{demoCode}</p>
                  </div>
                  <button type="button" onClick={() => setCode(demoCode)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-600 shadow-sm">
                    Use it
                  </button>
                </div>
              )}

              <label className="label" htmlFor="code">6-digit code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="000000"
                className="input text-center font-mono text-2xl tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />

              {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

              <button className="primary-btn mt-5 w-full" disabled={busy || code.length !== 6}>
                {busy ? 'Verifying…' : 'Verify and continue'} <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); setDemoCode(undefined) }} className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800">
                <ArrowLeft size={15} /> Use a different e-mail
              </button>
            </form>
          )}

          {step === 'email' && error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="mt-8 flex items-start gap-2 border-t border-slate-100 pt-6 text-xs leading-relaxed text-slate-400">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            <span>We never ask for your bank details. Payout accounts are connected through the payment provider.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
