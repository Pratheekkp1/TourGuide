import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? ''
const REFRESH_DISTANCE_M = 300
const CACHE_KEY = 'tg_nearby_cache'

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const dφ = (lat2 - lat1) * Math.PI / 180, dλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function loadNearbyCache() {
  try {
    const s = localStorage.getItem(CACHE_KEY)
    if (!s) return null
    const c = JSON.parse(s)
    // Use cache if < 5 minutes old
    if (Date.now() - c.ts < 5 * 60 * 1000) return c
  } catch {}
  return null
}

function saveNearbyCache(lat, lng, places) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, places, ts: Date.now() })) } catch {}
}

export default function useNearby(coords) {
  // Seed from localStorage for instant markers on reload
  const initCache = loadNearbyCache()
  const [places, setPlaces]   = useState(initCache?.places ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const lastFetchCoords       = useRef(
    initCache ? { lat: initCache.lat, lng: initCache.lng } : null
  )

  const fetchNearby = useCallback(async (lat, lng) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`${API_URL}/api/nearby?lat=${lat}&lng=${lng}&radius=1000`)
      const data = await res.json()
      const p    = data.places || []
      setPlaces(p)
      saveNearbyCache(lat, lng, p)
      lastFetchCoords.current = { lat, lng }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const hasFetchedOnMount = useRef(false)

  useEffect(() => {
    if (!coords) return
    const { lat, lng } = coords
    const last = lastFetchCoords.current

    // Always fetch on first real coords arrival, then only when moved >300m
    if (!hasFetchedOnMount.current || !last || haversine(last.lat, last.lng, lat, lng) > REFRESH_DISTANCE_M) {
      hasFetchedOnMount.current = true
      fetchNearby(lat, lng)
    }
  }, [coords, fetchNearby])

  return { places, loading, error, refresh: () => coords && fetchNearby(coords.lat, coords.lng) }
}
