import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useLang, t } from '../i18n'

const API_URL = import.meta.env.VITE_API_URL ?? ''

// ── MODULE-LEVEL CACHE (persists across panel opens in the same session) ──────
const intelCache = new Map()   // key: `${type}_${locationKey}` → parsed JSON
const nearbyCache = new Map()  // key: `${type}_${lat4}${lng4}` → place array

// ── SHARED PLACES SERVICE (one hidden map, reused by all panels) ──────────────
let _sharedService = null
let _sharedMapDiv  = null

function getPlacesService() {
  if (_sharedService) return _sharedService
  if (!window.google?.maps?.places) return null
  _sharedMapDiv = document.createElement('div')
  document.body.appendChild(_sharedMapDiv)
  const map = new window.google.maps.Map(_sharedMapDiv)
  _sharedService = new window.google.maps.places.PlacesService(map)
  return _sharedService
}

// ── SHARED HELPERS ────────────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function metersToWalk(m) {
  if (m < 100) return 'Under 1 min'
  const mins = Math.round(m / 80)
  return mins < 60 ? `${mins} min walk` : `${Math.round(mins / 60)}h walk`
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 6)  return 'late night'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

function Spinner({ color = '#6366f1', label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, gap: 10 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${color}33`, borderTopColor: color, animation: 'lp-spin 0.8s linear infinite' }} />
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'system-ui,sans-serif' }}>{label || 'Thinking…'}</span>
    </div>
  )
}

function ErrorState({ msg, accent = '#f87171' }) {
  return (
    <div style={{ padding: '20px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 }}>
        {msg || 'Could not load data. Make sure the app server is running.'}
      </div>
    </div>
  )
}

function PanelShell({ title, emoji, accent = '#6366f1', onClose, children }) {
  return (
    <div style={{
      position: 'absolute',
      left: 68,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 1089,
      width: 'min(300px, calc(100vw - 80px))',
      borderRadius: 20, overflow: 'hidden',
      background: 'rgba(9,10,18,0.98)', backdropFilter: 'blur(28px)',
      border: `1px solid ${accent}22`,
      boxShadow: `0 8px 48px rgba(0,0,0,0.75), 0 0 0 1px ${accent}0a inset`,
      maxHeight: '78vh', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${accent}15`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{emoji}</span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14, fontFamily: 'system-ui,sans-serif' }}>{title}</span>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
    </div>
  )
}

// ── NEARBY ESSENTIALS ─────────────────────────────────────────────────────────

const NEARBY_TYPES = [
  { key: 'atm',         tkey: 'atm',       icon: '🏧', type: 'atm',             color: '#60a5fa' },
  { key: 'pharmacy',    tkey: 'pharmacy',   icon: '💊', type: 'pharmacy',        color: '#34d399' },
  { key: 'hospital',    tkey: 'hospital',   icon: '🏥', type: 'hospital',        color: '#f87171' },
  { key: 'transit',     tkey: 'transit_tab',icon: '🚌', type: 'transit_station', color: '#a78bfa' },
  { key: 'food',        tkey: 'food',       icon: '🍽️', type: 'restaurant',      color: '#f97316' },
  { key: 'supermarket', tkey: 'grocery',    icon: '🛒', type: 'supermarket',     color: '#10b981' },
]

function NearbyPanel({ coords, onGetDirections, onClose }) {
  const lang = useLang()
  const [activeKey, setActiveKey] = useState('atm')
  const [results, setResults]     = useState([])
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (!coords) return
    const cacheKey = `${activeKey}_${coords.lat.toFixed(3)}_${coords.lng.toFixed(3)}`
    if (nearbyCache.has(cacheKey)) { setResults(nearbyCache.get(cacheKey)); return }

    const svc = getPlacesService()
    if (!svc) return
    const cat = NEARBY_TYPES.find(t => t.key === activeKey)
    setLoading(true); setResults([])
    svc.nearbySearch({
      location: new window.google.maps.LatLng(coords.lat, coords.lng),
      radius: 1500, type: cat.type,
    }, (places, status) => {
      setLoading(false)
      if (status === 'OK' && places?.length) {
        const result = places
          .filter(p => p.geometry?.location)
          .map(p => ({
            name: p.name, vicinity: p.vicinity,
            lat: p.geometry.location.lat(), lng: p.geometry.location.lng(),
            dist: haversine(coords.lat, coords.lng, p.geometry.location.lat(), p.geometry.location.lng()),
            placeId: p.place_id,
          }))
          .sort((a, b) => a.dist - b.dist).slice(0, 5)
        nearbyCache.set(cacheKey, result)
        setResults(result)
      }
    })
  }, [activeKey, coords])

  const cat = NEARBY_TYPES.find(t => t.key === activeKey)

  return (
    <PanelShell title={t(lang,'nearby_title')} emoji="📍" accent="#60a5fa" onClose={onClose}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, padding: '10px 12px', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
        {NEARBY_TYPES.map(nt => (
          <button key={nt.key} onClick={() => setActiveKey(nt.key)} style={{
            flexShrink: 0, padding: '5px 9px', borderRadius: 20, cursor: 'pointer',
            background: activeKey === nt.key ? `${nt.color}22` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${activeKey === nt.key ? nt.color + '50' : 'rgba(255,255,255,0.08)'}`,
            color: activeKey === nt.key ? nt.color : 'rgba(255,255,255,0.4)',
            fontSize: 11, fontWeight: 600, fontFamily: 'system-ui,sans-serif', transition: 'all 0.15s',
          }}>{nt.icon} {t(lang, nt.tkey)}</button>
        ))}
      </div>
      {/* Results */}
      <div style={{ padding: '0 12px 14px', minHeight: 100 }}>
        {loading && <Spinner color={cat.color} />}
        {!loading && !results.length && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'system-ui,sans-serif', paddingTop: 24 }}>None found within 1.5 km</div>}
        {!loading && results.map((r, i) => (
          <button key={i} onClick={() => { onGetDirections({ name: r.name, lat: r.lat, lng: r.lng, placeId: r.placeId }); onClose() }}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, marginBottom: 5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `${cat.color}18`, border: `1px solid ${cat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{cat.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: 12, fontWeight: 600, fontFamily: 'system-ui,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'system-ui,sans-serif', marginTop: 1 }}>{metersToWalk(r.dist)}</div>
            </div>
            <svg width="14" height="14" fill="none" stroke={cat.color} strokeWidth="2" strokeOpacity="0.7" viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11" strokeLinejoin="round"/></svg>
          </button>
        ))}
      </div>
    </PanelShell>
  )
}

// ── EMERGENCY SOS ─────────────────────────────────────────────────────────────

function SosPanel({ coords, onGetDirections, onClose }) {
  const lang = useLang()
  const [copied, setCopied]     = useState(false)
  const [hospital, setHospital] = useState(null)

  useEffect(() => {
    if (!coords) return
    const cacheKey = `hospital_${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`
    if (nearbyCache.has(cacheKey)) { setHospital(nearbyCache.get(cacheKey)); return }
    const svc = getPlacesService()
    if (!svc) return
    svc.nearbySearch({
      location: new window.google.maps.LatLng(coords.lat, coords.lng),
      radius: 5000, type: 'hospital',
    }, (places, status) => {
      if (status === 'OK' && places?.[0]) {
        const p = places[0]
        const h = { name: p.name, lat: p.geometry.location.lat(), lng: p.geometry.location.lng(), dist: Math.round(haversine(coords.lat, coords.lng, p.geometry.location.lat(), p.geometry.location.lng())), placeId: p.place_id }
        nearbyCache.set(cacheKey, h)
        setHospital(h)
      }
    })
  }, [coords])

  const copyCoords = () => {
    if (!coords) return
    navigator.clipboard?.writeText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <PanelShell title={t(lang,'sos_title')} emoji="🆘" accent="#f87171" onClose={onClose}>
      <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a href="tel:911" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(248,113,113,0.12)', border: '1.5px solid rgba(248,113,113,0.3)', textDecoration: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          </div>
          <div>
            <div style={{ color: '#f87171', fontWeight: 800, fontSize: 20, fontFamily: 'system-ui,sans-serif', lineHeight: 1 }}>911</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'system-ui,sans-serif', marginTop: 2 }}>US Emergency services</div>
          </div>
        </a>
        {hospital && (
          <button onClick={() => { onGetDirections({ name: hospital.name, lat: hospital.lat, lng: hospital.lng, placeId: hospital.placeId }); onClose() }}
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, cursor: 'pointer', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏥</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: 12, fontWeight: 600, fontFamily: 'system-ui,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hospital.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'system-ui,sans-serif', marginTop: 1 }}>{metersToWalk(hospital.dist)} · tap for directions</div>
            </div>
          </button>
        )}
        <button onClick={copyCoords} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 12, cursor: 'pointer', background: copied ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s' }}>
          <svg width="14" height="14" fill="none" stroke={copied ? '#818cf8' : 'rgba(255,255,255,0.4)'} strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span style={{ color: copied ? '#818cf8' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui,sans-serif' }}>
            {copied ? 'Copied!' : coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Copy coordinates'}
          </span>
        </button>
      </div>
    </PanelShell>
  )
}

// ── SCAM ALERTS ───────────────────────────────────────────────────────────────

const WARN_COLORS = { low: '#34d399', moderate: '#f59e0b', high: '#f87171' }

function useCityIntel(type, coords, locationName, extraKey = '', extraFields = {}) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const lat = coords?.lat
  const lng = coords?.lng
  const key = `${type}_${lat?.toFixed(2) ?? 'x'}_${lng?.toFixed(2) ?? 'x'}_${extraKey}`

  useEffect(() => {
    // Don't fire until we have real, finite numeric coords (typeof NaN === 'number')
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) {
      setLoading(true)
      return
    }
    setError(null)
    if (intelCache.has(key)) {
      setData(intelCache.get(key))
      setLoading(false)
      return
    }
    setLoading(true)

    const body = new URLSearchParams()
    body.set('lat', lat.toString())
    body.set('lng', lng.toString())
    body.set('location_name', locationName || '')
    body.set('intel_type', type)
    Object.entries(extraFields).forEach(([k, v]) => body.set(k, String(v)))

    fetch(`${API_URL}/api/city-intel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, d })))
      .then(({ ok, status, d }) => {
        if (!ok || d?.detail) throw new Error(`Server error ${status}`)
        intelCache.set(key, d)
        setData(d)
      })
      .catch(e => setError(e.message || 'Could not load data'))
      .finally(() => setLoading(false))
  }, [key, lat, lng])

  return { data, loading, error }
}

function ScamPanel({ coords, locationName, onClose }) {
  const lang = useLang()
  const { data, loading, error } = useCityIntel('scams', coords, locationName)
  const [expanded, setExpanded] = useState(null)

  const warnColor = WARN_COLORS[data?.warning_level] || '#f59e0b'

  return (
    <PanelShell title={t(lang,'scams_title')} emoji="⚠️" accent="#f59e0b" onClose={onClose}>
      {loading && <Spinner color="#f59e0b" />}
      {!loading && error && <ErrorState msg={error} />}
      {!loading && !error && data && (
        <div style={{ padding: '0 12px 14px' }}>
          {/* Warning level badge */}
          <div style={{ margin: '10px 0 12px', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: `${warnColor}12`, border: `1px solid ${warnColor}30` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: warnColor, flexShrink: 0, boxShadow: `0 0 6px ${warnColor}` }} />
            <span style={{ color: warnColor, fontSize: 11, fontWeight: 700, fontFamily: 'system-ui,sans-serif', textTransform: 'capitalize' }}>{data.warning_level} risk</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'system-ui,sans-serif' }}>in {data.city}</span>
          </div>
          {/* Scam list */}
          {data.scams?.map((scam, i) => (
            <div key={i} style={{ marginBottom: 6, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <button onClick={() => setExpanded(expanded === i ? null : i)}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', background: 'transparent', border: 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🎭</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: 12, fontWeight: 600, fontFamily: 'system-ui,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scam.name}</div>
                  {scam.where && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'system-ui,sans-serif', marginTop: 1 }}>{scam.where}</div>}
                </div>
                <svg width="12" height="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: expanded === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {expanded === i && (
                <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'system-ui,sans-serif', lineHeight: 1.5, marginTop: 8 }}>{scam.how_it_works}</div>
                  {scam.red_flags?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ color: '#f87171', fontSize: 10, fontWeight: 700, fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Red flags</div>
                      {scam.red_flags.map((f, j) => <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}><span style={{ color: '#f87171', fontSize: 10 }}>•</span><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'system-ui,sans-serif', lineHeight: 1.4 }}>{f}</span></div>)}
                    </div>
                  )}
                  {scam.how_to_avoid && (
                    <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                      <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui,sans-serif' }}>✓ {scam.how_to_avoid}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {/* Golden rule */}
          {data.golden_rule && (
            <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700, fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Golden Rule</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 }}>{data.golden_rule}</div>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  )
}

// ── PRICE GUIDE ───────────────────────────────────────────────────────────────

const MARKUP_COLORS = { low: '#34d399', medium: '#f59e0b', high: '#f87171' }

function PricesPanel({ coords, locationName, onClose }) {
  const lang = useLang()
  const { data, loading, error } = useCityIntel('prices', coords, locationName)

  return (
    <PanelShell title={t(lang,'prices_title')} emoji="💰" accent="#34d399" onClose={onClose}>
      {loading && <Spinner color="#34d399" label={t(lang,'thinking')} />}
      {!loading && error && <ErrorState msg={error} />}
      {!loading && !error && data && (
        <div style={{ padding: '0 12px 14px' }}>
          {/* City + currency */}
          <div style={{ margin: '10px 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'system-ui,sans-serif' }}>{data.city}</span>
            <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700, fontFamily: 'system-ui,sans-serif' }}>{data.currency}</span>
          </div>
          {/* Exchange tip */}
          {data.exchange_tip && (
            <div style={{ marginBottom: 10, padding: '7px 10px', borderRadius: 10, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'system-ui,sans-serif', lineHeight: 1.4 }}>💡 {data.exchange_tip}</span>
            </div>
          )}
          {/* Column header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, padding: '4px 6px', marginBottom: 4 }}>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif' }}>Item</span>
            <span style={{ color: '#34d399', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif', textAlign: 'center' }}>Local</span>
            <span style={{ color: '#f87171', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif', textAlign: 'right' }}>Tourist</span>
          </div>
          {/* Price rows */}
          {data.items?.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, padding: '8px 6px', borderRadius: 10, marginBottom: 3, background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{item.emoji || '•'}</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontFamily: 'system-ui,sans-serif' }}>{item.item}</span>
              </div>
              <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui,sans-serif', textAlign: 'center' }}>{item.local_price}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: MARKUP_COLORS[item.markup] || '#f87171', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui,sans-serif' }}>{item.tourist_price}</span>
              </div>
            </div>
          ))}
          {/* Bargaining note */}
          {data.bargaining && (
            <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <div style={{ color: '#a78bfa', fontSize: 10, fontWeight: 700, fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Bargaining</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'system-ui,sans-serif', lineHeight: 1.4 }}>{data.bargaining}</div>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  )
}

// ── DAY PLANNER ───────────────────────────────────────────────────────────────

const CATEGORY_ICONS = { landmark: '🏛️', food: '🍽️', market: '🛍️', museum: '🎨', park: '🌿', neighborhood: '🏘️', viewpoint: '🌄', other: '📍' }

function geocodeStop(stopName, coords, onGetDirections, onClose, setGeoLoading, mode = 'walk') {
  const svc = getPlacesService()
  if (!svc) return
  setGeoLoading(stopName)
  svc.textSearch({
    query: stopName,
    location: new window.google.maps.LatLng(coords.lat, coords.lng),
    radius: 50000,
  }, (results, status) => {
    setGeoLoading(null)
    if (status === 'OK' && results?.[0]?.geometry?.location) {
      const loc = results[0].geometry.location
      onGetDirections({ name: stopName, lat: loc.lat(), lng: loc.lng() }, mode)
    } else {
      onGetDirections({ name: stopName, lat: coords.lat, lng: coords.lng }, mode)
    }
    onClose()
  })
}

function PlannerPanel({ coords, locationName, onGetDirections, onClose }) {
  const lang = useLang()
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [duration, setDuration]   = useState(4)
  const [travelMode, setTravelMode] = useState('walk')
  const [context, setContext]     = useState('')
  const [fetched, setFetched]     = useState(false)
  const [geoLoading, setGeoLoading] = useState(null)

  const fetchPlan = useCallback(() => {
    if (!coords?.lat || !coords?.lng) return
    const cacheKey = `planner_${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}_${duration}_${travelMode}_${context.slice(0,20)}`
    if (intelCache.has(cacheKey)) { setData(intelCache.get(cacheKey)); setFetched(true); setError(null); return }
    setLoading(true); setFetched(true); setError(null); setData(null)
    const params = new URLSearchParams({
      lat: String(coords.lat),
      lng: String(coords.lng),
      location_name: locationName || '',
      intel_type: 'planner',
      duration_hours: String(duration),
      time_of_day: getTimeOfDay(),
      user_context: [
        travelMode === 'walk' ? 'traveling on foot' : travelMode === 'bike' ? 'traveling by bike' : 'traveling by car',
        context.trim(),
      ].filter(Boolean).join('. '),
    })
    fetch(`${API_URL}/api/city-intel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { if (d.detail) throw new Error('API error'); intelCache.set(cacheKey, d); setData(d) })
      .catch(e => setError(e.message || 'Failed to generate plan'))
      .finally(() => setLoading(false))
  }, [coords, locationName, duration, travelMode, context])

  return (
    <PanelShell title={t(lang,'plan_title')} emoji="🗺️" accent="#818cf8" onClose={onClose}>
      {/* Controls */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Duration row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'system-ui,sans-serif', flexShrink: 0 }}>{t(lang,'time')}</span>
          {[2, 3, 4, 6, 8].map(h => (
            <button key={h} onClick={() => setDuration(h)} style={{
              width: 30, height: 26, borderRadius: 7, cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: 'system-ui,sans-serif',
              background: duration === h ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${duration === h ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: duration === h ? '#818cf8' : 'rgba(255,255,255,0.35)',
            }}>{h}h</button>
          ))}
        </div>
        {/* Travel mode row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'system-ui,sans-serif', flexShrink: 0 }}>{t(lang,'mode')}</span>
          {[
            { key: 'walk', icon: '🚶', tkey: 'walk' },
            { key: 'bike', icon: '🚴', tkey: 'bike' },
            { key: 'drive', icon: '🚗', tkey: 'drive' },
          ].map(m => (
            <button key={m.key} onClick={() => setTravelMode(m.key)} style={{
              flex: 1, padding: '4px 0', borderRadius: 7, cursor: 'pointer',
              fontSize: 10, fontWeight: 600, fontFamily: 'system-ui,sans-serif',
              background: travelMode === m.key ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${travelMode === m.key ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: travelMode === m.key ? '#818cf8' : 'rgba(255,255,255,0.35)',
            }}>{m.icon} {t(lang, m.tkey)}</button>
          ))}
        </div>
        {/* Context input */}
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder={t(lang,'preferences')}
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10, padding: '7px 10px', resize: 'none',
            color: 'white', fontSize: 11, fontFamily: 'system-ui,sans-serif', lineHeight: 1.4,
            outline: 'none', marginBottom: 8,
          }}
        />
        <button onClick={fetchPlan} disabled={loading} style={{
          width: '100%', padding: '8px', borderRadius: 10, cursor: loading ? 'default' : 'pointer',
          fontSize: 12, fontWeight: 700, fontFamily: 'system-ui,sans-serif',
          background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#818cf8)',
          border: 'none', color: 'white', boxShadow: loading ? 'none' : '0 2px 16px rgba(99,102,241,0.5)',
          transition: 'all 0.2s',
        }}>
          {loading ? t(lang,'planning') : fetched ? t(lang,'plan_regen') : t(lang,'plan_btn')}
        </button>
      </div>

      {!fetched && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, gap: 6 }}>
          <span style={{ fontSize: 26 }}>🗺️</span>
        </div>
      )}
      {loading && <Spinner color="#818cf8" label={t(lang,'thinking')} />}
      {!loading && error && <ErrorState msg={error} />}
      {!loading && data && (
        <div style={{ padding: '10px 12px 14px' }}>
          {data.theme && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'system-ui,sans-serif', fontStyle: 'italic', marginBottom: 10 }}>{data.theme}</div>}
          {data.stops?.map((stop, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {/* Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(129,140,248,0.2)', border: '2px solid rgba(129,140,248,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontSize: 11, fontWeight: 700, fontFamily: 'system-ui,sans-serif' }}>{i + 1}</div>
                {i < data.stops.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'rgba(129,140,248,0.2)', minHeight: 16, marginTop: 3 }} />}
              </div>
              {/* Content */}
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[stop.category] || '📍'}</span>
                  <span style={{ color: 'white', fontSize: 12, fontWeight: 700, fontFamily: 'system-ui,sans-serif' }}>{stop.name}</span>
                </div>
                {stop.from_previous && i > 0 && (
                  <div style={{ color: 'rgba(129,140,248,0.6)', fontSize: 10, fontFamily: 'system-ui,sans-serif', marginBottom: 3 }}>↑ {stop.from_previous}</div>
                )}
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'system-ui,sans-serif', lineHeight: 1.45, marginBottom: 4 }}>{stop.why}</div>
                {stop.insider_tip && (
                  <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)', marginBottom: 5 }}>
                    <span style={{ color: 'rgba(129,140,248,0.8)', fontSize: 10, fontFamily: 'system-ui,sans-serif' }}>💡 {stop.insider_tip}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: 'system-ui,sans-serif' }}>⏱ {stop.time_to_spend}</span>
                  <button
                    disabled={geoLoading === stop.name}
                    onClick={() => geocodeStop(stop.name, coords, onGetDirections, onClose, setGeoLoading, travelMode)}
                    style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 7, cursor: geoLoading === stop.name ? 'default' : 'pointer', fontSize: 10, fontWeight: 600, fontFamily: 'system-ui,sans-serif', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', color: '#818cf8', opacity: geoLoading === stop.name ? 0.5 : 1 }}>
                    {geoLoading === stop.name ? t(lang,'navigating') : t(lang,'navigate_btn')}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(data.total_walking || data.budget_estimate) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {data.total_walking && <div style={{ flex: 1, padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}><div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif' }}>Walking</div><div style={{ color: 'white', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui,sans-serif', marginTop: 2 }}>{data.total_walking}</div></div>}
              {data.budget_estimate && <div style={{ flex: 1, padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}><div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif' }}>Budget</div><div style={{ color: '#34d399', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui,sans-serif', marginTop: 2 }}>{data.budget_estimate}</div></div>}
            </div>
          )}
        </div>
      )}
    </PanelShell>
  )
}

// ── TRANSIT DECODER ───────────────────────────────────────────────────────────

const TRANSIT_TYPE_LABEL = {
  BUS: '🚌 Bus', SUBWAY: '🚇 Subway', TRAM: '🚋 Tram', RAIL: '🚆 Rail',
  FERRY: '⛴ Ferry', CABLE_CAR: '🚡 Cable Car', GONDOLA: '🚠 Gondola', FUNICULAR: '🚟 Funicular',
}

function metersToWalkStr(m) {
  if (m < 100) return 'steps away'
  const mins = Math.round(m / 80)
  return `${mins} min walk`
}

function TransitPanel({ coords, locationName, onGetDirections, onClose }) {
  const lang = useLang()
  const { data: guideData, loading: guideLoading } = useCityIntel('transit', coords, locationName)
  const [stations, setStations]   = useState([])
  const [liveRoute, setLiveRoute] = useState(null)   // transit directions to city center
  const [liveLoading, setLiveLoading] = useState(true)
  const [activeStation, setActiveStation] = useState(null)

  // Load nearby transit stations via Google Places
  useEffect(() => {
    if (!coords) return
    const cacheKey = `transit_stations_${coords.lat.toFixed(3)}_${coords.lng.toFixed(3)}`
    if (nearbyCache.has(cacheKey)) { setStations(nearbyCache.get(cacheKey)); setLiveLoading(false); return }
    const svc = getPlacesService()
    if (!svc) { setLiveLoading(false); return }
    svc.nearbySearch({
      location: new window.google.maps.LatLng(coords.lat, coords.lng),
      radius: 800,
      type: 'transit_station',
    }, (places, status) => {
      if (status === 'OK' && places?.length) {
        const result = places
          .filter(p => p.geometry?.location)
          .map(p => ({
            name: p.name,
            lat: p.geometry.location.lat(),
            lng: p.geometry.location.lng(),
            dist: haversine(coords.lat, coords.lng, p.geometry.location.lat(), p.geometry.location.lng()),
            placeId: p.place_id,
            types: p.types || [],
          }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 5)
        nearbyCache.set(cacheKey, result)
        setStations(result)
        if (result[0]) setActiveStation(result[0])
      }
      setLiveLoading(false)
    })
  }, [coords])

  // When a station is selected, get transit directions FROM user TO that station
  useEffect(() => {
    if (!activeStation || !coords || !window.google?.maps) return
    const svc = new window.google.maps.DirectionsService()
    svc.route({
      origin: { lat: coords.lat, lng: coords.lng },
      destination: { lat: activeStation.lat, lng: activeStation.lng },
      travelMode: window.google.maps.TravelMode.TRANSIT,
    }, (result, status) => {
      if (status === 'OK' && result.routes?.[0]) {
        const leg = result.routes[0].legs[0]
        const transitSteps = leg.steps
          .filter(s => s.travel_mode === 'TRANSIT')
          .map(s => ({
            line: s.transit?.line?.short_name || s.transit?.line?.name || '',
            vehicle: s.transit?.line?.vehicle?.type || 'BUS',
            headsign: s.transit?.headsign || '',
            departure: s.transit?.departure_stop?.name || '',
            arrival: s.transit?.arrival_stop?.name || '',
            numStops: s.transit?.num_stops || 0,
            duration: s.duration?.text || '',
            color: s.transit?.line?.color ? `#${s.transit.line.color}` : '#a78bfa',
          }))
        setLiveRoute({
          duration: leg.duration?.text,
          distance: leg.distance?.text,
          walkingSteps: leg.steps.filter(s => s.travel_mode === 'WALKING').length,
          transitSteps,
          arrivalTime: leg.arrival_time?.text,
          departureTime: leg.departure_time?.text,
        })
      } else {
        setLiveRoute(null)
      }
    })
  }, [activeStation, coords])

  const accent = '#a78bfa'

  return (
    <PanelShell title={t(lang,'transit_title')} emoji="🚌" accent={accent} onClose={onClose}>
      {/* ── NEARBY STATIONS ── */}
      <div style={{ padding: '10px 12px 0' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif', marginBottom: 6 }}>Nearby Stations</div>
        {liveLoading && <Spinner color={accent} />}
        {!liveLoading && stations.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'system-ui,sans-serif', paddingBottom: 10 }}>No transit stations found within 800m</div>
        )}
        {!liveLoading && stations.map((s, i) => (
          <button key={i} onClick={() => setActiveStation(s)}
            style={{
              width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 12, marginBottom: 5, cursor: 'pointer',
              background: activeStation?.placeId === s.placeId ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${activeStation?.placeId === s.placeId ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.15s',
            }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              {s.types.includes('subway_station') ? '🚇' : s.types.includes('bus_station') ? '🚌' : s.types.includes('train_station') ? '🚆' : '🚌'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: 12, fontWeight: 600, fontFamily: 'system-ui,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'system-ui,sans-serif', marginTop: 1 }}>{metersToWalkStr(s.dist)}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); onGetDirections({ name: s.name, lat: s.lat, lng: s.lng, placeId: s.placeId }); onClose() }}
              style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: 'system-ui,sans-serif', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: accent }}>
              Walk →
            </button>
          </button>
        ))}

        {/* ── LIVE ROUTE INFO ── */}
        {activeStation && liveRoute && (
          <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(167,139,250,0.12),rgba(99,102,241,0.08))', border: '1px solid rgba(167,139,250,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: accent, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif' }}>Route from here</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'system-ui,sans-serif' }}>{liveRoute.duration}</span>
            </div>
            {liveRoute.departureTime && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: 'system-ui,sans-serif' }}>Departs</div>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui,sans-serif' }}>{liveRoute.departureTime}</div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16, alignSelf: 'center' }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: 'system-ui,sans-serif' }}>Arrives</div>
                  <div style={{ color: '#34d399', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui,sans-serif' }}>{liveRoute.arrivalTime}</div>
                </div>
              </div>
            )}
            {liveRoute.transitSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ width: 28, height: 22, borderRadius: 6, flexShrink: 0, background: step.color + '33', border: `1px solid ${step.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: step.color, fontSize: 10, fontWeight: 800, fontFamily: 'system-ui,sans-serif' }}>{step.line || TRANSIT_TYPE_LABEL[step.vehicle]?.split(' ')[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {TRANSIT_TYPE_LABEL[step.vehicle] || '🚌'}{step.headsign ? ` → ${step.headsign}` : ''}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'system-ui,sans-serif' }}>
                    {step.departure} → {step.arrival} · {step.numStops} stop{step.numStops !== 1 ? 's' : ''}
                  </div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'system-ui,sans-serif', flexShrink: 0 }}>{step.duration}</span>
              </div>
            ))}
            {liveRoute.transitSteps.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'system-ui,sans-serif' }}>Walk only — {liveRoute.duration}, {liveRoute.distance}</div>
            )}
          </div>
        )}
      </div>

      {/* ── AI GUIDE (city card/tips from static data) ── */}
      {!guideLoading && guideData && (
        <div style={{ padding: '0 12px 14px' }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />

          {guideData.card && (
            <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 14, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <div style={{ color: accent, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif', marginBottom: 5 }}>🎫 {guideData.card.name}</div>
              {guideData.card.cost && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'system-ui,sans-serif', marginBottom: 2 }}>Cost: {guideData.card.cost}</div>}
              {guideData.card.where_to_buy && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'system-ui,sans-serif', marginBottom: 2 }}>Get it: {guideData.card.where_to_buy}</div>}
              {guideData.card.tourist_pass && <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', fontSize: 11, fontFamily: 'system-ui,sans-serif' }}>🎟 {guideData.card.tourist_pass}</div>}
            </div>
          )}

          {guideData.avoid?.length > 0 && (
            <div>
              <div style={{ color: '#f87171', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif', marginBottom: 6 }}>Common Mistakes</div>
              {guideData.avoid.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#f87171', fontSize: 11 }}>×</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'system-ui,sans-serif', lineHeight: 1.4 }}>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {guideData.pro_tip && (
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <div style={{ color: accent, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'system-ui,sans-serif', marginBottom: 3 }}>Pro Tip</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontFamily: 'system-ui,sans-serif', lineHeight: 1.45 }}>{guideData.pro_tip}</div>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  )
}

// ── MAIN LEFT PANEL ───────────────────────────────────────────────────────────

export default function LeftPanel({ coords, locationName, onCameraClick, onGetDirections }) {
  const lang = useLang()
  const [panel, setPanel] = useState(null)
  const toggle = (key) => setPanel(p => p === key ? null : key)

  const BUTTONS = [
    {
      key: 'scan', label: t(lang,'scan'),
      onClick: onCameraClick,
      gradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
      glow: 'rgba(99,102,241,0.55)',
      icon: <svg width="21" height="21" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    },
    {
      key: 'nearby', label: t(lang,'nearby'), activeColor: '#60a5fa',
      icon: <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6" strokeLinecap="round"/></svg>,
    },
    {
      key: 'sos', label: t(lang,'sos'), activeColor: '#f87171', activeBorder: 'rgba(248,113,113,0.3)',
      icon: <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>,
    },
    null, // divider
    {
      key: 'scams', label: t(lang,'scams'), activeColor: '#f59e0b',
      icon: <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5"/></svg>,
    },
    {
      key: 'prices', label: t(lang,'prices'), activeColor: '#34d399',
      icon: <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    },
    {
      key: 'planner', label: t(lang,'plan'), activeColor: '#818cf8',
      icon: <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>,
    },
    {
      key: 'transit', label: t(lang,'transit'), activeColor: '#a78bfa',
      icon: <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="1" width="18" height="16" rx="2"/><path d="M3 11h18M7 17l-2 4M17 17l2 4M7 7h0M17 7h0"/></svg>,
    },
  ]

  return (
    <>
      <style>{`@keyframes lp-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Button strip */}
      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1090, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {BUTTONS.map((btn, i) =>
          btn === null
            ? <div key={`div-${i}`} style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginTop: 2, marginBottom: 2 }} />
            : (
              <PanelBtn
                key={btn.key}
                {...btn}
                active={panel === btn.key}
                onClick={btn.onClick ?? (() => toggle(btn.key))}
              />
            )
        )}
      </div>

      {/* Slide-out panels */}
      {panel === 'nearby'  && <NearbyPanel  coords={coords} onGetDirections={onGetDirections} onClose={() => setPanel(null)} />}
      {panel === 'sos'     && <SosPanel     coords={coords} onGetDirections={onGetDirections} onClose={() => setPanel(null)} />}
      {panel === 'scams'   && <ScamPanel    coords={coords} locationName={locationName} onClose={() => setPanel(null)} />}
      {panel === 'prices'  && <PricesPanel  coords={coords} locationName={locationName} onClose={() => setPanel(null)} />}
      {panel === 'planner' && <PlannerPanel coords={coords} locationName={locationName} onGetDirections={onGetDirections} onClose={() => setPanel(null)} />}
      {panel === 'transit' && <TransitPanel coords={coords} locationName={locationName} onGetDirections={onGetDirections} onClose={() => setPanel(null)} />}
    </>
  )
}

function PanelBtn({ icon, label, active, gradient, glow, activeColor = '#6366f1', activeBorder, onClick }) {
  const color = active ? activeColor : 'rgba(255,255,255,0.45)'
  return (
    <button onClick={onClick} title={label} style={{
      width: 50, height: 50, borderRadius: 15, cursor: 'pointer',
      background: gradient ?? (active ? `${activeColor}18` : 'rgba(9,10,18,0.92)'),
      border: `1.5px solid ${gradient ? 'rgba(255,255,255,0.18)' : active ? (activeBorder ?? `${activeColor}45`) : 'rgba(255,255,255,0.09)'}`,
      backdropFilter: 'blur(20px)',
      boxShadow: glow ? `0 4px 24px ${glow}` : active ? `0 4px 18px ${activeColor}33` : '0 4px 16px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
      transition: 'all 0.18s ease', color,
    }}>
      {icon}
      <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: 'system-ui,sans-serif', color: gradient ? 'rgba(255,255,255,0.85)' : color }}>{label}</span>
    </button>
  )
}
