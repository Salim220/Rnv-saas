import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser, subscribeAuth } from '../lib/data'
import type { AuthUser } from '../lib/types'

export function useUser() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => subscribeAuth(refresh), [refresh])

  useEffect(() => {
    let alive = true
    setLoading(true)
    getCurrentUser()
      .then((current) => {
        if (alive) setUser(current)
      })
      .catch(() => {
        if (alive) setUser(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [version])

  return { user, loading, refresh }
}
