/**
 * Progress Storage
 * Primary source: localStorage (instant, always available, works offline)
 * Best-effort: Vercel serverless sync (fire-and-forget)
 */

export function saveProgress(studentId, sessionData) {
  // Always write to localStorage first — this is what the dashboard reads
  const localKey = `progress-${studentId}`
  const sessions = JSON.parse(localStorage.getItem(localKey) || '[]')
  sessions.push(sessionData)
  localStorage.setItem(localKey, JSON.stringify(sessions))

  // Attempt server sync silently — failure is fine, localStorage is source of truth
  fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, sessionData }),
  }).catch(() => {})
}

export function getProgress(studentId) {
  // Read directly from localStorage — synchronous, instant, always current
  const localKey = `progress-${studentId}`
  return JSON.parse(localStorage.getItem(localKey) || '[]')
}
