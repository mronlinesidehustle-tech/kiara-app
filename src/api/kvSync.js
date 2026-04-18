/**
 * Vercel KV Storage Sync
 * Saves progress to Vercel KV and localStorage
 */

export async function saveProgress(studentId, sessionData) {
  // Save to localStorage first (offline)
  const localKey = `progress-${studentId}`;
  const sessions = JSON.parse(localStorage.getItem(localKey) || '[]');
  sessions.push(sessionData);
  localStorage.setItem(localKey, JSON.stringify(sessions));

  // Try to sync to server
  try {
    const response = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        sessionData,
      }),
    });
    return await response.json();
  } catch (error) {
    console.log('Sync failed (offline mode)', error);
    // Data is already in localStorage, will sync when back online
  }
}

export async function getProgress(studentId) {
  try {
    const response = await fetch(`/api/progress?studentId=${studentId}`);
    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    // Fall back to localStorage
    const localKey = `progress-${studentId}`;
    return JSON.parse(localStorage.getItem(localKey) || '[]');
  }
}
