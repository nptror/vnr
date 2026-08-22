import { useState, useEffect, useCallback } from 'react'

const MEME_LIFETIME = 3500 // 3.5 giây rồi fade out

/**
 * Hook để quản lý lifecycle của meme drops.
 * Tự xóa meme sau MEME_LIFETIME.
 */
export function useMemeDrop() {
  const [activeMemes, setActiveMemes] = useState([])

  const addMeme = useCallback((memeData) => {
    const item = {
      ...memeData,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    }
    setActiveMemes(prev => [...prev, item])
  }, [])

  // Cleanup meme quá hạn
  useEffect(() => {
    if (activeMemes.length === 0) return
    const timer = setInterval(() => {
      const now = Date.now()
      setActiveMemes(prev => prev.filter(m => now - m.createdAt < MEME_LIFETIME))
    }, 500)
    return () => clearInterval(timer)
  }, [activeMemes.length])

  return { activeMemes, addMeme }
}
