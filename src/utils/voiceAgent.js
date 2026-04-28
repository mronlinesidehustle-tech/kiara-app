/**
 * Text-to-Speech using Web Speech API
 * Mrs. Love — warm, encouraging African American kindergarten teacher
 */

let cachedVoice = null

export function speakText(text, onEnd = null, rate = 0.85) {
  if (!('speechSynthesis' in window)) {
    onEnd?.()
    return
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = rate
  utterance.pitch = 1.1   // Natural warm female pitch
  utterance.volume = 1

  if (onEnd) utterance.onend = onEnd

  const doSpeak = () => {
    if (!cachedVoice) {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length) {
        cachedVoice =
          voices.find(v => v.name === 'Google US English') ||
          voices.find(v => v.name === 'Samantha') ||
          voices.find(v => v.name === 'Karen') ||
          voices.find(v => v.lang === 'en-US' && v.localService) ||
          voices.find(v => v.lang === 'en-US') ||
          voices[0]
      }
    }
    if (cachedVoice) utterance.voice = cachedVoice
    window.speechSynthesis.speak(utterance)
  }

  // Voices may not be loaded yet on first call
  const voices = window.speechSynthesis.getVoices()
  if (voices.length) {
    doSpeak()
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoice = null
      doSpeak()
    }
  }
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}
