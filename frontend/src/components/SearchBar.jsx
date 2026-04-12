import { useState, useEffect, useRef, useCallback } from 'react'
import { useLang, t } from '../i18n'

export default function SearchBar({ coords, onSelectDestination, onCameraClick }) {
  const lang = useLang()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const inputRef              = useRef(null)
  const containerRef          = useRef(null)
  const autocompleteRef       = useRef(null)
  const debounceRef           = useRef(null)

  // Init Places AutocompleteService
  useEffect(() => {
    if (window.google?.maps?.places) {
      autocompleteRef.current = new window.google.maps.places.AutocompleteService()
    }
  }, [])

  const search = useCallback((q) => {
    if (!q || q.trim().length < 2) { setResults([]); setOpen(false); return }
    if (!autocompleteRef.current) return
    setLoading(true)
    const request = { input: q }
    if (coords) {
      request.location = new window.google.maps.LatLng(coords.lat, coords.lng)
      request.radius = 50000
    }
    autocompleteRef.current.getPlacePredictions(request, (predictions, status) => {
      setLoading(false)
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setResults(predictions)
        setOpen(true)
      } else {
        setResults([])
        setOpen(false)
      }
    })
  }, [coords])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (prediction) => {
    setQuery(prediction.structured_formatting?.main_text || prediction.description)
    setOpen(false)
    inputRef.current?.blur()

    // Geocode the place_id to get lat/lng
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location
        onSelectDestination({
          name: prediction.structured_formatting?.main_text || prediction.description,
          lat: loc.lat(),
          lng: loc.lng(),
          placeId: prediction.place_id,
        })
      }
    })
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      className="absolute left-0 right-0 px-3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', zIndex: 1100 }}
    >
      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div
          className="mb-2 rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(9,10,18,0.98)',
            backdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
          }}
        >
          {results.map((r, i) => (
            <button
              key={r.place_id}
              onMouseDown={() => handleSelect(r)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
              style={{ borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">
                  {r.structured_formatting?.main_text || r.description}
                </div>
                {r.structured_formatting?.secondary_text && (
                  <div className="text-white/35 text-xs truncate mt-0.5">
                    {r.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
              <svg width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="2" strokeOpacity="0.5" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* ── NAVIGATION BAR ── */}
      <div
        style={{
          borderRadius: 20,
          background: 'rgba(9,10,18,0.95)',
          backdropFilter: 'blur(28px)',
          border: '1.5px solid rgba(99,102,241,0.3)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.08) inset, 0 0 32px rgba(99,102,241,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Label row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px 0',
        }}>
          <div style={{
            width: 20, height: 20,
            background: 'linear-gradient(135deg,#6366f1,#818cf8)',
            borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase',
            color: 'rgba(129,140,248,0.7)', fontFamily: 'system-ui,sans-serif',
          }}>Navigate</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'system-ui,sans-serif' }}>Search any destination</span>
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 12px' }}>
          {/* Nav arrow icon */}
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {loading ? (
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
                <polygon points="3 11 22 2 13 21 11 13 3 11" fill="rgba(255,255,255,0.2)" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={t(lang,'where_to')}
            style={{
              flex: 1, background: 'transparent', outline: 'none',
              color: 'white', fontSize: 16, fontWeight: 500,
              fontFamily: 'system-ui,sans-serif',
              minWidth: 0,
            }}
          />

          {/* Clear or Camera */}
          {query.length > 0 ? (
            <button onClick={handleClear} style={{
              width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}>
              <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onCameraClick}
              title="Scan Area"
              style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0, cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 2,
              }}
            >
              <svg width="18" height="18" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  )
}
