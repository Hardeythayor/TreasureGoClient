import { createContext, useCallback, useContext, useState } from 'react'

const FOUND_KEY = 'treasure-go:found-treasures'

function readFound() {
  try {
    const raw = localStorage.getItem(FOUND_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const TreasureStatusContext = createContext(null)

export function TreasureStatusProvider({ children }) {
  const [foundIds, setFoundIds] = useState(readFound)

  const markFound = useCallback((treasureId) => {
    setFoundIds((prev) => {
      if (prev.includes(treasureId)) return prev
      const next = [...prev, treasureId]
      localStorage.setItem(FOUND_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isFound = useCallback(
    (treasureId) => foundIds.includes(treasureId),
    [foundIds],
  )

  return (
    <TreasureStatusContext.Provider value={{ foundIds, markFound, isFound }}>
      {children}
    </TreasureStatusContext.Provider>
  )
}

export function useTreasureStatus() {
  const ctx = useContext(TreasureStatusContext)
  if (!ctx) {
    throw new Error('useTreasureStatus must be used within TreasureStatusProvider')
  }
  return ctx
}
