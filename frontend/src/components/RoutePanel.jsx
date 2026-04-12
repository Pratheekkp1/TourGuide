import PlacesAlongRoute from './PlacesAlongRoute'


const MODES = [
  {
    key: 'walk',
    label: 'Walk',
    icon: (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
        <path d="M8 21l2.5-7L8 11l3-3 3 3-2 2 1.5 5L16 21" />
      </svg>
    ),
  },
  {
    key: 'bike',
    label: 'Bike',
    icon: (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" />
        <path d="M12 17l2-5 3 3-4-9-2 5H5" />
      </svg>
    ),
  },
  {
    key: 'drive',
    label: 'Drive',
    icon: (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="1" y="10" width="22" height="8" rx="2" />
        <path d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
        <circle cx="7" cy="18" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="17" cy="18" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

const STEP_ICONS = {
  depart: '↑', arrive: '⦿',
  turn: '↩', fork: '⑂', merge: '⑁',
  'on ramp': '↗', 'off ramp': '↘',
  'new name': '→', continue: '↑',
  roundabout: '⟳', 'end of road': '↩',
}

export default function RoutePanel({ destination, coords, mode, setMode, route, directionsResult, loading, error, onClose, onCameraClick, onStartNavigation }) {
  const accent = '#6366f1'

  return (
    <div
      className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
      style={{ background: '#0d0e17', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)', zIndex: 1050 }}
    >
      {/* Accent bar */}
      <div className="h-0.5 w-full" style={{ background: accent }} />

      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-white/10" />
      </div>

      <div className="px-5 pb-safe max-h-[72vh] overflow-y-auto" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Directions to</div>
            <h2 className="text-white text-base font-semibold truncate">{destination?.name}</h2>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {onCameraClick && (
              <button
                onClick={onCameraClick}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
                title="Open camera"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 text-white/40 hover:text-white/70 transition-all"
              title="Close directions"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all"
              style={{
                background: mode === m.key ? `${accent}25` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${mode === m.key ? accent + '60' : 'rgba(255,255,255,0.08)'}`,
                color: mode === m.key ? accent : 'rgba(255,255,255,0.4)',
              }}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <div className="text-white/30 text-sm">Calculating route…</div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="py-6 text-center">
            <div className="text-white/30 text-sm">Could not find a route</div>
            <div className="text-white/15 text-xs mt-1">{error}</div>
          </div>
        )}

        {/* Route summary */}
        {route && !loading && (
          <>
            {/* Start Navigation button */}
            <button
              onClick={onStartNavigation}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 mb-4 text-sm font-bold transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
                color: 'white',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none" />
              </svg>
              Start Navigation
            </button>

            {/* ETA pill */}
            <div
              className="flex items-center justify-between rounded-2xl px-4 py-3 mb-4"
              style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
            >
              <div>
                <div className="text-white text-2xl font-bold" style={{ color: accent }}>{route.duration}</div>
                <div className="text-white/40 text-xs mt-0.5">{route.distance}</div>
              </div>
              <div className="text-right">
                <div className="text-white/50 text-xs uppercase tracking-wider">ETA</div>
                <div className="text-white/70 text-sm font-medium mt-0.5">{route.eta}</div>
              </div>
            </div>

            {/* Places along route */}
            <PlacesAlongRoute directionsResult={directionsResult} userCoords={coords} />

            {/* Steps */}
            <div className="space-y-0">
              {route.steps.map((step, i) => {
                const isLast = i === route.steps.length - 1
                const isFirst = i === 0
                const instr = step.instruction.toLowerCase()
                const icon = isLast ? '⦿'
                  : isFirst ? '↑'
                  : instr.includes('right') ? '↱'
                  : instr.includes('left') ? '↰'
                  : instr.includes('roundabout') ? '↻'
                  : instr.includes('ramp') || instr.includes('exit') ? '↗'
                  : instr.includes('u-turn') ? '↩'
                  : '↑'
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2.5"
                    style={{ borderBottom: !isLast ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold"
                      style={{
                        background: isLast ? `${accent}20` : 'rgba(255,255,255,0.05)',
                        color: isLast ? accent : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/80 text-sm leading-snug">{step.instruction}</div>
                      {step.distance && step.distance !== '0 m' && !isLast && (
                        <div className="text-white/30 text-xs mt-0.5">{step.distance}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
