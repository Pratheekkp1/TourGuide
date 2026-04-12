import { useEffect, useRef, useState } from 'react'

const ELEVEN_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY

export default function GuidanceCard({ guidance, isLoadingGuidance }) {
  const [displayed, setDisplayed] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const indexRef = useRef(0)
  const audioRef = useRef(null)

  // Auto-expand when new guidance arrives
  useEffect(() => {
    if (guidance) setMinimized(false)
  }, [guidance])

  useEffect(() => {
    if (!guidance) return
    setDisplayed('')
    indexRef.current = 0
    const interval = setInterval(() => {
      if (indexRef.current < guidance.length) {
        setDisplayed(guidance.slice(0, indexRef.current + 1))
        indexRef.current++
      } else {
        clearInterval(interval)
      }
    }, 16)
    return () => clearInterval(interval)
  }, [guidance])

  const speak = async () => {
    if (!ELEVEN_KEY || !guidance) return
    if (audioRef.current) {
      audioRef.current.pause()
      URL.revokeObjectURL(audioRef.current.src)
    }
    setIsPlaying(true)
    try {
      const res = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVEN_KEY },
          body: JSON.stringify({
            text: guidance,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.45, similarity_boost: 0.75 },
          }),
        }
      )
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
      audio.play()
    } catch (err) {
      console.error('ElevenLabs error:', err)
      setIsPlaying(false)
    }
  }

  if (!guidance && !isLoadingGuidance) return null

  return (
    <div className="absolute bottom-8 left-3 right-3 z-20 sm:left-auto sm:right-3 sm:w-[340px]">
      <div
        className="relative bg-black/92 border border-green-500/35 backdrop-blur-md"
        style={{ boxShadow: '0 0 24px rgba(0,255,70,0.07), inset 0 0 30px rgba(0,0,0,0.3)' }}
      >
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-400/60" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-400/60" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-400/60" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-400/60" />

        {/* Header — always visible, tap to collapse */}
        <button
          onClick={() => setMinimized((m) => !m)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <div className={`w-1 h-1 rounded-full ${isLoadingGuidance ? 'bg-yellow-400 animate-pulse' : 'bg-green-400 animate-pulse'}`} />
            <span className="text-green-500/60 text-[8px] uppercase tracking-[0.25em] font-semibold">
              Navigation Uplink
            </span>
            {isLoadingGuidance && (
              <span className="text-yellow-500/50 text-[8px] uppercase tracking-widest">— processing</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ELEVEN_KEY && guidance && !minimized && (
              <button
                onClick={(e) => { e.stopPropagation(); speak() }}
                disabled={isPlaying}
                className="flex items-center gap-1 text-[8px] uppercase tracking-wider border border-green-500/25 px-1.5 py-0.5 text-green-400/50 hover:text-green-400 hover:border-green-400/50 transition-all disabled:opacity-20"
              >
                {isPlaying ? <><span className="w-1 h-1 rounded-full bg-green-400 animate-ping inline-block" /> live</> : '▶ speak'}
              </button>
            )}
            <span className="text-green-500/30 text-[10px] leading-none">{minimized ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Body */}
        {!minimized && (
          <div className="px-4 pb-3 border-t border-green-500/15">
            {isLoadingGuidance && !guidance ? (
              <div className="flex items-center gap-2 py-2">
                <span className="text-green-500/30 text-[8px] uppercase tracking-widest">Uplink active</span>
                <div className="flex gap-1">
                  {[0, 120, 240].map((d) => (
                    <div key={d} className="w-1 h-1 rounded-full bg-green-400/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-green-100 text-[13px] leading-relaxed tracking-wide pt-2.5">
                {displayed}
                <span className="animate-pulse text-green-400">▋</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
