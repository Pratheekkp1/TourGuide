import { useEffect, useRef, useState } from 'react'

function DetectionBox({ det, index }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Stagger entrance per box
    const t = setTimeout(() => setVisible(true), index * 40)
    return () => clearTimeout(t)
  }, [index])

  return (
    <div
      className="absolute transition-opacity duration-200"
      style={{
        left: `${det.x * 100}%`,
        top: `${det.y * 100}%`,
        width: `${det.w * 100}%`,
        height: `${det.h * 100}%`,
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Corner brackets — slightly larger for visibility */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/90"
        style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,255,0.5))' }} />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400/90"
        style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,255,0.5))' }} />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400/90"
        style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,255,0.5))' }} />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400/90"
        style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,255,0.5))' }} />

      {/* Mid-edge tick marks */}
      <div className="absolute top-1/2 left-0 w-1.5 h-px bg-cyan-400/40 -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-1.5 h-px bg-cyan-400/40 -translate-y-1/2" />
      <div className="absolute left-1/2 top-0 h-1.5 w-px bg-cyan-400/40 -translate-x-1/2" />
      <div className="absolute left-1/2 bottom-0 h-1.5 w-px bg-cyan-400/40 -translate-x-1/2" />

      {/* Label */}
      <div
        className="absolute -top-5 left-0 text-cyan-300/90 text-[8px] uppercase tracking-[0.15em] whitespace-nowrap bg-black/60 px-1 py-0.5"
        style={{ textShadow: '0 0 8px rgba(0,255,255,0.7)' }}
      >
        ENTITY {String(index + 1).padStart(2, '0')}
      </div>

      {/* Subtle fill */}
      <div className="absolute inset-0 bg-cyan-400/[0.04]" />
    </div>
  )
}

export default function DetectionOverlay({ detections = [] }) {
  const prevCount = useRef(0)

  // Key on count change to re-trigger entrance animations when people appear
  const key = detections.length !== prevCount.current
    ? Math.random()
    : undefined
  prevCount.current = detections.length

  if (!detections.length) return null

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
      {detections.map((det, i) => (
        <DetectionBox key={`${i}-${det.x}-${det.y}`} det={det} index={i} />
      ))}
    </div>
  )
}
