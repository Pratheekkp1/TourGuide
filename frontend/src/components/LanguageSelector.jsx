const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
  { code: 'hi', label: 'HI' },
  { code: 'ja', label: 'JA' },
  { code: 'ko', label: 'KO' },
  { code: 'pt', label: 'PT' },
  { code: 'de', label: 'DE' },
  { code: 'it', label: 'IT' },
  { code: 'zh', label: 'ZH' },
  { code: 'tl', label: 'TL' },
  { code: 'vi', label: 'VI' },
  { code: 'sw', label: 'SW' },
  { code: 'tr', label: 'TR' },
  { code: 'pl', label: 'PL' },
  { code: 'ru', label: 'RU' },
  { code: 'uk', label: 'UK' },
  { code: 'bn', label: 'BN' },
  { code: 'ur', label: 'UR' },
]

const FULL_NAMES = {
  en: 'English', es: 'Español', fr: 'Français', ar: 'العربية',
  hi: 'हिन्दी', ja: '日本語', ko: '한국어', pt: 'Português',
  de: 'Deutsch', it: 'Italiano', zh: '中文', tl: 'Filipino',
  vi: 'Tiếng Việt', sw: 'Kiswahili', tr: 'Türkçe', pl: 'Polski',
  ru: 'Русский', uk: 'Українська', bn: 'বাংলা', ur: 'اردو',
}

export { LANGUAGES, FULL_NAMES }

export default function LanguageSelector({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.8)',
        padding: '6px 10px',
        appearance: 'none',
        WebkitAppearance: 'none',
        minWidth: 48,
      }}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} style={{ background: '#0d0e17', color: 'white' }}>
          {l.label} — {FULL_NAMES[l.code]}
        </option>
      ))}
    </select>
  )
}
