import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
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
      <a className="primary-btn mt-8" href="#/">Back to GiveFlow</a>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
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
