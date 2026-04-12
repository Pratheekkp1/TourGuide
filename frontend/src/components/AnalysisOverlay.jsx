import { useEffect, useRef, useState } from 'react'

const DENSITY_ORDER = ['empty', 'private', 'small group', 'moderate crowd', 'crowded']

function HudCard({ color = 'green', label, children, glow = false }) {
  const styles = {
    green: {
      border: 'border-green-500/40',
      label: 'text-green-500/50',
      corner: 'border-green-400/60',
      shadow: 'rgba(0,255,70,0.06)',
    },
    cyan: {
      border: 'border-cyan-500/40',
      label: 'text-cyan-500/50',
      corner: 'border-cyan-400/60',
      shadow: 'rgba(0,255,255,0.06)',
    },
    purple: {
      border: 'border-purple-500/40',
      label: 'text-purple-500/50',
      corner: 'border-purple-400/60',
      shadow: 'rgba(160,80,255,0.06)',
    },
  }
  const s = styles[color]

  return (
    <div
      className={`relative bg-black/88 border ${s.border} px-3 py-2.5 backdrop-blur-md`}
      style={glow ? { boxShadow: `0 0 16px ${s.shadow}` } : undefined}
    >
      <div className={`absolute top-0 left-0 w-2.5 h-2.5 border-t border-l ${s.corner}`} />
      <div className={`absolute top-0 right-0 w-2.5 h-2.5 border-t border-r ${s.corner}`} />
      <div className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l ${s.corner}`} />
      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r ${s.corner}`} />
      <div className={`${s.label} text-[8px] uppercase tracking-[0.22em] mb-2 font-semibold`}>{label}</div>
      {children}
    </div>
  )
}

function ConfidenceBar({ value, color = 'green' }) {
  const bar = color === 'green' ? 'bg-green-400' : color === 'purple' ? 'bg-purple-400' : 'bg-cyan-400'
  const track = color === 'green' ? 'bg-green-900/50' : color === 'purple' ? 'bg-purple-900/50' : 'bg-cyan-900/50'
  return (
    <div className={`h-px w-full ${track} mt-2`}>
      <div className={`h-full ${bar} opacity-60 transition-all duration-500`} style={{ width: `${value}%` }} />
    </div>
  )
}

export default function AnalysisOverlay({ analysis, isAnalyzing }) {
  const { scene, people, activity } = analysis
  const prevScene = useRef(null)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (prevScene.current && prevScene.current !== scene.scene) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 500)
      return () => clearTimeout(t)
    }
    prevScene.current = scene.scene
  }, [scene.scene])

  const sceneColor =
    scene.confidence >= 55 ? 'text-green-200' :
    scene.confidence >= 35 ? 'text-yellow-300' :
    'text-orange-300'

  const densityIndex = DENSITY_ORDER.indexOf(people.density)

  return (
    <>
      {/* LEFT COLUMN — Environment + Activity */}
      <div className="absolute top-14 left-3 z-20 flex flex-col gap-2 mt-2 w-[190px]">

        {/* Environment */}
        <HudCard color="green" label="Environment" glow>
          <div className={`text-sm font-bold tracking-wide leading-snug transition-opacity duration-200 ${sceneColor} ${flash ? 'opacity-0' : 'opacity-100'}`}>
            {scene.scene}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-green-500/40 text-[8px] tabular-nums">{scene.confidence}% conf.</span>
            {isAnalyzing && (
              <span className="flex items-center gap-1 text-green-400/50 text-[8px] uppercase tracking-widest">
                <span className="w-1 h-1 rounded-full bg-green-400 animate-ping" />
                live
              </span>
            )}
          </div>
          <ConfidenceBar value={scene.confidence} color="green" />
          {scene.alternatives?.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {scene.alternatives.slice(0, 2).map((alt) => (
                <div key={alt.scene} className="flex justify-between text-[8px]">
                  <span className="text-green-600/60 truncate">{alt.scene}</span>
                  <span className="text-green-600/40 tabular-nums ml-2 shrink-0">{alt.confidence}%</span>
                </div>
              ))}
            </div>
          )}
        </HudCard>

        {/* Activity — only shown when detected */}
        {activity?.activity && (
          <HudCard color="purple" label="Activity">
            <div className="text-purple-200 text-sm font-bold leading-snug">{activity.activity}</div>
            <ConfidenceBar value={activity.confidence} color="purple" />
          </HudCard>
        )}
      </div>

      {/* RIGHT COLUMN — Entity scan */}
      <div className="absolute top-14 right-3 z-20 mt-2 w-[160px]">
        <HudCard color="cyan" label="Entity Scan" glow>
          <div className="flex items-baseline gap-1.5">
            <span className="text-cyan-200 text-3xl font-bold tabular-nums leading-none">{people.people_count}</span>
            <span className="text-cyan-500/50 text-[9px] uppercase tracking-wider pb-0.5">
              {people.people_count === 1 ? 'entity' : 'entities'}
            </span>
          </div>
          <div className="mt-2 text-cyan-500/50 text-[8px] uppercase tracking-widest">{people.social_state}</div>
          {/* Density segments */}
          <div className="mt-2 flex gap-0.5">
            {DENSITY_ORDER.map((d, i) => (
              <div
                key={d}
                title={d}
                className={`flex-1 h-0.5 rounded-full transition-all duration-400 ${
                  i <= densityIndex ? 'bg-cyan-400/80' : 'bg-cyan-900/40'
                }`}
              />
            ))}
          </div>
          <div className="mt-1.5 text-cyan-600/40 text-[8px] capitalize">{people.density}</div>
        </HudCard>
      </div>
    </>
  )
}
