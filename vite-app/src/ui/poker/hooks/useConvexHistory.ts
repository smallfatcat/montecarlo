import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'

export function useConvexIdentity() {
  const [token, setToken] = useState<string | null>(null)
  const [name, setName] = useState<string>('')
  useEffect(() => {
    try {
      setToken(sessionStorage.getItem('playerToken'))
      const n = sessionStorage.getItem('playerName') || ''
      if (n) setName(n)
    } catch {}
  }, [])
  const createGuest = useMutation(api.users.createOrGetGuest)
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    if (!token) return
    const displayName = name && name.trim().length > 0 ? name.trim() : `Player-${Math.floor(Math.random()*1000)}`
    createGuest({ displayName, externalSubject: token }).then((id: string) => setUserId(id)).catch(() => {})
  }, [token, name, createGuest])
  return { token, name, userId }
}

export function useMyRecentHands(numItems: number = 10) {
  const { userId } = useConvexIdentity()
  const result = useQuery(api.history.listMyHands as any, userId ? { userId, paginationOpts: { numItems, cursor: null } } : 'skip') as any
  const hands = useMemo(() => (result && typeof result === 'object' && 'page' in result ? (result.page as any[]) : []), [result])
  return { hands }
}


