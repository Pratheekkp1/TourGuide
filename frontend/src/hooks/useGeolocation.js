import { useState, useEffect, useCallback, useRef } from 'react'

const COUNTRY_TO_REGION = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  JP: 'Japan', KR: 'South Korea', IN: 'India', FR: 'France', DE: 'Germany',
  ES: 'Spain', IT: 'Italy', NL: 'Netherlands', BR: 'Brazil', MX: 'Mexico',
  CN: 'China', TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines',
  NG: 'Nigeria', KE: 'Kenya', EG: 'Egypt', TR: 'Turkey',
  AE: 'UAE / Gulf', QA: 'UAE / Gulf', KW: 'UAE / Gulf', BH: 'UAE / Gulf', OM: 'UAE / Gulf',
  SA: 'Saudi Arabia',
  NO: 'Scandinavia', SE: 'Scandinavia', DK: 'Scandinavia', FI: 'Scandinavia',
  PL: 'Eastern Europe', UA: 'Eastern Europe', RO: 'Eastern Europe', CZ: 'Eastern Europe', HU: 'Eastern Europe',
  AR: 'Latin America', CO: 'Latin America', CL: 'Latin America', PE: 'Latin America',
  ID: 'Southeast Asia', MY: 'Southeast Asia', SG: 'Southeast Asia',
  GH: 'West Africa', SN: 'West Africa', CI: 'West Africa',
}

const LAST_POS_KEY = 'tg_last_pos'

function loadCachedPos() {
  try {
    const s = localStorage.getItem(LAST_POS_KEY)
    if (!s) return null
    const p = JSON.parse(s)
    // Only use cache if < 10 minutes old
    if (Date.now() - p.ts < 10 * 60 * 1000) return p
  } catch {}
  return null
}

function saveCachedPos(lat, lng) {
  try { localStorage.setItem(LAST_POS_KEY, JSON.stringify({ lat, lng, ts: Date.now() })) } catch {}
}

export default function useGeolocation() {
  // Seed from localStorage so the dot appears instantly on reload
  const cached = loadCachedPos()
  const [coords, setCoords]             = useState(cached ? { lat: cached.lat, lng: cached.lng, accuracy: 999 } : null)
  const [locationName, setLocationName] = useState('')
  const [detectedRegion, setDetectedRegion] = useState(null)
  const [status, setStatus]             = useState(cached ? 'granted' : 'idle')
  const watchIdRef                      = useRef(null)
  const lastResolveCoords               = useRef(null)
  const lastCoordsRef                   = useRef(cached ? { lat: cached.lat, lng: cached.lng } : null)

  const resolveLocation = useCallback(async (lat, lng) => {
    if (lastResolveCoords.current) {
      const dlat = Math.abs(lat - lastResolveCoords.current.lat)
      const dlng = Math.abs(lng - lastResolveCoords.current.lng)
      if (dlat < 0.002 && dlng < 0.002) return
    }
    lastResolveCoords.current = { lat, lng }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      const addr = data.address || {}
      const city = addr.city || addr.town || addr.village || addr.county || ''
      const country = addr.country || ''
      const countryCode = (addr.country_code || '').toUpperCase()
      setLocationName([city, country].filter(Boolean).join(', '))
      setDetectedRegion(COUNTRY_TO_REGION[countryCode] || null)
    } catch {}
  }, [])

  const applyPosition = useCallback((lat, lng, accuracy, heading, speed) => {
    // Throttle: skip if moved < 5m
    const last = lastCoordsRef.current
    if (last) {
      const dlat = Math.abs(lat - last.lat)
      const dlng = Math.abs(lng - last.lng)
      if (dlat < 0.00005 && dlng < 0.00005) return
    }
    lastCoordsRef.current = { lat, lng }
    saveCachedPos(lat, lng)
    setCoords({ lat, lng, accuracy, heading, speed })
    setStatus('granted')
    resolveLocation(lat, lng)
  }, [resolveLocation])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setStatus('error'); return }
    if (!cached) setStatus('requesting')

    // Phase 1 — fast coarse fix (network/IP, usually < 1s)
    navigator.geolocation.getCurrentPosition(
      (pos) => applyPosition(
        pos.coords.latitude, pos.coords.longitude,
        pos.coords.accuracy, pos.coords.heading, pos.coords.speed
      ),
      () => {},
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
    )

    // Phase 2 — accurate watch (GPS, may take a few seconds)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => applyPosition(
        pos.coords.latitude, pos.coords.longitude,
        pos.coords.accuracy, pos.coords.heading, pos.coords.speed
      ),
      () => { if (!lastCoordsRef.current) setStatus('denied') },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )
  }, [applyPosition, cached])

  useEffect(() => {
    requestLocation()
    // Resolve name for cached position immediately
    if (cached) resolveLocation(cached.lat, cached.lng)
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, []) // eslint-disable-line

  return { coords, locationName, detectedRegion, status, requestLocation }
}
