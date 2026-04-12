import { useState } from 'react'

const CATEGORY_COLORS = {
  landmark: '#f59e0b', art: '#ec4899', nature: '#10b981',
  food: '#f97316', cultural: '#a78bfa', medical: '#34d399',
  finance: '#60a5fa', safety: '#60a5fa', education: '#818cf8',
  entertainment: '#fb7185', sports: '#fbbf24', services: '#94a3b8',
  info: '#94a3b8', other: '#6b7280',
}

const CATEGORY_ICONS = {
  landmark: '★', art: '◑', nature: '♦', food: '●',
  cultural: '◎', medical: '+', finance: '$', safety: '⬡',
  education: '▣', entertainment: '▶', sports: '◉',
  services: '◧', info: 'i', other: '·',
}

const FILTERS = [
  { label: 'All',         cats: null },
  { label: 'Landmarks',   cats: ['landmark', 'art'] },
  { label: 'Food',        cats: ['food'] },
  { label: 'Nature',      cats: ['nature', 'sports'] },
  { label: 'Culture',     cats: ['cultural', 'education', 'entertainment'] },
  { label: 'Services',    cats: ['medical', 'finance', 'safety', 'services', 'info'] },
]

function PlaceRow({ place, onSelect }) {
  const color = CATEGORY_COLORS[place.category] || '#6b7280'
  const icon = CATEGORY_ICONS[place.category] || '·'
  return (
    <button
      onClick={() => onSelect(place)}
      className="w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18` }}>
        <span className="text-base font-bold" style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm truncate">{place.name}</div>
        <div className="text-white/40 text-xs mt-0.5">{place.type_label}</div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <div className="text-white/50 text-xs tabular-nums font-medium">{place.distance_label}</div>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      </div>
    </button>
  )
}

// Horizontal scrollable card strip shown when sheet is collapsed
function PlaceStrip({ places, onSelect }) {
  if (!places.length) return null
  return (
    <div className="overflow-x-auto scrollbar-hide px-4 pb-3 pt-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div className="flex gap-2.5" style={{ width: 'max-content' }}>
        {places.slice(0, 10).map(place => {
          const color = CATEGORY_COLORS[place.category] || '#6b7280'
          const icon = CATEGORY_ICONS[place.category] || '·'
          return (
            <button
              key={place.id}
              onClick={() => onSelect(place)}
              className="flex flex-col items-start rounded-2xl p-3 transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                width: 140, flexShrink: 0,
              }}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}20` }}>
                  <span className="text-sm font-bold" style={{ color }}>{icon}</span>
                </div>
                <span className="text-white/30 text-[10px] tabular-nums">{place.distance_label}</span>
              </div>
              <div className="text-white font-semibold text-xs leading-snug line-clamp-2 text-left">
                {place.name}
              </div>
              <div className="text-white/35 text-[10px] mt-1 truncate w-full text-left">
                {place.type_label}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function NearbyList({ places, loading, onSelectPlace, sheetOpen, setSheetOpen }) {
  const [activeFilter, setActiveFilter] = useState(0)

  const filtered = FILTERS[activeFilter].cats
    ? places.filter(p => FILTERS[activeFilter].cats.includes(p.category))
    : places

  return (
    <div
      className="absolute bottom-0 left-0 right-0 rounded-t-3xl transition-transform duration-300 ease-out"
      style={{
        background: '#0d0e17',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.6)',
        transform: sheetOpen ? 'translateY(0)' : 'translateY(calc(100% - 148px))',
        zIndex: 1000,
      }}
    >
      {/* Handle bar */}
      <div className="flex justify-center pt-2.5 pb-1">
        <div className="w-9 h-1 rounded-full bg-white/15" />
      </div>

      {/* Header row — always visible */}
      <button
        className="w-full flex items-center justify-between px-5 py-2.5"
        onClick={() => setSheetOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-base">Nearby</span>
          {!loading && (
            <span className="text-white/30 text-sm">{filtered.length} places</span>
          )}
          {loading && (
            <div className="flex gap-1">
              {[0, 100, 200].map(d => (
                <div key={d} className="w-1 h-1 rounded-full bg-white/30 animate-bounce"
                  style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300"
          style={{ transform: sheetOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
          <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" opacity="0.4" viewBox="0 0 24 24">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </div>
      </button>

      {/* Collapsed: horizontal card strip */}
      {!sheetOpen && !loading && (
        <PlaceStrip places={places} onSelect={(p) => { onSelectPlace(p) }} />
      )}

      {/* Expanded content */}
      {sheetOpen && (
        <>
          {/* Filter tabs */}
          <div className="overflow-x-auto px-5 pb-3" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-2" style={{ width: 'max-content' }}>
              {FILTERS.map((f, i) => (
                <button
                  key={f.label}
                  onClick={() => setActiveFilter(i)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: activeFilter === i ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                    color: activeFilter === i ? 'white' : 'rgba(255,255,255,0.4)',
                    border: activeFilter === i ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                  }}
                >{f.label}</button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '52vh' }}>
            {loading && (
              <div className="px-5 py-4 space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 rounded-full bg-white/5 w-3/4" />
                      <div className="h-2.5 rounded-full bg-white/5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div>
                {filtered.map(place => (
                  <PlaceRow
                    key={place.id}
                    place={place}
                    onSelect={(p) => { onSelectPlace(p); setSheetOpen(false) }}
                  />
                ))}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="px-5 py-12 text-center">
                <div className="text-white/20 text-sm">No {FILTERS[activeFilter].label.toLowerCase()} found nearby</div>
              </div>
            )}

            <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
          </div>
        </>
      )}
    </div>
  )
}
