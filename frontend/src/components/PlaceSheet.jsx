import { useState, useEffect } from 'react'
import { speak } from '../utils/elevenlabs'

const API_URL = import.meta.env.VITE_API_URL ?? ''

const CATEGORY_COLORS = {
  landmark: '#f59e0b', art: '#ec4899', nature: '#10b981',
  food: '#f97316', cultural: '#a78bfa', medical: '#34d399',
  finance: '#60a5fa', safety: '#60a5fa', education: '#818cf8',
  entertainment: '#fb7185', sports: '#fbbf24', services: '#94a3b8',
  info: '#94a3b8', other: '#6b7280',
}

const CATEGORY_ICONS = {
  landmark: '◈', art: '◑', nature: '◆', food: '●',
  cultural: '◎', medical: '+', finance: '$', safety: '⬡',
  education: '▣', entertainment: '▶', sports: '◉',
  services: '◧', info: 'i', other: '·',
}


export default function PlaceSheet({ place, language, locationName, onClose, onGetDirections }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const color = CATEGORY_COLORS[place.category] || '#ffffff'
  const icon = CATEGORY_ICONS[place.category] || '·'

  useEffect(() => {
    setInfo(null)
    setLoading(true)
    fetch(`${API_URL}/api/place-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: place.name,
        category: place.category,
        type_label: place.type_label,
        lat: place.lat,
        lng: place.lng,
        location_context: locationName || '',
        language: language || 'en',
        tags: place.tags || {},
      }),
    })
      .then(r => r.json())
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false))
  }, [place.id, language])

  const handleSpeak = () => {
    if (!info) return
    const text = [
      place.name,
      info.description,
      info.history,
      info.visitor_info,
      info.local_tip && `Local tip: ${info.local_tip}`,
    ].filter(Boolean).join('. ')
    setSpeaking(true)
    speak(text)
    setTimeout(() => setSpeaking(false), Math.max(4000, text.length * 65))
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
      style={{ background: '#0d0e17', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)', zIndex: 1050 }}
    >
      {/* Color top bar */}
      <div className="h-0.5 w-full" style={{ background: color }} />

      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-white/10" />
      </div>

      <div className="px-5 pb-8 max-h-[75vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${color}20` }}
          >
            <span className="text-base font-bold" style={{ color }}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color }}>{place.type_label}</span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/40 text-xs">{place.distance_label}</span>
            </div>
            <h2 className="text-white text-lg font-semibold leading-tight">{place.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSpeak}
              disabled={speaking || !info}
              className="w-9 h-9 rounded-full flex items-center justify-center border transition-all disabled:opacity-30"
              style={{
                borderColor: speaking ? color : 'rgba(255,255,255,0.12)',
                background: speaking ? `${color}15` : 'transparent',
                color: speaking ? color : 'rgba(255,255,255,0.4)',
              }}
            >
              {speaking
                ? <div className="w-2 h-2 rounded-full animate-ping" style={{ background: color }} />
                : <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
              }
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 text-white/40 hover:text-white/70 transition-all"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Directions button */}
        <button
          onClick={() => onGetDirections && onGetDirections(place)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 mb-4 text-sm font-semibold transition-all active:scale-95"
          style={{ background: '#6366f1', color: 'white', boxShadow: '0 2px 16px rgba(99,102,241,0.4)' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 12h18M13 6l6 6-6 6" />
          </svg>
          Get Directions
        </button>

        {/* Quick meta tags */}
        {place.tags?.opening_hours && (
          <div className="flex items-center gap-2 mb-4 text-sm text-white/50">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <span>{place.tags.opening_hours}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            {[80, 95, 60, 75].map((w, i) => (
              <div key={i} className="h-3 rounded-full bg-white/5" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {/* Content */}
        {info && (
          <div className="space-y-4">
            {info.description && (
              <p className="text-white/80 text-sm leading-relaxed">{info.description}</p>
            )}

            {info.history && (
              <div className="rounded-2xl p-3.5" style={{ background: `${color}0d`, border: `1px solid ${color}20` }}>
                <div className="text-[10px] uppercase tracking-wider mb-1.5 font-medium" style={{ color: `${color}99` }}>History</div>
                <p className="text-white/65 text-sm leading-relaxed">{info.history}</p>
              </div>
            )}

            {info.visitor_info && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-medium">Visitor Info</div>
                <p className="text-white/65 text-sm leading-relaxed">{info.visitor_info}</p>
              </div>
            )}

            {info.cultural_notes && (
              <div className="rounded-2xl p-3.5 bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-medium">Cultural Notes</div>
                <p className="text-white/65 text-sm leading-relaxed">{info.cultural_notes}</p>
              </div>
            )}

            {info.local_tip && (
              <div className="rounded-2xl p-3.5" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
                <div className="text-[10px] uppercase tracking-wider mb-1.5 font-medium" style={{ color: `${color}80` }}>Local Tip</div>
                <p className="text-sm leading-relaxed" style={{ color: `${color}cc` }}>{info.local_tip}</p>
              </div>
            )}

            {info.interesting_fact && (
              <div className="rounded-2xl p-3.5 bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-medium">Did You Know</div>
                <p className="text-white/55 text-sm leading-relaxed italic">{info.interesting_fact}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
