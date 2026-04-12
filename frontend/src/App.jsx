import { useState, useCallback } from 'react'
import { LangContext } from './i18n'
import { useJsApiLoader } from '@react-google-maps/api'
import MapView from './views/MapView'
import CameraView from './views/CameraView'
import SearchBar from './components/SearchBar'
import PlaceSheet from './components/PlaceSheet'
import RoutePanel from './components/RoutePanel'
import NavigationOverlay from './components/NavigationOverlay'
import LanguageSelector from './components/LanguageSelector'
import useGeolocation from './hooks/useGeolocation'
import useNearby from './hooks/useNearby'
import useRoute from './hooks/useRoute'
import LeftPanel from './components/LeftPanel'

const GOOGLE_LIBS = ['places', 'geometry']

export default function App() {
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_LIBS,
  })

  const [appMode,    setAppMode]    = useState('map')
  const [selected,   setSelected]   = useState(null)
  const [language,   setLanguage]   = useState('en')
  const [routeDest,  setRouteDest]  = useState(null)
  const [routeMode,  setRouteMode]  = useState('walk')
  const [routeStops, setRouteStops] = useState([])
  const [navigating, setNavigating] = useState(false)

  const { coords, locationName, status: geoStatus } = useGeolocation()

  // Nearby places — only fetched when not routing
  const { places } = useNearby(routeDest ? null : coords)

  const { route, loading: routeLoading, error: routeError } = useRoute(
    coords, routeDest, routeMode, routeStops, mapsLoaded
  )

  const handleGetDirections = useCallback((place, mode) => {
    setRouteDest(place)
    if (mode) setRouteMode(mode)
    setSelected(null)
    setRouteStops([])
    setNavigating(false)
  }, [])

  const clearRoute = useCallback(() => {
    setRouteDest(null)
    setRouteStops([])
    setNavigating(false)
  }, [])

  const addStop = useCallback((place) => {
    setRouteStops(prev => {
      if (prev.some(s => s.id === place.id)) return prev
      return [...prev, { lat: place.lat, lng: place.lng, name: place.name, id: place.id }]
    })
  }, [])

  const removeStop = useCallback((idx) => {
    setRouteStops(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const isRouting = !!routeDest

  if (!mapsLoaded) {
    return (
      <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center"
        style={{ background: '#070810', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <div className="text-white/40 text-sm">Loading maps…</div>
        </div>
      </div>
    )
  }

  return (
    <LangContext.Provider value={language}>
    <div className="relative w-screen h-screen overflow-hidden"
      style={{ background: '#070810', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* ── MAP MODE ── */}
      {appMode === 'map' && (
        <>
          <MapView
            coords={coords}
            places={isRouting ? [] : places}
            selectedPlace={isRouting ? null : selected}
            onSelectPlace={isRouting ? undefined : setSelected}
            onNavigate={isRouting ? undefined : handleGetDirections}
            routePolyline={isRouting ? (route?.polyline ?? null) : null}
            stops={routeStops}
            followUser={navigating}
            onMapClick={navigating ? undefined : () => {
              if (selected) setSelected(null)
              else if (isRouting) clearRoute()
            }}
          />

          {/* ── TOP BAR ── */}
          <div className="absolute top-0 left-0 right-0 px-4 pt-4 pointer-events-none" style={{ zIndex: 1100 }}>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3 pointer-events-auto"
              style={{ background: 'rgba(13,14,23,0.88)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
              <div className="relative shrink-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{
                  background: geoStatus === 'granted' ? '#6366f1' : geoStatus === 'denied' ? '#ef4444' : '#f59e0b'
                }} />
                {geoStatus === 'granted' && (
                  <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {geoStatus === 'granted' && locationName
                  ? <div className="text-white font-semibold text-sm truncate">{locationName}</div>
                  : geoStatus === 'requesting'
                  ? <div className="text-white/40 text-sm">Getting location…</div>
                  : geoStatus === 'denied'
                  ? <div className="text-red-400/70 text-sm">Location access denied</div>
                  : <div className="text-white/60 text-sm font-semibold">TourGuide</div>
                }
                {coords && geoStatus === 'granted' && (
                  <div className="text-white/30 text-[10px] tabular-nums">
                    {coords.lat.toFixed(4)}° {coords.lng.toFixed(4)}°
                  </div>
                )}
              </div>
              <div className="w-px h-8 bg-white/10 shrink-0" />
              <LanguageSelector value={language} onChange={setLanguage} />
            </div>
          </div>

          {/* ── GPS SPINNER ── */}
          {!coords && geoStatus === 'requesting' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1050 }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <div className="text-white/40 text-sm">Getting your location…</div>
              </div>
            </div>
          )}

          {/* ── SEARCH BAR ── */}
          {!isRouting && !navigating && (
            <SearchBar
              coords={coords}
              onSelectDestination={handleGetDirections}
              onCameraClick={() => { setSelected(null); setAppMode('camera') }}
            />
          )}

          {/* ── LEFT SIDE PANEL ── Scan, Nearby, SOS ── */}
          {!isRouting && !navigating && coords && (
            <LeftPanel
              coords={coords}
              places={places}
              locationName={locationName}
              onCameraClick={() => { setSelected(null); setAppMode('camera') }}
              onGetDirections={handleGetDirections}
            />
          )}

          {/* ── PLACE SHEET ── */}
          {selected && !navigating && (
            <PlaceSheet
              place={selected}
              language={language}
              locationName={locationName}
              onClose={() => setSelected(null)}
              onGetDirections={handleGetDirections}
            />
          )}

          {/* ── ROUTE PANEL ── */}
          {isRouting && !navigating && (
            <RoutePanel
              destination={routeDest}
              coords={coords}
              mode={routeMode}
              setMode={m => setRouteMode(m)}
              route={route}
              directionsResult={route?.directionsResult ?? null}
              loading={routeLoading}
              error={routeError}
              onClose={clearRoute}
              onCameraClick={() => { setSelected(null); setAppMode('camera') }}
              onStartNavigation={() => route && setNavigating(true)}
            />
          )}

          {/* ── NAVIGATION OVERLAY ── */}
          {navigating && route && (
            <NavigationOverlay
              route={route}
              destination={routeDest}
              coords={coords}
              mode={routeMode}
              stops={routeStops}
              onAddStop={addStop}
              onRemoveStop={removeStop}
              onExit={clearRoute}
            />
          )}
        </>
      )}

      {/* ── CAMERA MODE ── */}
      {appMode === 'camera' && (
        <CameraView
          coords={coords}
          locationName={locationName}
          language={language}
          onClose={() => setAppMode('map')}
        />
      )}
    </div>
    </LangContext.Provider>
  )
}
