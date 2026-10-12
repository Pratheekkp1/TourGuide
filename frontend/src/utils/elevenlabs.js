// Speech goes through the backend /api/tts proxy so the ElevenLabs key never reaches the browser.
const API_URL = import.meta.env.VITE_API_URL ?? ''

let currentAudio = null
let currentAbort = null

function stopCurrent() {
  // Cancel any in-flight fetch
  if (currentAbort) { currentAbort.abort(); currentAbort = null }
  // Stop any playing audio
  if (currentAudio) {
    currentAudio.pause()
    try { URL.revokeObjectURL(currentAudio.src) } catch (_) {}
    currentAudio = null
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

export async function speak(text) {
  if (!text) return
  stopCurrent()

  const abort = new AbortController()
  currentAbort = abort

  try {
    const res = await fetch(`${API_URL}/api/tts`, {
      method: 'POST',
      signal: abort.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error(`TTS ${res.status}`)

    const chunks = []
    const reader = res.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (abort.signal.aborted) return  // another speak() fired while we were reading
      chunks.push(value)
    }

    if (abort.signal.aborted) return
    currentAbort = null

    const blob = new Blob(chunks, { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio
    audio.onended = () => { try { URL.revokeObjectURL(url) } catch (_) {}; currentAudio = null }
    audio.play()
    return audio
  } catch (err) {
    if (err.name === 'AbortError') return  // intentionally cancelled
    console.error('TTS error:', err)
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
    }
  }
}

export function cancelSpeak() {
  stopCurrent()
}
