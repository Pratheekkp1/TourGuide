import { useState, useEffect, useRef } from 'react'

const fmtDur = s => {
  s = Math.round(s)
  if (s < 60) return `${s} sec`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} hr ${r} min` : `${h} hr`
}
const fmtDist = m => {
  m = Math.round(m)
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}
const etaStr = secs => {
  const t = new Date()
  t.setSeconds(t.getSeconds() + secs)
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function parseDirections(result) {
  const route = result.routes[0]
  const legs = route.legs

  const totalDist = legs.reduce((a, l) => a + l.distance.value, 0)
  const totalDur  = legs.reduce((a, l) => a + l.duration.value, 0)

  // Flatten all steps across all legs
  const steps = []
  for (const leg of legs) {
    for (const s of leg.steps) {
      steps.push({
        instruction: s.instructions.replace(/<[^>]*>/g, ''), // strip HTML tags
        distance:    fmtDist(s.distance.value),
        distance_m:  s.distance.value,
        duration:    fmtDur(s.duration.value),
        duration_s:  s.duration.value,
        waypoint:    [s.end_location.lat(), s.end_location.lng()],
        maneuver:    s.maneuver || '',
      })
    }
  }

  // overview_path is an array of LatLng objects
  const polyline = route.overview_path.map(ll => [ll.lat(), ll.lng()])

  return {
    distance:         fmtDist(totalDist),
    distance_m:       totalDist,
    duration:         fmtDur(totalDur),
    duration_s:       totalDur,
    eta:              etaStr(totalDur),
    steps,
    polyline,
    directionsResult: result, // for DirectionsRenderer in MapView
  }
}

// orig, dest: {lat, lng}
// stops: [{lat, lng, name, id}, ...]
// mapsLoaded: boolean — from useJsApiLoader in App
export default function useRoute(orig, dest, mode, stops = [], mapsLoaded = false) {
  const [route,   setRoute]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const dead = useRef(false)

  useEffect(() => {
    if (!orig || !dest || !mapsLoaded) { setRoute(null); setLoading(false); setError(null); return }

    dead.current = false
    setLoading(true)
    setError(null)

    const travelMode =
      mode === 'drive' ? window.google.maps.TravelMode.DRIVING
      : mode === 'bike' ? window.google.maps.TravelMode.BICYCLING
      : window.google.maps.TravelMode.WALKING

    const waypoints = stops.map(s => ({
      location:  { lat: s.lat, lng: s.lng },
      stopover:  true,
    }))

    const service = new window.google.maps.DirectionsService()
    service.route(
      {
        origin:      { lat: orig.lat, lng: orig.lng },
        destination: { lat: dest.lat, lng: dest.lng },
        waypoints,
        travelMode,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (dead.current) return
        if (status === window.google.maps.DirectionsStatus.OK) {
          setRoute(parseDirections(result))
          setError(null)
        } else {
          setError(`Route error: ${status}`)
          setRoute(null)
        }
        setLoading(false)
      }
    )

    return () => { dead.current = true }
  }, [
    orig?.lat, orig?.lng,
    dest?.lat, dest?.lng,
    mode,
    mapsLoaded,
    JSON.stringify(stops.map(s => `${s.lat},${s.lng}`)),
  ])

  return { route, loading, error }
}
