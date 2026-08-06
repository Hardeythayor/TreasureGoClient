import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { treasures } from '@/data/treasures'
import { Button } from '@/components/ui/button'

const CONFETTI_COLORS = ['#e8c25e', '#f0a79e', '#8aa1c2', '#61c454', '#c9982f', '#ffffff']

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

function generateConfetti(count = 70) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: randomBetween(0, 100),
    width: randomBetween(6, 11),
    height: randomBetween(10, 18),
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    duration: randomBetween(2.6, 4.8),
    delay: randomBetween(0, 4),
    rotate: randomBetween(0, 360),
    round: Math.random() > 0.6,
  }))
}

function CelebrationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const treasure = treasures.find((t) => t.id === id)
  const [confetti] = useState(generateConfetti)

  return (
    <div
      className="relative flex h-screen flex-col items-center justify-center overflow-hidden text-center text-white"
      style={{
        background:
          'radial-gradient(circle at 50% 40%, #1b2f52 0%, #0b1b33 70%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c) => (
          <span
            key={c.id}
            className={`absolute top-0 block ${c.round ? 'rounded-full' : 'rounded-sm'}`}
            style={{
              left: `${c.left}%`,
              width: c.width,
              height: c.round ? c.width : c.height,
              backgroundColor: c.color,
              transform: `rotate(${c.rotate}deg)`,
              animation: `confetti-fall ${c.duration}s linear ${c.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <span
        className="absolute size-40 rounded-full bg-gold-light/40 blur-2xl"
        style={{ animation: 'celebrate-flash 1.1s ease-out forwards' }}
      />

      <h1
        className="bg-linear-to-br from-white to-gold-light bg-clip-text font-heading text-4xl font-bold tracking-wide text-transparent opacity-0"
        style={{
          animation: 'celebrate-pop-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards',
        }}
      >
        CONGRATULATIONS!
      </h1>
      <p
        className="mt-2 text-sm text-white/85 opacity-0"
        style={{ animation: 'celebrate-fade-up 0.5s ease-out 0.55s forwards' }}
      >
        You found {treasure?.name ?? 'the treasure'} 🎉
      </p>

      <Button
        className="mt-8 opacity-0"
        style={{ animation: 'celebrate-fade-up 0.5s ease-out 0.8s forwards' }}
        onClick={() => navigate(`/hunt/${id}/reward`)}
      >
        Continue
      </Button>
    </div>
  )
}

export default CelebrationPage
