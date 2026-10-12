import { useState, useRef, useCallback } from 'react'
import { speak } from '../utils/elevenlabs'

const API_URL = import.meta.env.VITE_API_URL ?? ''

const CATEGORY_COLORS = {
  landmark: 'text-yellow-300',
  food: 'text-orange-300',
  custom: 'text-purple-300',
  sign: 'text-blue-300',
  building: 'text-green-300',
  nature: 'text-emerald-300',
  artwork: 'text-pink-300',
  person: 'text-cyan-300',
  object: 'text-gray-300',
  other: 'text-white',
}

const CATEGORY_ICONS = {
  landmark: '◈',
  food: '◉',
  custom: '◎',
  sign: '◧',
  building: '▣',
  nature: '◐',
  artwork: '◑',
  person: '◯',
  object: '◻',
  other: '◆',
}


function TapRipple({ x, y }) {
  return (
    <div
      className="absolute pointer-events-none z-30 animate-ping"
      style={{
        left: x - 20,
        top: y - 20,
        width: 40,
        height: 40,
        border: '2px solid rgba(255,255,100,0.8)',
        borderRadius: '50%',
      }}
    />
  )
}

function IdentifyModal({ result, onClose, language }) {
  const [speaking, setSpeaking] = useState(false)

  const fullText = [
    result.name,
    result.description,
    result.local_context,
    result.visitor_tip ? `Tip: ${result.visitor_tip}` : '',
  ].filter(Boolean).join('. ')

  const handleSpeak = () => {
    setSpeaking(true)
    speak(fullText)
    // Estimate duration and reset
    const duration = Math.max(3000, fullText.length * 60)
    setTimeout(() => setSpeaking(false), duration)
  }

  const catColor = CATEGORY_COLORS[result.category] || 'text-white'
  const catIcon = CATEGORY_ICONS[result.category] || '◆'

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center pb-8 px-3"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative w-full max-w-md bg-black/95 border border-yellow-500/40 backdrop-blur-md"
        style={{ boxShadow: '0 0 30px rgba(255,220,0,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-yellow-400/70" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-yellow-400/70" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-yellow-400/70" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-yellow-400/70" />

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-yellow-500/15">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs ${catColor}`}>{catIcon}</span>
              <span className="text-yellow-500/50 text-[8px] uppercase tracking-[0.2em]">
                {result.category}
              </span>
              {result.confidence === 'low' && (
                <span className="text-orange-500/50 text-[8px] uppercase tracking-widest">· low confidence</span>
              )}
            </div>
            <h2 className={`text-base font-bold leading-tight ${catColor}`}>{result.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={handleSpeak}
              disabled={speaking}
              className="flex items-center gap-1 border border-yellow-500/30 px-2 py-1 text-[8px] uppercase tracking-wider text-yellow-400/60 hover:text-yellow-400 hover:border-yellow-400/60 transition-all disabled:opacity-30"
            >
              {speaking ? (
                <><span className="w-1 h-1 rounded-full bg-yellow-400 animate-ping inline-block" /> speaking</>
              ) : '▶ hear'}
            </button>
            <button onClick={onClose} className="text-white/30 hover:text-white/70 text-sm leading-none px-1">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          <p className="text-white/85 text-[13px] leading-relaxed">{result.description}</p>

          {result.local_context && (
            <div className="border-l-2 border-yellow-500/30 pl-3">
              <p className="text-yellow-200/70 text-[12px] leading-relaxed">{result.local_context}</p>
            </div>
          )}

          {result.visitor_tip && (
            <div className="bg-yellow-900/10 border border-yellow-500/20 px-3 py-2">
              <div className="text-yellow-500/50 text-[8px] uppercase tracking-widest mb-1">Tip for visitors</div>
              <p className="text-yellow-100/80 text-[12px] leading-relaxed">{result.visitor_tip}</p>
            </div>
          )}
        </div>

        <div className="px-4 pb-2.5 text-[8px] text-white/20 uppercase tracking-widest">
          Tap anywhere to dismiss
        </div>
      </div>
    </div>
  )
}

export default function TapIdentify({ captureRef, coords, locationName, language }) {
  const [ripple, setRipple] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const loadingPos = useRef(null)

  const handleTap = useCallback(async (e) => {
    if (result) return // modal open — let it handle dismiss

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setRipple({ x, y })
    loadingPos.current = { x, y }

    setTimeout(() => setRipple(null), 700)

    if (!captureRef.current) return
    setLoading(true)

    try {
      const blob = await captureRef.current()
      if (!blob) return

      const formData = new FormData()
      formData.append('file', blob, 'tap.jpg')
      if (coords) {
        formData.append('lat', coords.lat)
        formData.append('lng', coords.lng)
      }
      formData.append('location_name', locationName || '')
      formData.append('language', language || 'en')

      const res = await fetch(`${API_URL}/api/identify`, { method: 'POST', body: formData })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      console.error('Identify error:', err)
    } finally {
      setLoading(false)
    }
  }, [captureRef, coords, locationName, language, result])

  return (
    <>
      {/* Invisible tap layer over camera */}
      <div
        className="absolute inset-0 z-25 cursor-crosshair"
        style={{ zIndex: 25 }}
        onClick={handleTap}
      />

      {/* Tap ripple */}
      {ripple && <TapRipple x={ripple.x} y={ripple.y} />}

      {/* Loading indicator at tap position */}
      {loading && loadingPos.current && (
        <div
          className="absolute z-30 pointer-events-none flex items-center gap-1.5 bg-black/70 border border-yellow-500/40 px-2 py-1"
          style={{
            left: Math.min(loadingPos.current.x + 12, window.innerWidth - 130),
            top: Math.min(loadingPos.current.y + 12, window.innerHeight - 40),
          }}
        >
          <div className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '120ms' }} />
          <div className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '240ms' }} />
          <span className="text-yellow-400/70 text-[8px] uppercase tracking-widest">Identifying</span>
        </div>
      )}

      {/* Tap hint — shown briefly on first load */}
      {!result && !loading && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 px-3 py-1.5 text-white/30 text-[8px] uppercase tracking-widest whitespace-nowrap">
            <span>◎</span>
            <span>Tap anything to identify it</span>
          </div>
        </div>
      )}

      {/* Result modal */}
      {result && (
        <IdentifyModal
          result={result}
          language={language}
          onClose={() => setResult(null)}
        />
      )}
    </>
  )
}
