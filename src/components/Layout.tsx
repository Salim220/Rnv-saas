import { ArrowRight, Heart, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { isAdminEmail } from '../lib/admin'
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
            {user ? (
              <>
                <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-ink-950 sm:text-sm">
                  <LayoutDashboard size={16} /> <span className="hidden sm:inline">Dashboard</span>
                </Link>
                {isAdminEmail(user.email) && (
                  <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 sm:text-sm">
                    <ShieldCheck size={16} /> <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}
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
            <span>— support requests, reviewed and paid out manually.</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} />
            Bank details are private to their owner and the two administrators.
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-slate-100 px-5 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GiveFlow. Support requests are reviewed and paid out manually.</p>
          <nav className="flex items-center gap-5 font-semibold" aria-label="Legal">
            <Link to="/terms" className="hover:text-ink-950">Terms of use</Link>
            <Link to="/privacy" className="hover:text-ink-950">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
