import { useEffect, useRef, useState, useCallback } from 'react'
import { useLang, t } from '../i18n'

const API_URL = import.meta.env.VITE_API_URL ?? ''

const CAT_COLORS = {
  landmark: '#f59e0b', food: '#f97316', sign: '#60a5fa', building: '#34d399',
  nature: '#10b981', artwork: '#ec4899', person: '#818cf8', object: '#94a3b8', other: '#a78bfa',
}

function speak(text, lang) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang; u.rate = 0.92
  const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(lang))
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}

// Map screen coords → video pixel coords (accounts for object-cover letterboxing)
function screenToVideo(sx, sy, containerW, containerH, videoW, videoH) {
  const scale = Math.max(containerW / videoW, containerH / videoH)
  const dispW  = videoW * scale
  const dispH  = videoH * scale
  const offX   = (containerW - dispW) / 2
  const offY   = (containerH - dispH) / 2
  return {
    x: Math.round((sx - offX) / scale),
    y: Math.round((sy - offY) / scale),
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// ── SELECTION BOX OVERLAY ────────────────────────────────────────────────────
function SelectionBox({ box, containerRef, onConfirm, onClear, loading }) {
  if (!box) return null
  const { x1, y1, x2, y2 } = box
  const left   = Math.min(x1, x2)
  const top    = Math.min(y1, y2)
  const width  = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)
  if (width < 20 || height < 20) return null

  const accent = '#6366f1'
  const handleSz = 22

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }}>
      {/* Darkened surrounds */}
      {/* top */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height: top, background:'rgba(0,0,0,0.55)' }}/>
      {/* bottom */}
      <div style={{ position:'absolute', top: top+height, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.55)' }}/>
      {/* left */}
      <div style={{ position:'absolute', top, left:0, width: left, height, background:'rgba(0,0,0,0.55)' }}/>
      {/* right */}
      <div style={{ position:'absolute', top, left: left+width, right:0, height, background:'rgba(0,0,0,0.55)' }}/>

      {/* Selection rect */}
      <div style={{
        position: 'absolute', left, top, width, height,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 0 1px rgba(99,102,241,0.25), inset 0 0 0 1px rgba(99,102,241,0.1)`,
      }}>
        {/* Animated marching dashes */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `repeating-linear-gradient(90deg, ${accent}80 0, ${accent}80 8px, transparent 8px, transparent 16px),
            repeating-linear-gradient(180deg, ${accent}80 0, ${accent}80 8px, transparent 8px, transparent 16px),
            repeating-linear-gradient(90deg, ${accent}80 0, ${accent}80 8px, transparent 8px, transparent 16px),
            repeating-linear-gradient(180deg, ${accent}80 0, ${accent}80 8px, transparent 8px, transparent 16px)`,
          backgroundSize: '100% 2px, 2px 100%, 100% 2px, 2px 100%',
          backgroundPosition: 'top, right, bottom, left',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
        }}/>

        {/* Corner handles — sized for touch */}
        {[
          { style:{ top:-1, left:-1 }, borders:'border-t-2 border-l-2' },
          { style:{ top:-1, right:-1 }, borders:'border-t-2 border-r-2' },
          { style:{ bottom:-1, left:-1 }, borders:'border-b-2 border-l-2' },
          { style:{ bottom:-1, right:-1 }, borders:'border-b-2 border-r-2' },
        ].map((h, i) => (
          <div key={i} className={`absolute ${h.borders}`}
            style={{ ...h.style, width: handleSz, height: handleSz, borderColor: accent }} />
        ))}

        {/* Centre crosshair */}
        <div style={{
          position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          width:20, height:20, opacity:0.6,
        }}>
          <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:accent, transform:'translateY(-50%)' }}/>
          <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:accent, transform:'translateX(-50%)' }}/>
        </div>
      </div>

      {/* Action buttons — positioned below box, or above if near bottom */}
      <div
        className="pointer-events-auto"
        style={{
          position: 'absolute',
          left: clamp(left + width/2 - 110, 8, window.innerWidth - 228),
          top: top + height + 12 < window.innerHeight - 100
            ? top + height + 12
            : top - 60,
          display: 'flex', gap: 8,
        }}
      >
        <button
          onPointerDown={e => { e.stopPropagation(); onClear() }}
          style={{
            height: 44, paddingLeft: 16, paddingRight: 16,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
            color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600,
            fontFamily: 'system-ui,sans-serif', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Clear
        </button>
        <button
          onPointerDown={e => { e.stopPropagation(); onConfirm() }}
          disabled={loading}
          style={{
            height: 44, paddingLeft: 20, paddingRight: 20,
            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
            color: 'white', fontSize: 13, fontWeight: 700,
            fontFamily: 'system-ui,sans-serif', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.5)',
            minWidth: 130,
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                animation: 'spin 0.7s linear infinite',
              }}/>
              Scanning…
            </>
          ) : (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Identify Selection
            </>
          )}
        </button>
      </div>
    </div>
  )
}

const FLAG_ICONS = {
  safety:        '⚠️',
  social_norm:   '🤝',
  etiquette:     '🙏',
  navigation:    '🧭',
  pricing:       '💰',
  language:      '🗣️',
  accessibility: '♿',
}
const FLAG_COLORS = {
  safety:        '#ef4444',
  social_norm:   '#818cf8',
  etiquette:     '#f59e0b',
  navigation:    '#34d399',
  pricing:       '#f97316',
  language:      '#60a5fa',
  accessibility: '#a78bfa',
}
const SIG_DOT = { high:'#f97316', moderate:'#818cf8', low:'#94a3b8' }

// ── RESULT PANEL ─────────────────────────────────────────────────────────────
function ResultPanel({ result, previewUrl, onClose, onRescan, language }) {
  const [speaking, setSpeaking] = useState(false)
  const [expanded, setExpanded] = useState(null) // index of expanded other_item

  const focus  = result.main_focus
  const accent = CAT_COLORS[focus?.category] || '#a78bfa'

  // Build speak text from entire result
  const buildSpeakText = () => {
    const parts = [result.scene_summary]
    if (focus) {
      parts.push(focus.name, focus.description, focus.local_context, focus.visitor_tip && `Tip: ${focus.visitor_tip}`)
    }
    for (const item of (result.other_items || [])) {
      parts.push(`${item.name}: ${item.description}`)
    }
    for (const flag of (result.situation_flags || [])) {
      parts.push(flag.message)
    }
    return parts.filter(Boolean).join('. ')
  }

  const handleSpeak = () => {
    const text = buildSpeakText()
    setSpeaking(true)
    speak(text, language)
    setTimeout(() => setSpeaking(false), Math.max(4000, text.length * 55))
  }

  const ss = (style) => ({ fontFamily: 'system-ui,-apple-system,sans-serif', ...style })

  return (
    <div style={{ position:'absolute', inset:0, zIndex:50, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      {/* Backdrop — tap to close */}
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.25)', backdropFilter:'blur(1px)' }} onClick={onClose}/>

      {/* Preview thumbnail */}
      {previewUrl && (
        <div style={{ position:'absolute', bottom:'calc(68vh + 14px)', left:'50%', transform:'translateX(-50%)', zIndex:52 }}>
          <div style={{ borderRadius:10, overflow:'hidden', border:`2px solid ${accent}`, boxShadow:`0 4px 24px rgba(0,0,0,0.7), 0 0 0 3px ${accent}20`, maxWidth:160, maxHeight:100 }}>
            <img src={previewUrl} alt="scan" style={{ display:'block', width:'100%', objectFit:'cover' }}/>
          </div>
        </div>
      )}

      {/* Sheet */}
      <div style={{
        position:'relative', zIndex:51, background:'#08090e',
        borderRadius:'22px 22px 0 0', border:'1px solid rgba(255,255,255,0.07)',
        borderBottom:'none', boxShadow:`0 -8px 48px rgba(0,0,0,0.8)`,
        maxHeight:'70vh', display:'flex', flexDirection:'column',
      }}>
        {/* Top accent line */}
        <div style={{ height:3, background:`linear-gradient(90deg,transparent,${accent},transparent)`, borderRadius:'3px 3px 0 0', flexShrink:0 }}/>

        {/* Handle + header controls */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 18px 6px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'center', flex:1 }}>
            <div style={{ width:36, height:4, borderRadius:4, background:'rgba(255,255,255,0.1)' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleSpeak} disabled={speaking} style={ss({
              width:36, height:36, borderRadius:'50%', border:'1px solid',
              borderColor: speaking ? accent : 'rgba(255,255,255,0.12)',
              background: speaking ? `${accent}20` : 'rgba(255,255,255,0.04)',
              color: speaking ? accent : 'rgba(255,255,255,0.45)',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
            })}>
              {speaking
                ? <div style={{ width:7, height:7, borderRadius:'50%', background:accent, animation:'ping 1s infinite' }}/>
                : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
            <button onClick={onClose} style={ss({
              width:36, height:36, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.1)',
              background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.4)',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
            })}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY:'auto', flex:1, padding:'0 18px 28px', WebkitOverflowScrolling:'touch' }}>

          {/* ── SCENE SUMMARY ── */}
          <div style={{ marginBottom:16 }}>
            <div style={ss({ fontSize:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.3)', fontWeight:600, marginBottom:6 })}>
              Scene Overview
            </div>
            <p style={ss({ color:'rgba(255,255,255,0.75)', fontSize:14, lineHeight:1.65, margin:0 })}>
              {result.scene_summary}
            </p>
          </div>

          {/* ── SITUATION FLAGS ── */}
          {result.situation_flags?.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
              {result.situation_flags.map((f, i) => {
                const col = FLAG_COLORS[f.type] || '#818cf8'
                return (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, borderRadius:10, padding:'9px 12px', background:`${col}12`, border:`1px solid ${col}25` }}>
                    <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{FLAG_ICONS[f.type] || '⚡'}</span>
                    <p style={ss({ color:`${col}ee`, fontSize:12, lineHeight:1.55, margin:0 })}>{f.message}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── MAIN FOCUS ── */}
          {focus && (
            <div style={{ marginBottom:16, borderRadius:14, background:`${accent}0e`, border:`1px solid ${accent}25`, overflow:'hidden' }}>
              <div style={{ padding:'12px 14px 0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={ss({ fontSize:9, textTransform:'uppercase', letterSpacing:'0.14em', color:accent, fontWeight:700 })}>
                    Main Focus
                  </div>
                  <div style={{ flex:1, height:1, background:`${accent}25` }}/>
                  {focus.confidence === 'low' && (
                    <span style={ss({ fontSize:9, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.08em' })}>uncertain</span>
                  )}
                </div>
                <div style={ss({ color:'white', fontSize:18, fontWeight:700, lineHeight:1.25, marginBottom:8 })}>{focus.name}</div>
                <p style={ss({ color:'rgba(255,255,255,0.78)', fontSize:13, lineHeight:1.65, marginBottom:10 })}>{focus.description}</p>
              </div>

              {focus.local_context && (
                <div style={{ margin:'0 14px 10px', borderRadius:10, padding:'9px 12px', background:`${accent}15`, borderLeft:`2.5px solid ${accent}70` }}>
                  <p style={ss({ color:`${accent}dd`, fontSize:12, lineHeight:1.6, margin:0 })}>{focus.local_context}</p>
                </div>
              )}

              {focus.visitor_tip && (
                <div style={{ margin:'0 14px 14px', borderRadius:10, padding:'9px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div style={ss({ fontSize:9, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.28)', fontWeight:600, marginBottom:4 })}>Visitor Tip</div>
                  <p style={ss({ color:'rgba(255,255,255,0.65)', fontSize:12, lineHeight:1.6, margin:0 })}>{focus.visitor_tip}</p>
                </div>
              )}
            </div>
          )}

          {/* ── OTHER ITEMS ── */}
          {result.other_items?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={ss({ fontSize:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.3)', fontWeight:600, marginBottom:8 })}>
                Also Detected · {result.other_items.length} item{result.other_items.length !== 1 ? 's' : ''}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {result.other_items.map((item, i) => {
                  const col   = CAT_COLORS[item.category] || '#94a3b8'
                  const dotCol = SIG_DOT[item.significance] || '#94a3b8'
                  const open  = expanded === i
                  return (
                    <div key={i} style={{ borderRadius:12, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', background:'rgba(255,255,255,0.025)' }}>
                      <button
                        onClick={() => setExpanded(open ? null : i)}
                        style={ss({
                          width:'100%', padding:'10px 12px', display:'flex', alignItems:'center', gap:10,
                          background:'transparent', border:'none', cursor:'pointer', textAlign:'left',
                        })}
                      >
                        {/* Significance dot */}
                        <div style={{ width:8, height:8, borderRadius:'50%', background:dotCol, flexShrink:0, boxShadow:`0 0 6px ${dotCol}80` }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={ss({ color:'rgba(255,255,255,0.85)', fontSize:13, fontWeight:600, lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' })}>
                            {item.name}
                          </div>
                          <div style={ss({ color:'rgba(255,255,255,0.3)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:1 })}>
                            {item.category}
                          </div>
                        </div>
                        <svg width="12" height="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" viewBox="0 0 24 24"
                          style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>

                      {open && (
                        <div style={{ padding:'0 12px 12px' }}>
                          <p style={ss({ color:'rgba(255,255,255,0.65)', fontSize:12, lineHeight:1.65, margin:'0 0 8px' })}>
                            {item.description}
                          </p>
                          {item.visitor_tip && (
                            <div style={{ borderRadius:8, padding:'7px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                              <p style={ss({ color:'rgba(255,255,255,0.5)', fontSize:11, lineHeight:1.55, margin:0 })}>💡 {item.visitor_tip}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── RESCAN ── */}
          <button onClick={onRescan} style={ss({
            width:'100%', height:46,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)',
            borderRadius:13, color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:600,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          })}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Scan Another Region
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN CAMERA VIEW ──────────────────────────────────────────────────────────
export default function CameraView({ coords, locationName, language, onClose }) {
  const lang = useLang()
  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const containerRef = useRef(null)
  const streamRef    = useRef(null)

  const [ready,   setReady]   = useState(false)
  const [box,     setBox]     = useState(null)     // { x1,y1,x2,y2 } screen coords
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [preview, setPreview] = useState(null)     // cropped data URL

  const dragging   = useRef(false)
  const dragStart  = useRef(null)

  // Start rear camera
  useEffect(() => {
    let mounted = true
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      })
      .catch(console.error)
    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // Capture full frame → crop to selection → return blob + data URL
  const captureSelection = useCallback((selBox) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!video || !canvas || !video.videoWidth || !container) return null

    const cW = container.clientWidth
    const cH = container.clientHeight
    const vW = video.videoWidth
    const vH = video.videoHeight

    // Convert screen coords to video coords
    const tl = screenToVideo(Math.min(selBox.x1, selBox.x2), Math.min(selBox.y1, selBox.y2), cW, cH, vW, vH)
    const br = screenToVideo(Math.max(selBox.x1, selBox.x2), Math.max(selBox.y1, selBox.y2), cW, cH, vW, vH)

    const cropX = clamp(tl.x, 0, vW)
    const cropY = clamp(tl.y, 0, vH)
    const cropW = clamp(br.x - tl.x, 1, vW - cropX)
    const cropH = clamp(br.y - tl.y, 1, vH - cropY)

    canvas.width  = cropW
    canvas.height = cropH
    canvas.getContext('2d').drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve({ blob, dataUrl }), 'image/jpeg', 0.88)
    })
  }, [])

  // Resolve the most specific venue name at the user's exact GPS position
  // using Google Places nearbySearch with a tight 40m radius.
  // Falls back through progressively larger radii so indoor/campus spots are found.
  const resolveVenueContext = useCallback(async () => {
    if (!coords || !window.google?.maps?.places) return null
    const svc = new window.google.maps.places.PlacesService(document.createElement('div'))
    const center = new window.google.maps.LatLng(coords.lat, coords.lng)

    for (const radius of [40, 80, 150]) {
      const results = await new Promise(resolve => {
        svc.nearbySearch({ location: center, radius }, (res, status) => {
          resolve(status === window.google.maps.places.PlacesServiceStatus.OK ? res : [])
        })
      })
      if (results.length > 0) {
        // Sort by distance (closest first) — Places API doesn't sort by default
        const sorted = results.sort((a, b) => {
          const da = window.google.maps.geometry?.spherical?.computeDistanceBetween(center, a.geometry.location) ?? 9999
          const db = window.google.maps.geometry?.spherical?.computeDistanceBetween(center, b.geometry.location) ?? 9999
          return da - db
        })
        const top = sorted[0]
        // Build a rich context string: "McKeldin Library (university, University of Maryland College Park)"
        const types = top.types?.filter(t => !['point_of_interest','establishment'].includes(t)) ?? []
        const typeLabel = types.slice(0, 2).join(', ').replace(/_/g, ' ')
        const parts = [top.name]
        if (top.vicinity) parts.push(top.vicinity)
        if (typeLabel)   parts.push(`(${typeLabel})`)
        return { name: top.name, venue: parts.join(' — '), placeId: top.place_id }
      }
    }
    return null
  }, [coords])

  const handleIdentify = useCallback(async () => {
    if (!box || loading) return
    setLoading(true)
    try {
      // Capture image + resolve exact venue simultaneously
      const [captured, venue] = await Promise.all([
        captureSelection(box),
        resolveVenueContext(),
      ])
      if (!captured) return
      setPreview(captured.dataUrl)

      // Build location context string — as specific as possible
      let locationCtx = locationName || ''
      if (venue) {
        // e.g. "McKeldin Library — University of Maryland College Park (library, university)"
        locationCtx = venue.venue + (locationName ? `, ${locationName}` : '')
      }

      const form = new FormData()
      form.append('file', captured.blob, 'region.jpg')
      if (coords) { form.append('lat', coords.lat); form.append('lng', coords.lng) }
      form.append('location_name', locationCtx)
      form.append('language', language || 'en')
      // Pass venue name separately so backend can highlight it
      if (venue) form.append('venue_name', venue.name)

      const resp = await fetch(`${API_URL}/api/identify`, { method: 'POST', body: form })
      const data = await resp.json()
      setResult(data)
      setBox(null)
    } catch (err) {
      console.error('Identify error:', err)
    } finally {
      setLoading(false)
    }
  }, [box, loading, captureSelection, resolveVenueContext, coords, locationName, language])

  // ── Pointer events (works for both touch and mouse) ──────────────────────
  const getPos = (e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const onPointerDown = useCallback((e) => {
    if (result) return
    e.preventDefault()
    const pos = getPos(e)
    dragging.current  = true
    dragStart.current = pos
    setBox({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
  }, [result])

  const onPointerMove = useCallback((e) => {
    if (!dragging.current || !dragStart.current) return
    e.preventDefault()
    const pos = getPos(e)
    setBox({ x1: dragStart.current.x, y1: dragStart.current.y, x2: pos.x, y2: pos.y })
  }, [])

  const onPointerUp = useCallback((e) => {
    if (!dragging.current) return
    dragging.current = false
    // If tiny movement (tap), treat as full-frame scan
    const pos = getPos(e)
    const dx = Math.abs(pos.x - dragStart.current.x)
    const dy = Math.abs(pos.y - dragStart.current.y)
    if (dx < 20 && dy < 20) {
      // Full frame — set box to whole container
      const c = containerRef.current
      setBox({ x1: 0, y1: 0, x2: c.clientWidth, y2: c.clientHeight })
    }
  }, [])

  const clearBox = useCallback(() => {
    setBox(null)
    setResult(null)
    setPreview(null)
  }, [])

  return (
    <div className="absolute inset-0 bg-black" style={{ zIndex: 50 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
      `}</style>

      {/* Camera area */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ touchAction: 'none', userSelect: 'none', cursor: result ? 'default' : 'crosshair' }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.4s', pointerEvents: 'none' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}/>

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)',
        }}/>

        {/* Selection box overlay */}
        {!result && (
          <SelectionBox
            box={box}
            containerRef={containerRef}
            onConfirm={handleIdentify}
            onClear={clearBox}
            loading={loading}
          />
        )}

        {/* Bottom bar — avoids Dynamic Island/notch on iOS */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between pointer-events-none"
          style={{ zIndex: 40, padding: '16px 16px calc(16px + env(safe-area-inset-bottom))' }}>
          <button
            onPointerDown={e => { e.stopPropagation(); onClose() }}
            className="pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center transition-all"
            style={{ background:'rgba(0,0,0,0.65)', border:'1px solid rgba(255,255,255,0.18)' }}
          >
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          <div className="pointer-events-none flex flex-col items-center gap-1">
            {locationName && (
              <div style={{ background:'rgba(0,0,0,0.55)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:99, padding:'3px 12px' }}>
                <span style={{ color:'rgba(255,255,255,0.65)', fontSize:11, fontFamily:'system-ui,sans-serif' }}>{locationName}</span>
              </div>
            )}
          </div>

          {/* Mode label */}
          <div style={{ background:'rgba(0,0,0,0.55)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:99, padding:'4px 12px' }}>
            <span style={{ color:'rgba(129,140,248,0.9)', fontSize:10, fontFamily:'system-ui,sans-serif', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              {t(lang,'drag_select')}
            </span>
          </div>
        </div>

        {/* Loading spinner overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 45 }}>
            <div style={{
              background:'rgba(0,0,0,0.75)', backdropFilter:'blur(20px)',
              border:'1px solid rgba(99,102,241,0.3)', borderRadius:20,
              padding:'20px 32px', display:'flex', flexDirection:'column', alignItems:'center', gap:12,
            }}>
              <div style={{
                width:32, height:32, borderRadius:'50%',
                border:'3px solid rgba(99,102,241,0.25)', borderTopColor:'#818cf8',
                animation:'spin 0.7s linear infinite',
              }}/>
              <span style={{ color:'rgba(255,255,255,0.6)', fontSize:13, fontFamily:'system-ui,sans-serif', fontWeight:500 }}>
                {t(lang,'identifying')}
              </span>
            </div>
          </div>
        )}

        {/* Hint — no box yet */}
        {!box && !result && !loading && ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 35 }}>
            {/* Centre reticle */}
            <div style={{ position:'relative', width:72, height:72, marginBottom:20, opacity:0.5 }}>
              {[{t:0,l:0,b:'auto',r:'auto',bt:'border-t-2',bl:'border-l-2'},{t:0,l:'auto',b:'auto',r:0,bt:'border-t-2',bl:'border-r-2'},
                {t:'auto',l:0,b:0,r:'auto',bt:'border-b-2',bl:'border-l-2'},{t:'auto',l:'auto',b:0,r:0,bt:'border-b-2',bl:'border-r-2'}]
                .map((c,i)=>(
                <div key={i} className={`absolute ${c.bt} ${c.bl} border-white`}
                  style={{ width:20, height:20, top:c.t, left:c.l, bottom:c.b, right:c.r }}/>
              ))}
            </div>
            <div style={{
              background:'rgba(0,0,0,0.6)', backdropFilter:'blur(16px)',
              border:'1px solid rgba(255,255,255,0.1)', borderRadius:12,
              padding:'10px 18px', textAlign:'center',
            }}>
              <div style={{ color:'rgba(255,255,255,0.85)', fontSize:14, fontWeight:600, fontFamily:'system-ui,sans-serif', marginBottom:4 }}>
                {t(lang,'drag_hint')}
              </div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12, fontFamily:'system-ui,sans-serif' }}>
                {t(lang,'drag_sub')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Result panel (rendered over camera, outside drag area) */}
      {result && (
        <ResultPanel
          result={result}
          previewUrl={preview}
          language={language}
          onClose={clearBox}
          onRescan={clearBox}
        />
      )}
    </div>
  )
}
