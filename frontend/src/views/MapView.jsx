import { useEffect, useRef, useState } from 'react'
import { GoogleMap, Polyline, OverlayView, Circle, useGoogleMap } from '@react-google-maps/api'

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0d0e17' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0e17' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
]

const CAT_COLORS = {
  landmark: '#f59e0b', art: '#ec4899', nature: '#10b981', food: '#f97316',
  cultural: '#a78bfa', medical: '#34d399', finance: '#60a5fa', safety: '#60a5fa',
  education: '#818cf8', entertainment: '#fb7185', sports: '#fbbf24',
  services: '#94a3b8', info: '#94a3b8', other: '#6b7280',
}

function PlaceMarker({ place, selected, onClick, onNavigate }) {
  const color = CAT_COLORS[place.category] || '#6b7280'
  const [popped, setPopped] = useState(false)

  const handleClick = (e) => {
    e.stopPropagation()
    if (!popped) {
      setPopped(true)
    } else {
      onClick()      // second tap → open full sheet
    }
  }

  const handleNavigate = (e) => {
    e.stopPropagation()
    setPopped(false)
    onNavigate(place)
  }

  const handleDismiss = (e) => {
    e.stopPropagation()
    setPopped(false)
  }

  return (
    <OverlayView
      position={{ lat: place.lat, lng: place.lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({ x: -14, y: -38 })}
    >
      <div style={{ position: 'relative', userSelect: 'none', width: 28 }}>

        {/* ── POPUP CARD ── */}
        {popped && (
          <div style={{
            position: 'absolute', bottom: 46, left: '50%',
            transform: 'translateX(-50%)',
            minWidth: 160, maxWidth: 220,
            background: 'rgba(9,10,18,0.97)',
            border: `1px solid ${color}40`,
            borderRadius: 14,
            boxShadow: `0 4px 24px rgba(0,0,0,0.7), 0 0 0 1px ${color}15 inset`,
            padding: '10px 12px',
            zIndex: 20,
            pointerEvents: 'auto',
          }}>
            {/* Arrow */}
            <div style={{
              position: 'absolute', bottom: -6, left: '50%',
              transform: 'translateX(-50%)',
              width: 10, height: 6,
              clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
              background: color + '60',
            }} />
            {/* Category dot + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{
                color: 'white', fontSize: 12, fontWeight: 700,
                fontFamily: 'system-ui,sans-serif', lineHeight: 1.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {place.name}
              </div>
            </div>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onPointerDown={handleNavigate}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${color}cc, ${color}99)`,
                  border: 'none', color: 'white',
                  fontSize: 11, fontWeight: 700, fontFamily: 'system-ui,sans-serif',
                  boxShadow: `0 2px 10px ${color}55`,
                }}
              >
                Navigate
              </button>
              <button
                onPointerDown={handleDismiss}
                style={{
                  padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11, fontFamily: 'system-ui,sans-serif',
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── PIN ── */}
        <div
          onClick={handleClick}
          style={{
            cursor: 'pointer',
            width: 28, height: 36,
            position: 'relative',
            filter: selected || popped
              ? `drop-shadow(0 0 6px ${color}aa) drop-shadow(0 2px 8px rgba(0,0,0,0.6))`
              : 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
            transition: 'filter 0.15s, transform 0.15s',
            transform: popped ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          {/* Teardrop SVG */}
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* White outer shell */}
            <path
              d="M14 1C7.925 1 3 5.925 3 12c0 7.5 11 23 11 23S25 19.5 25 12C25 5.925 20.075 1 14 1Z"
              fill="white"
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="0.5"
            />
            {/* Colored inner dot */}
            <circle cx="14" cy="12" r="5.5" fill={color} />
            {/* Shine */}
            <circle cx="11.5" cy="9.5" r="1.5" fill="rgba(255,255,255,0.55)" />
          </svg>
        </div>
      </div>
    </OverlayView>
  )
}

function StopMarker({ stop, idx }) {
  return (
    <OverlayView
      position={{ lat: stop.lat, lng: stop.lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({ x: -14, y: -38 })}
    >
      <div style={{ position: 'relative', userSelect: 'none', width: 28 }}>
        {/* Label above */}
        <div style={{
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(249,115,22,0.95)', color: 'white', borderRadius: 10,
          padding: '2px 7px', fontSize: 10, fontWeight: 700, fontFamily: 'system-ui,sans-serif',
          whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {stop.name.length > 16 ? stop.name.slice(0, 15) + '…' : stop.name}
        </div>
        {/* Pin */}
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(249,115,22,0.5))' }}>
          <path d="M14 1C7.925 1 3 5.925 3 12c0 7.5 11 23 11 23S25 19.5 25 12C25 5.925 20.075 1 14 1Z"
            fill="white" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
          <circle cx="14" cy="12" r="7" fill="#f97316" />
          <text x="14" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="800"
            fontFamily="system-ui,sans-serif">{idx + 1}</text>
        </svg>
      </div>
    </OverlayView>
  )
}

// Inject pulse keyframes once into <head> so OverlayView content can use them
const PULSE_CSS = `
  @keyframes tg-pulse { 0% { transform:scale(1); opacity:0.8; } 100% { transform:scale(3.5); opacity:0; } }
  @keyframes tg-glow  { 0%,100% { box-shadow:0 0 0 3px rgba(99,102,241,.4),0 0 18px rgba(99,102,241,.9); }
                        50%      { box-shadow:0 0 0 4px rgba(99,102,241,.6),0 0 28px rgba(99,102,241,1); } }
`
function injectPulseStyles() {
  const existing = document.getElementById('tg-pulse-styles')
  if (existing) { existing.textContent = PULSE_CSS; return }
  const s = document.createElement('style')
  s.id = 'tg-pulse-styles'
  s.textContent = PULSE_CSS
  document.head.appendChild(s)
}

// User beacon — uses raw google.maps.OverlayView for guaranteed rendering
function UserDot({ coords }) {
  const map = useGoogleMap()
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!map || !window.google) return
    injectPulseStyles()

    const hasHeading = coords.heading != null && !isNaN(coords.heading)

    // Build custom OverlayView class
    class LocationDot extends window.google.maps.OverlayView {
      constructor() { super(); this.el = null }

      onAdd() {
        const div = document.createElement('div')
        div.style.cssText = 'position:absolute;width:80px;height:80px;pointer-events:none'
        // Separate positioning wrapper from animation element so translate() isn't overridden by keyframes
        div.innerHTML = `
          <div style="position:relative;width:80px;height:80px;display:flex;align-items:center;justify-content:center">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">
              <div style="width:26px;height:26px;border-radius:50%;background:rgba(99,102,241,.6);animation:tg-pulse 2.4s ease-out infinite"></div>
            </div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">
              <div style="width:26px;height:26px;border-radius:50%;background:rgba(129,140,248,.45);animation:tg-pulse 2.4s ease-out infinite .8s"></div>
            </div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">
              <div style="width:26px;height:26px;border-radius:50%;background:rgba(165,180,252,.3);animation:tg-pulse 2.4s ease-out infinite 1.6s"></div>
            </div>
            ${hasHeading ? `<div style="position:absolute;top:50%;left:50%;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:14px solid rgba(129,140,248,.95);transform:translate(-50%,-100%) rotate(${coords.heading}deg);transform-origin:50% 100%"></div>` : ''}
            <div style="position:relative;z-index:10;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#a5b4fc,#6366f1,#4f46e5);border:3px solid white;animation:tg-glow 2s ease-in-out infinite"></div>
          </div>`
        this.el = div
        this.getPanes().overlayMouseTarget.appendChild(div)
      }

      draw() {
        if (!this.el) return
        const proj = this.getProjection()
        if (!proj) return
        const pt = proj.fromLatLngToDivPixel(this.pos)
        if (pt) {
          this.el.style.left = (pt.x - 40) + 'px'
          this.el.style.top  = (pt.y - 40) + 'px'
        }
      }

      onRemove() { this.el?.parentNode?.removeChild(this.el); this.el = null }

      updatePos(latLng) { this.pos = latLng; this.draw() }
    }

    const latLng = new window.google.maps.LatLng(coords.lat, coords.lng)

    if (!overlayRef.current) {
      const dot = new LocationDot()
      dot.pos = latLng
      dot.setMap(map)
      overlayRef.current = dot
    } else {
      overlayRef.current.updatePos(latLng)
    }

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
    }
  }, [map, coords.lat, coords.lng, coords.heading])

  // Accuracy circle still uses the React component (it works fine)
  return coords.accuracy && coords.accuracy < 300 ? (
    <Circle
      center={{ lat: coords.lat, lng: coords.lng }}
      radius={coords.accuracy}
      options={{
        fillColor: '#6366f1', fillOpacity: 0.07,
        strokeColor: '#818cf8', strokeOpacity: 0.35, strokeWeight: 1.5,
        clickable: false, zIndex: 1,
      }}
    />
  ) : null
}

export default function MapView({
  coords, places = [], selectedPlace, onSelectPlace, onNavigate,
  routePolyline, stops = [], followUser, onMapClick,
}) {
  const mapRef = useRef(null)
  const [following, setFollowing] = useState(false)
  const initializedRef = useRef(false)
  const cachedPos = (() => { try { const s = localStorage.getItem('tg_last_pos'); return s ? JSON.parse(s) : null } catch { return null } })()
  const center = coords
    ? { lat: coords.lat, lng: coords.lng }
    : cachedPos ? { lat: cachedPos.lat, lng: cachedPos.lng }
    : { lat: 40.7128, lng: -74.006 }

  useEffect(() => {
    if (!mapRef.current || !coords) return
    if (!initializedRef.current) {
      mapRef.current.setCenter({ lat: coords.lat, lng: coords.lng })
      initializedRef.current = true
    }
  }, [coords?.lat, coords?.lng])

  useEffect(() => {
    if (!mapRef.current || !coords) return
    if (followUser || following) {
      mapRef.current.panTo({ lat: coords.lat, lng: coords.lng })
    }
  }, [coords?.lat, coords?.lng, followUser, following])

  const recenter = () => {
    if (!mapRef.current || !coords) return
    mapRef.current.panTo({ lat: coords.lat, lng: coords.lng })
    mapRef.current.setZoom(17)
    setFollowing(true)
  }

  return (
    <div className="absolute inset-0">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={16}
        onLoad={map => { mapRef.current = map; if (coords) map.setCenter({ lat: coords.lat, lng: coords.lng }) }}
        onClick={onMapClick}
        onDragStart={() => setFollowing(false)}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          isFractionalZoomEnabled: false,
          mapId: undefined,
        }}
      >
        {coords && <UserDot coords={coords} />}

        {places.slice(0, 10).map(p => (
          <PlaceMarker
            key={p.id} place={p}
            selected={selectedPlace?.id === p.id}
            onClick={() => onSelectPlace?.(p)}
            onNavigate={onNavigate}
          />
        ))}

        {stops.map((s, i) => (
          <StopMarker key={`stop-${i}`} stop={s} idx={i} />
        ))}

        {routePolyline && routePolyline.length > 1 && (
          <Polyline
            key={routePolyline[0]?.join() + routePolyline[routePolyline.length - 1]?.join()}
            path={routePolyline.map(([lat, lng]) => ({ lat, lng }))}
            options={{
              strokeColor: '#818cf8',
              strokeWeight: 5,
              strokeOpacity: 0.9,
              geodesic: true,
              zIndex: 10,
            }}
          />
        )}
      </GoogleMap>

      {/* Locate Me FAB */}
      {coords && (
        <div style={{ position: 'absolute', right: 12, bottom: 180, zIndex: 1095 }}>
          <button onClick={recenter} style={{
            width: 48, height: 48, borderRadius: 14, cursor: 'pointer',
            background: following ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(9,10,18,0.95)',
            border: following ? '2px solid rgba(255,255,255,0.3)' : '1.5px solid rgba(99,102,241,0.5)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            backdropFilter: 'blur(20px)',
            boxShadow: following ? '0 4px 24px rgba(99,102,241,0.7)' : '0 4px 20px rgba(0,0,0,0.6)',
            transition: 'all 0.25s ease',
          }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3.5" fill={following ? 'white' : '#818cf8'} stroke="none" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={following ? 'white' : '#818cf8'} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            {following && <span style={{ color: 'white', fontSize: 8, fontWeight: 700, fontFamily: 'system-ui,sans-serif', letterSpacing: 0.5, opacity: 0.85 }}>LIVE</span>}
          </button>
        </div>
      )}

      {/* Zoom controls */}
      <div style={{ position: 'absolute', right: 12, top: 100, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[{ l: '+', f: () => mapRef.current?.setZoom((mapRef.current.getZoom() || 16) + 1) },
          { l: '−', f: () => mapRef.current?.setZoom((mapRef.current.getZoom() || 16) - 1) }].map(({ l, f }) => (
          <button key={l} onClick={f} style={{
            width: 40, height: 40, background: 'rgba(13,14,23,0.92)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            color: 'rgba(255,255,255,0.8)', fontSize: 20, fontWeight: 300,
            fontFamily: 'system-ui,sans-serif',
          }}>{l}</button>
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 85% at 50% 50%, transparent 50%, rgba(7,8,16,0.3) 100%)',
      }} />
    </div>
  )
}
