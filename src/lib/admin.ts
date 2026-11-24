// Prototype gate: exactly the e-mails listed in VITE_ADMIN_EMAILS are admins.
// Each admin has their own OTP account — no shared credentials.
// Vite env vars are public in the browser bundle — this is NOT a security
// boundary. A production admin needs server-side auth and RLS policies.
const configured = import.meta.env.VITE_ADMIN_EMAILS as string | undefined

export const ADMIN_EMAILS = (configured || 'ouorousalim2@gmail.com,co-admin@giveflow.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export function isAdminEmail(email: string | undefined | null): boolean {
  const clean = email?.trim().toLowerCase() ?? ''
  return ADMIN_EMAILS.includes(clean)
}
