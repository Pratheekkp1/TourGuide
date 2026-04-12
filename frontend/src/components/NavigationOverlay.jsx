import { useState, useEffect, useRef } from 'react'
import { useLang, t } from '../i18n'
import StopSearchPanel from './StopSearchPanel'

const ADVANCE_M = 25
const ANNOUNCE_M = 80

function haversine(lat1,lng1,lat2,lng2) {
  const R=6371000, p1=lat1*Math.PI/180, p2=lat2*Math.PI/180
  const a=Math.sin((lat2-lat1)*Math.PI/360)**2+Math.cos(p1)*Math.cos(p2)*Math.sin((lng2-lng1)*Math.PI/360)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

const fmtLive = m => {
  m = Math.round(m)
  if (m < 50)   return 'arriving'
  if (m < 1000) return `${Math.round(m/5)*5} m`
  return `${(m/1000).toFixed(1)} km`
}
const fmtRem = s => {
  s = Math.max(0,Math.round(s))
  if (s < 60) return `${s}s`
  const m = Math.floor(s/60)
  return m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60}m`
}
const fmtEta = s => {
  const t = new Date(); t.setSeconds(t.getSeconds()+Math.max(0,s))
  return t.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
}

function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1.0; window.speechSynthesis.speak(u)
}

function getTurnIcon(maneuver='') {
  if (!maneuver || maneuver.startsWith('depart'))   return '↑'
  if (maneuver.startsWith('arrive'))                return '⦿'
  if (maneuver.includes('roundabout')||maneuver.includes('rotary')) return '↻'
  if (maneuver.includes('uturn'))                   return '↩'
  if (maneuver.includes('fork-right')||maneuver.includes('ramp-right')) return '↗'
  if (maneuver.includes('fork-left') ||maneuver.includes('ramp-left'))  return '↖'
  if (maneuver.includes('right'))                   return '↱'
  if (maneuver.includes('left'))                    return '↰'
  return '↑'
}

function gmapsUrl(dest, mode) {
  const tm = mode==='drive'?'driving':mode==='bike'?'bicycling':'walking'
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=${tm}`
}

export default function NavigationOverlay({ route, destination, coords, mode, stops, onAddStop, onRemoveStop, onExit }) {
  const lang = useLang()
  const [stepIdx,    setStepIdx]    = useState(0)
  const [distToNext, setDistToNext] = useState(null)
  const [remSecs,    setRemSecs]    = useState(route?.duration_s ?? 0)
  const [arrived,    setArrived]    = useState(false)
  const [addStopOpen,setAddStopOpen]= useState(false)
  const announced = useRef(new Set())
  const steps = route?.steps ?? []
  const cur  = steps[stepIdx]
  const next = steps[stepIdx + 1]

  // Announce first step on mount
  useEffect(() => { if (cur) speak(cur.instruction) }, [])

  // Reset step index when route changes (e.g. stop added)
  useEffect(() => {
    setStepIdx(0)
    setArrived(false)
    announced.current = new Set()
    if (steps[0]) speak(steps[0].instruction)
  }, [route?.steps?.length, route?.distance_m])

  // Position tracking
  useEffect(() => {
    if (!coords || !steps.length || arrived) return
    const { lat, lng } = coords

    // Direct destination proximity check (catches GPS-jump or final-step skip)
    if (destination?.lat && destination?.lng) {
      const destDist = haversine(lat, lng, destination.lat, destination.lng)
      if (destDist < 50 && !announced.current.has('arrived')) {
        announced.current.add('arrived')
        setArrived(true)
        speak('You have arrived at your destination')
        return
      }
    }

    const targetIdx = Math.min(stepIdx + 1, steps.length - 1)
    const [tLat, tLng] = steps[targetIdx].waypoint
    const dist = haversine(lat, lng, tLat, tLng)
    setDistToNext(dist)

    const remDist = steps.slice(stepIdx).reduce((a,s)=>a+(s.distance_m||0),0)
    const spd = mode==='drive'?13.9:mode==='bike'?4.2:1.4
    setRemSecs(remDist/spd)

    if (dist < ADVANCE_M && stepIdx < steps.length - 1) {
      const ni = stepIdx + 1
      setStepIdx(ni)
      if (!announced.current.has(ni)) {
        announced.current.add(ni)
        speak(steps[ni].instruction)
      }
      if (ni === steps.length - 1) {
        setArrived(true)
        speak('You have arrived at your destination')
      }
      return
    }
    if (next && dist < ANNOUNCE_M && !announced.current.has(`pre-${stepIdx}`)) {
      announced.current.add(`pre-${stepIdx}`)
      speak(`In ${Math.round(dist)} meters, ${next.instruction}`)
    }
  }, [coords?.lat, coords?.lng])

  if (!cur) return null

  const accent = '#6366f1'
  const turnIcon = getTurnIcon(cur.maneuver)

  return (
    <>
      {/* ── TOP INSTRUCTION BANNER ── */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-4 pointer-events-none" style={{ zIndex: 1200 }}>
        <div style={{ height: 76 }} />
        <div
          className="rounded-2xl overflow-hidden pointer-events-auto"
          style={{
            background: arrived ? 'rgba(16,185,129,0.95)' : 'rgba(13,14,23,0.96)',
            backdropFilter: 'blur(24px)',
            border: `1px solid ${arrived ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Progress bar */}
          <div className="h-0.5 w-full" style={{ background:'rgba(255,255,255,0.05)' }}>
            <div className="h-full transition-all duration-1000" style={{
              width:`${Math.round((stepIdx/Math.max(steps.length-1,1))*100)}%`,
              background: arrived ? 'rgba(255,255,255,0.6)' : accent,
            }}/>
          </div>

          <div className="px-4 py-3">
            {arrived ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏁</span>
                <div>
                  <div className="text-white font-bold text-lg">{t(lang,'arrived')}</div>
                  <div className="text-white/60 text-sm truncate">{destination?.name}</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold"
                    style={{ background:`${accent}25`, color:accent }}>
                    {turnIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    {distToNext !== null && (
                      <div className="text-2xl font-bold tabular-nums mb-0.5" style={{ color:accent }}>
                        {fmtLive(distToNext)}
                      </div>
                    )}
                    <div className="text-white text-sm font-semibold leading-snug">{cur.instruction}</div>
                  </div>
                </div>
                {next && (
                  <div className="mt-2.5 pt-2.5 flex items-center gap-2"
                    style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-white/30 text-xs">Then</span>
                    <span className="text-white/50 text-xs truncate">{next.instruction}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stop badges (shown when stops are active) */}
        {stops?.length > 0 && (
          <div className="flex gap-2 mt-2 pointer-events-auto flex-wrap">
            {stops.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.3)' }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background:'#f97316', color:'white' }}>{i+1}</span>
                <span className="text-white/70 text-xs truncate max-w-24">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAVIGATION BAR ── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pointer-events-auto"
        style={{ paddingBottom:'max(16px,env(safe-area-inset-bottom))', zIndex: 1200 }}>
        <div className="rounded-2xl px-4 py-3"
          style={{ background:'rgba(13,14,23,0.96)', backdropFilter:'blur(24px)',
            border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 -4px 32px rgba(0,0,0,0.5)' }}>

          {!arrived ? (
            <div className="flex items-center gap-2">
              {/* ETA */}
              <div className="flex-1">
                <div className="text-white font-bold text-xl tabular-nums">{fmtRem(remSecs)}</div>
                <div className="text-white/35 text-xs tabular-nums">
                  ETA {fmtEta(remSecs)} · {route.distance}
                </div>
              </div>

              {/* Add Stop button */}
              <button
                onClick={() => setAddStopOpen(true)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95"
                style={{ background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.35)', color:'#fb923c' }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Stop
              </button>

              {/* Google Maps */}
              <a href={gmapsUrl(destination,mode)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium"
                style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.6)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                </svg>
                Maps
              </a>

              {/* Exit */}
              <button onClick={onExit}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'rgba(239,68,68,0.9)' }}>
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                Exit
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-white/50 text-sm">Navigation complete</div>
              <div className="flex gap-2">
                <a href={gmapsUrl(destination,mode)} target="_blank" rel="noopener noreferrer"
                  className="rounded-xl px-3 py-2 text-xs font-medium"
                  style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.7)' }}>
                  Open Maps
                </a>
                <button onClick={onExit} className="rounded-xl px-4 py-2 text-xs font-semibold"
                  style={{ background:accent, color:'white' }}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ADD STOP PANEL ── */}
      {addStopOpen && (
        <StopSearchPanel
          coords={coords}
          stops={stops ?? []}
          onAddStop={p => { onAddStop(p); }}
          onRemoveStop={i => onRemoveStop(i)}
          onClose={() => setAddStopOpen(false)}
        />
      )}
    </>
  )
}
