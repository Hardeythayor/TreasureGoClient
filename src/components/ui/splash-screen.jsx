import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

function SplashScreen({ onFinish, duration = 2200 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Mounted at opacity-0/scale-95, then flipped to visible on the next
    // frame so the transition actually animates instead of snapping in.
    const raf = requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => onFinish?.(), duration)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [duration, onFinish])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep">
      <img
        src="/assets/splash_green.png"
        alt="Treasure Go"
        className={cn(
          'w-full max-w-xs transition-all duration-700 ease-out',
          visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0',
        )}
      />
    </div>
  )
}

export default SplashScreen
