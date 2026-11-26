import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// Read before supabase-js consumes the sign-in token, so the app knows this
// page load came back from a magic link and can forward the user to the
// dashboard once the session is restored.
export const isAuthCallback =
  typeof window !== 'undefined' &&
  /(?:^|[?&#])(code|token_hash|access_token|error_description)=/.test(
    window.location.search + window.location.hash,
  )

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Magic-link tokens arrive in the query string (token_hash), not in
          // the URL fragment, so they don't collide with HashRouter.
          flowType: 'pkce',
        },
      })
    : null
