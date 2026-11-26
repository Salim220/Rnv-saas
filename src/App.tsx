import { useEffect } from 'react'
import { HashRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useUser } from './hooks/useUser'
import { isAuthCallback, isSupabaseConfigured } from './lib/supabase'
import { Admin } from './pages/Admin'
import { Dashboard } from './pages/Dashboard'
import { DonatePage } from './pages/DonatePage'
import { Landing } from './pages/Landing'
import { SignIn } from './pages/SignIn'
import { ThankYou } from './pages/ThankYou'

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-6xl font-black text-slate-200">404</p>
      <h1 className="mt-4 text-2xl font-bold">This page doesn't exist</h1>
      <p className="mt-2 text-slate-500">Check the link, or head back to the homepage.</p>
      <Link to="/" className="primary-btn mt-8">Back to GiveFlow</Link>
    </div>
  )
}

function MagicLinkRedirect() {
  const { user } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    // Only redirect pages opened from a sign-in link. A signed-in visitor
    // browsing back to the landing page stays where they are.
    if (!user || !isAuthCallback) return
    navigate('/dashboard', { replace: true })
  }, [user, navigate])

  return null
}

function SetupRequired() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <div className="card p-8 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Configuration required</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">GiveFlow is not connected yet.</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          This is the final build: a Supabase project is required for e-mail sign-in,
          donation storage and the admin console.
        </p>
        <ol className="mt-7 space-y-4 text-sm text-slate-600">
          <li><strong>1.</strong> Create a project on supabase.com and run <code className="rounded bg-slate-100 px-1.5 py-0.5">supabase/schema.sql</code> in its SQL editor.</li>
          <li><strong>2.</strong> Enable the Email provider. Supabase sends a sign-in link — no custom e-mail template is needed.</li>
          <li><strong>3.</strong> Add <code className="rounded bg-slate-100 px-1.5 py-0.5">VITE_SUPABASE_URL</code>, <code className="rounded bg-slate-100 px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code> and <code className="rounded bg-slate-100 px-1.5 py-0.5">VITE_ADMIN_EMAILS</code> to the GitHub Actions secrets, then re-run the deploy workflow.</li>
        </ol>
        <p className="mt-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          Until those secrets are set, links and sign-in cannot work. See README.md for the full procedure.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupRequired />

  return (
    <HashRouter>
      <MagicLinkRedirect />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/u/:handle" element={<DonatePage />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
