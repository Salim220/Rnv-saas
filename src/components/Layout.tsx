import { ArrowRight, Heart, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { isSupabaseConfigured } from '../lib/supabase'
import { signOut } from '../lib/data'
import { Avatar } from './Avatar'

export function Layout() {
  const { user, refresh } = useUser()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    refresh()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-950 text-brand-500">
              <Heart size={19} fill="currentColor" />
            </span>
            <span className="text-lg">GiveFlow</span>
          </Link>

          <div className="flex items-center gap-3">
            {!isSupabaseConfigured && (
              <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 sm:inline">
                Demo mode
              </span>
            )}
            {user ? (
              <>
                <Link to="/dashboard" className="hidden items-center gap-2 text-sm font-semibold text-slate-700 hover:text-ink-950 sm:inline-flex">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <Avatar name={user.profile.full_name || user.email} color={user.profile.avatar_color} size="sm" />
                <button onClick={handleSignOut} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Sign out">
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Link to="/signin" className="primary-btn !px-4 !py-2">
                Get started <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Heart size={15} className="text-brand-500" fill="currentColor" />
            <span className="font-semibold text-slate-700">GiveFlow</span>
            <span>— a prototype, not a payment processor.</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} />
            Bank details are collected by PayPal, never stored here.
          </div>
        </div>
      </footer>
    </div>
  )
}
