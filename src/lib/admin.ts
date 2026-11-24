// Prototype gate: the admin is the account whose e-mail matches VITE_ADMIN_EMAIL.
// Vite env vars are public in the browser bundle — this is NOT a security
// boundary. A production admin needs server-side auth and RLS policies.
const configured = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase()

export const ADMIN_EMAIL = configured || 'admin@giveflow.local'

export function isAdminEmail(email: string | undefined | null): boolean {
  return Boolean(email) && email!.trim().toLowerCase() === ADMIN_EMAIL
}
