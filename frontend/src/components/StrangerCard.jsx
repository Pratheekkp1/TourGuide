import { useState, useMemo } from 'react'
import { speak } from '../utils/elevenlabs'

const AREA_PROFILES = {
  tourist: {
    label: 'Tourist Zone', icon: '📸', color: '#f59e0b',
    tips: [
      'Prices here are 20–30% higher than local neighborhoods',
      'Staff are used to non-native speakers — don\'t hesitate to ask',
      'Watch your belongings in crowded spots',
    ],
  },
  university: {
    label: 'University Area', icon: '🎓', color: '#818cf8',
    tips: [
      'Student ID cards get discounts at many spots',
      'Casual dress is the norm — no need to dress up',
      'Expect noise and activity late into the night',
    ],
  },
  food: {
    label: 'Restaurant District', icon: '🍽️', color: '#f97316',
    tips: [
      'Look for lunch specials — same food, lower price',
      'Tipping 15–20% is expected at sit-down restaurants',
      'Reservations recommended for dinner after 7pm',
    ],
  },
  business: {
    label: 'Business District', icon: '🏢', color: '#60a5fa',
    tips: [
      'Much quieter on weekends — some shops may be closed',
      'Lunch spots fill up 12–1pm, go early or late',
      'Business casual dress is the norm here',
    ],
  },
  residential: {
    label: 'Local Neighborhood', icon: '🏘️', color: '#34d399',
    tips: [
      'You\'re off the tourist trail — this is how locals live',
      'Noise after 10pm is not appreciated here',
      'Fewer card readers — carry some cash',
    ],
  },
  nature: {
    label: 'Park / Nature Area', icon: '🌿', color: '#10b981',
    tips: [
      'Stay on marked paths and respect the environment',
      'Limited services — grab snacks before you enter',
      'Weather can change fast — layer up',
    ],
  },
  mixed: {
    label: 'Mixed Area', icon: '🗺️', color: '#a78bfa',
    tips: [
      'Explore side streets for more authentic options',
      'Public transport links are usually good here',
      'This area has a good mix of local and visitor spots',
    ],
  },
}

function getTimeCtx() {
  const h = new Date().getHours()
  if (h >= 5  && h < 10)  return { label: 'Early morning', emoji: '🌅', tip: 'Cafes and bakeries are your best bet right now' }
  if (h >= 10 && h < 12)  return { label: 'Mid-morning',   emoji: '☀️', tip: 'Great time to visit popular spots before crowds' }
  if (h >= 12 && h < 14)  return { label: 'Lunch rush',    emoji: '🕛', tip: 'Restaurants are busy — go early or wait 30 min' }
  if (h >= 14 && h < 17)  return { label: 'Afternoon',     emoji: '🌤', tip: 'Museums and shops are at full capacity' }
  if (h >= 17 && h < 19)  return { label: 'Evening rush',  emoji: '🌆', tip: 'Peak commute — streets and transit are crowded' }
  if (h >= 19 && h < 22)  return { label: 'Dinner time',   emoji: '🌃', tip: 'Popular spots may have a wait — plan ahead' }
  return { label: 'Late night', emoji: '🌙', tip: 'Stick to well-lit streets and keep transport handy' }
}

function classifyArea(places) {
  if (!places?.length) return 'mixed'
  const tally = {}
  for (const p of places) { const c = p.category || 'other'; tally[c] = (tally[c] || 0) + 1 }
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (['food', 'cafe'].includes(top)) return 'food'
  if (['education'].includes(top)) return 'university'
  if (['landmark', 'cultural', 'art', 'entertainment'].includes(top)) return 'tourist'
  if (['finance', 'services'].includes(top)) return 'business'
  if (['nature'].includes(top)) return 'nature'
  if (['medical', 'safety'].includes(top)) return 'residential'
  return 'mixed'
}

function speakLocation(locationName) {
  if (!locationName) return
  speak(`You are currently in ${locationName}`)
}

export default function StrangerCard({ places, locationName, onCameraClick }) {
  const [showTips, setShowTips] = useState(false)
  const areaKey = useMemo(() => classifyArea(places), [places])
  const profile  = AREA_PROFILES[areaKey]
  const timeCtx  = getTimeCtx()

  return (
    <div
      className="absolute left-0 right-0 px-3 pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)', zIndex: 1090 }}
    >
      {/* ── MAIN CARD ── always visible ── */}
      <div
        className="rounded-2xl overflow-hidden pointer-events-auto"
        style={{
          background: 'rgba(9,10,18,0.95)',
          backdropFilter: 'blur(24px)',
          border: `1px solid ${profile.color}30`,
          boxShadow: `0 -4px 32px rgba(0,0,0,0.6), 0 0 0 1px ${profile.color}10 inset`,
        }}
      >
        {/* ── TIPS DRAWER (top, only when expanded) ── */}
        {showTips && (
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-3 font-semibold" style={{ color: profile.color + 'cc' }}>
              Blend In Tips
            </div>
            {profile.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2"
                style={{ borderBottom: i < profile.tips.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold"
                  style={{ background: `${profile.color}25`, color: profile.color }}>{i + 1}</div>
                <div className="text-white/70 text-xs leading-relaxed">{tip}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── MAIN ROW ── area + time always visible ── */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Area badge */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: `${profile.color}20`, border: `1px solid ${profile.color}30` }}>
            {profile.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm leading-tight">{profile.label}</div>
            <div className="text-white/40 text-xs mt-0.5 truncate">{timeCtx.emoji} {timeCtx.tip}</div>
          </div>
          {/* Tips toggle */}
          <button
            onClick={() => setShowTips(v => !v)}
            className="shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all"
            style={{
              background: showTips ? `${profile.color}25` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${showTips ? profile.color + '50' : 'rgba(255,255,255,0.1)'}`,
              color: showTips ? profile.color : 'rgba(255,255,255,0.4)',
            }}
          >
            Tips
          </button>
        </div>

        {/* ── ACTION ROW ── always visible ── */}
        <div className="flex gap-2 px-4 pb-4">
          {/* Speak Location */}
          <button
            onClick={() => speakLocation(locationName)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            Speak Location
          </button>
          {/* Scan Area */}
          <button
            onClick={onCameraClick}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
              color: 'white',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Scan Area
          </button>
        </div>
      </div>
    </div>
  )
}
