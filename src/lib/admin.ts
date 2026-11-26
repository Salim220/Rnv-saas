// UI gate: exactly the e-mails listed in VITE_ADMIN_EMAILS see the admin console.
// Each admin has their own magic-link account — no shared credentials.
// Vite env vars are public in the browser bundle, so this is NOT the security
// boundary: public.is_admin() + RLS on public.admin_emails enforce access.
// Keep both lists in sync.
const configured = import.meta.env.VITE_ADMIN_EMAILS as string | undefined

export const ADMIN_EMAILS = (configured || 'ouorousalim2@gmail.com,co-admin@giveflow.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export function isAdminEmail(email: string | undefined | null): boolean {
  const clean = email?.trim().toLowerCase() ?? ''
  return ADMIN_EMAILS.includes(clean)
}
