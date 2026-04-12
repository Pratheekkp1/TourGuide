import { useEffect, useState } from 'react'

const LINES = [
  'TourGuide v1.0 — Intelligent Travel Assistant',
  'Loading vision encoder [CLIP ViT-B/32]...',
  'Loading scene classifier [25 labels]...',
  'Loading landmark detector [HOG + Haar]...',
  'Connecting to AI guidance [Gemini]...',
  'All systems ready. Welcome to TourGuide.',
]

export default function BootSequence({ onDone }) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleLines(i)
      if (i >= LINES.length) {
        clearInterval(interval)
        setTimeout(() => {
          setDone(true)
          onDone()
        }, 600)
      }
    }, 280)
    return () => clearInterval(interval)
  }, [onDone])

  return (
    <div
      className={`absolute inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-700 ${done ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="w-full max-w-md px-8">
        <div className="text-green-400 text-xs font-mono space-y-1.5">
          {LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} className={`flex items-start gap-2 ${i === visibleLines - 1 ? 'text-green-300' : 'text-green-600'}`}>
              <span className="text-green-500/50 mt-px select-none">{'>'}</span>
              <span>{line}</span>
              {i === visibleLines - 1 && (
                <span className="animate-pulse text-green-400">▋</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 h-px bg-green-900/40">
          <div
            className="h-full bg-green-500/60 transition-all duration-300"
            style={{ width: `${(visibleLines / LINES.length) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[8px] uppercase tracking-widest text-green-600">
          <span>Initializing</span>
          <span className="tabular-nums">{Math.round((visibleLines / LINES.length) * 100)}%</span>
        </div>
      </div>
    </div>
  )
}
