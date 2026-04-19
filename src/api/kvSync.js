/**
 * Progress Storage
 * Local: localStorage (instant, offline-first)
 * Server: Vercel API (cross-device sync via shared links)
 */

export function saveProgress(studentId, sessionData) {
  // Write to localStorage first (offline-first)
  const localKey = `progress-${studentId}`
  const sessions = JSON.parse(localStorage.getItem(localKey) || '[]')
  sessions.push(sessionData)
  localStorage.setItem(localKey, JSON.stringify(sessions))

  // Also sync to server (fire-and-forget, won't block)
  fetch(`/api/progress?studentId=${studentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: sessionData }),
  }).catch(() => {})
}

export function getProgress(studentId) {
  // Read from localStorage (synchronous, instant)
  const localKey = `progress-${studentId}`
  return JSON.parse(localStorage.getItem(localKey) || '[]')
}

// For shared dashboard links: fetch from server (might have data from other devices)
export async function getProgressFromServer(studentId) {
  try {
    const response = await fetch(`/api/progress?studentId=${studentId}`)
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch from server:', error)
  }
  // Fallback to localStorage if server fetch fails
  return getProgress(studentId)
}
