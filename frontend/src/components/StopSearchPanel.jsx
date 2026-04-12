import { useState, useEffect, useRef } from 'react'

const CATEGORIES = [
  { key: 'restaurant',  label: 'Food',     icon: '🍽️', type: 'restaurant' },
  { key: 'cafe',        label: 'Café',     icon: '☕', type: 'cafe' },
  { key: 'bar',         label: 'Bar',      icon: '🍺', type: 'bar' },
  { key: 'gas_station', label: 'Gas',      icon: '⛽', type: 'gas_station' },
  { key: 'atm',         label: 'ATM',      icon: '🏧', type: 'atm' },
  { key: 'pharmacy',    label: 'Pharmacy', icon: '💊', type: 'pharmacy' },
  { key: 'supermarket', label: 'Market',   icon: '🛒', type: 'supermarket' },
  { key: 'lodging',     label: 'Hotel',    icon: '🏨', type: 'lodging' },
  { key: 'hospital',    label: 'Medical',  icon: '🏥', type: 'hospital' },
  { key: 'parking',     label: 'Parking',  icon: '🅿️', type: 'parking' },
]

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180
  const a = Math.sin((lat2 - lat1) * Math.PI / 360) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((lng2 - lng1) * Math.PI / 360) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
const fmtDist = m => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`

export default function StopSearchPanel({ coords, stops, onAddStop, onRemoveStop, onClose }) {
  const [cat,     setCat]     = useState('restaurant')
  const [places,  setPlaces]  = useState([])
  const [loading, setLoading] = useState(false)
  const mapDivRef  = useRef(null)
  const serviceRef = useRef(null)

  useEffect(() => {
    if (!mapDivRef.current) mapDivRef.current = document.createElement('div')
    if (window.google?.maps?.places && !serviceRef.current) {
      serviceRef.current = new window.google.maps.places.PlacesService(mapDivRef.current)
    }
  }, [])

  useEffect(() => {
    if (!coords || !serviceRef.current) return
    let cancelled = false
    setLoading(true)
    setPlaces([])

    const activeCat = CATEGORIES.find(c => c.key === cat)
    const center = new window.google.maps.LatLng(coords.lat, coords.lng)

    serviceRef.current.nearbySearch(
      { location: center, radius: 1500, type: activeCat.type },
      (results, status) => {
        if (cancelled) return
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const mapped = results.map(r => ({
            id: r.place_id,
            name: r.name,
            rating: r.rating,
            vicinity: r.vicinity,
            lat: r.geometry.location.lat(),
            lng: r.geometry.location.lng(),
            dist: haversine(coords.lat, coords.lng, r.geometry.location.lat(), r.geometry.location.lng()),
          }))
          mapped.sort((a, b) => a.dist - b.dist)
          setPlaces(mapped.slice(0, 12))
        } else {
          setPlaces([])
        }
        setLoading(false)
      }
    )

    return () => { cancelled = true }
  }, [cat, coords?.lat, coords?.lng])

  const isAdded = p => stops.some(s => s.id === p.id)

  return (
    <div
      className="absolute left-0 right-0 rounded-t-3xl overflow-hidden"
      style={{
        bottom: 0, zIndex: 1300,
        background: '#0d0e17',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
        border: '1px solid rgba(255,255,255,0.08)',
        maxHeight: '78vh',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Handle + header */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-white/10" />
      </div>
      <div className="flex items-center justify-between px-5 pb-3 shrink-0">
        <div>
          <div className="text-white font-bold text-base">Add a Stop</div>
          <div className="text-white/35 text-xs mt-0.5">Nearby places along your route</div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 text-white/40"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Category chips */}
      <div className="overflow-x-auto px-5 pb-3 shrink-0" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-2" style={{ width: 'max-content' }}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: cat === c.key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${cat === c.key ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: cat === c.key ? '#818cf8' : 'rgba(255,255,255,0.45)',
              }}
            >
              <span>{c.icon}</span><span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current stops summary */}
      {stops.length > 0 && (
        <div className="px-5 pb-3 shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1.5">Added Stops</div>
          <div className="flex flex-col gap-1">
            {stops.map((s, i) => (
              <div key={s.id ?? i}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: '#f97316', color: 'white' }}>{i + 1}</div>
                <span className="text-white/80 text-sm flex-1 truncate">{s.name}</span>
                <button onClick={() => onRemoveStop(i)} className="text-white/30 hover:text-red-400 transition-colors shrink-0">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Place list */}
      <div className="overflow-y-auto flex-1 px-5" style={{ paddingBottom: 'max(20px,env(safe-area-inset-bottom))' }}>
        {loading && (
          <div className="flex gap-1 py-4">
            {[0, 100, 200].map(d => (
              <div key={d} className="w-1.5 h-1.5 rounded-full bg-white/25 animate-bounce"
                style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}

        {!loading && places.length === 0 && (
          <div className="text-white/20 text-sm py-6 text-center">Nothing found nearby</div>
        )}

        {!loading && places.map((p, i) => {
          const added = isAdded(p)
          const activeCat = CATEGORIES.find(c => c.key === cat)
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: i < places.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-base shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                {activeCat?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{p.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white/35 text-xs tabular-nums">{fmtDist(p.dist)}</span>
                  {p.rating && <span className="text-white/25 text-xs">· ⭐ {p.rating}</span>}
                </div>
              </div>
              <button
                onClick={() => added ? onRemoveStop(stops.findIndex(s => s.id === p.id)) : onAddStop(p)}
                className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
                style={added ? {
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.9)',
                } : {
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8',
                }}
              >
                {added ? '✕ Remove' : '+ Stop'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
