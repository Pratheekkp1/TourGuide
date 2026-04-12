import { useState, useEffect, useRef } from 'react'

const CATEGORIES = [
  { key: 'restaurant',   label: 'Food',     icon: '🍽️', type: 'restaurant' },
  { key: 'cafe',         label: 'Café',     icon: '☕', type: 'cafe' },
  { key: 'atm',          label: 'ATM',      icon: '🏧', type: 'atm' },
  { key: 'pharmacy',     label: 'Pharmacy', icon: '💊', type: 'pharmacy' },
  { key: 'gas_station',  label: 'Gas',      icon: '⛽', type: 'gas_station' },
  { key: 'supermarket',  label: 'Market',   icon: '🛒', type: 'supermarket' },
]

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180
  const a = Math.sin((lat2 - lat1) * Math.PI / 360) ** 2
          + Math.cos(p1) * Math.cos(p2) * Math.sin((lng2 - lng1) * Math.PI / 360) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
const fmtDist = m => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`

// Sample N evenly-spaced points from the polyline
function samplePolyline(poly, n) {
  if (!poly?.length) return []
  const step = Math.max(1, Math.floor(poly.length / n))
  const pts = []
  for (let i = 0; i < poly.length && pts.length < n; i += step) pts.push(poly[i])
  return pts
}

export default function PlacesAlongRoute({ directionsResult, userCoords }) {
  const [category, setCategory] = useState('restaurant')
  const [places,   setPlaces]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const mapDivRef = useRef(null)
  const serviceRef = useRef(null)

  // Create a hidden div for PlacesService (requires a map or div)
  useEffect(() => {
    if (!mapDivRef.current) {
      mapDivRef.current = document.createElement('div')
    }
    if (window.google?.maps?.places && !serviceRef.current) {
      serviceRef.current = new window.google.maps.places.PlacesService(mapDivRef.current)
    }
  }, [])

  useEffect(() => {
    if (!directionsResult || !serviceRef.current) return

    // Get the overview_path from the first route
    const path = directionsResult.routes[0]?.overview_path
    if (!path?.length) return

    let cancelled = false
    setLoading(true)
    setPlaces([])

    // Sample 4 points along the route
    const samples = samplePolyline(path, 4)
    const cat = CATEGORIES.find(c => c.key === category)
    const allPlaces = []
    const seen = new Set()
    let pending = samples.length

    const finish = () => {
      if (cancelled) return
      allPlaces.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))
      setPlaces(allPlaces.slice(0, 10))
      setLoading(false)
    }

    samples.forEach(ll => {
      const center = new window.google.maps.LatLng(ll.lat(), ll.lng())
      serviceRef.current.nearbySearch(
        { location: center, radius: 400, type: cat.type },
        (results, status) => {
          if (!cancelled && status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            for (const r of results) {
              if (!r.name || seen.has(r.place_id)) continue
              seen.add(r.place_id)
              const lat = r.geometry.location.lat()
              const lng = r.geometry.location.lng()
              const dist = userCoords ? haversine(userCoords.lat, userCoords.lng, lat, lng) : null
              allPlaces.push({
                id: r.place_id,
                name: r.name,
                rating: r.rating,
                vicinity: r.vicinity,
                lat, lng, dist,
                mapsUrl: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
              })
            }
          }
          pending--
          if (pending === 0) finish()
        }
      )
    })

    return () => { cancelled = true }
  }, [directionsResult, category, userCoords?.lat, userCoords?.lng])

  if (!directionsResult) return null

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="text-[10px] uppercase tracking-wider text-white/30 mb-2.5 font-medium">
        Along Your Route
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-all shrink-0"
            style={{
              background: category === c.key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${category === c.key ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: category === c.key ? '#818cf8' : 'rgba(255,255,255,0.4)',
            }}
          >
            <span>{c.icon}</span><span>{c.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex gap-1 py-3 pl-1">
          {[0, 100, 200].map(d => (
            <div key={d} className="w-1.5 h-1.5 rounded-full bg-white/25 animate-bounce"
              style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      )}

      {!loading && places.length > 0 && (
        <div>
          {places.map((p, i) => (
            <a
              key={p.id}
              href={p.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-2.5 transition-all"
              style={{ borderBottom: i < places.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                {CATEGORIES.find(c => c.key === category)?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{p.name}</div>
                <div className="text-white/35 text-xs mt-0.5 truncate">
                  {p.rating && <span>⭐ {p.rating} · </span>}
                  {p.vicinity}
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 gap-0.5">
                {p.dist !== null && (
                  <span className="text-white/35 text-xs tabular-nums">{fmtDist(p.dist)}</span>
                )}
                <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}

      {!loading && places.length === 0 && (
        <div className="text-white/20 text-xs py-2">Nothing found along this route</div>
      )}
    </div>
  )
}
