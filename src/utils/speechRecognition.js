/**
 * Speech Recognition Utility
 * Listens to Kiara's voice answers using Web Speech API (Chrome/Android Chrome)
 */

export function createSpeechRecognizer({ onResult, onError, onEnd, timeout = 15000 }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  if (!SpeechRecognition) {
    onError?.('not-supported')
    return null
  }

  const recognition = new SpeechRecognition()
  recognition.lang = 'en-US'
  recognition.interimResults = false
  recognition.maxAlternatives = 3
  recognition.continuous = false

  let timeoutHandle = null

  recognition.onresult = (event) => {
    const transcripts = Array.from(event.results[0]).map(r => r.transcript.toLowerCase().trim())
    const primary = transcripts[0]
    const number = extractNumber(primary)
    onResult?.({ transcript: primary, number, allTranscripts: transcripts })
  }

  recognition.onerror = (event) => {
    if (timeoutHandle) clearTimeout(timeoutHandle)
    onError?.(event.error)
  }

  recognition.onend = () => {
    if (timeoutHandle) clearTimeout(timeoutHandle)
    onEnd?.()
  }

  const originalStart = recognition.start.bind(recognition)
  recognition.start = function() {
    originalStart()
    // Auto-stop listening after timeout to prevent indefinite listening
    if (timeoutHandle) clearTimeout(timeoutHandle)
    timeoutHandle = setTimeout(() => {
      recognition.abort()
    }, timeout)
  }

  return recognition
}

// Convert spoken words or digits to integers
const WORD_TO_NUM = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15
}

export function extractNumber(transcript) {
  if (!transcript) return null
  // Direct digit match first
  const digitMatch = transcript.match(/\b(\d+)\b/)
  if (digitMatch) return parseInt(digitMatch[1])
  // Word match
  for (const [word, num] of Object.entries(WORD_TO_NUM)) {
    if (transcript.includes(word)) return num
  }
  return null
}

// Detect if Kiara sounds frustrated or confused
export function detectSentiment(transcript) {
  if (!transcript) return 'neutral'
  const lower = transcript.toLowerCase()
  const frustrated = ["i can't", "cant do", "i hate", "too hard", "stop", "no no no", "ugh", "this is hard"]
  const confused = ["i don't know", "dont know", "not sure", "i give up", "idk", "what is it", "i have no idea"]
  if (frustrated.some(w => lower.includes(w))) return 'frustrated'
  if (confused.some(w => lower.includes(w))) return 'confused'
  return 'neutral'
}
