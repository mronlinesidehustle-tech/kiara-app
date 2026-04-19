// Vercel Serverless Function for syncing progress across devices
// Note: Uses in-memory storage (resets on redeploy)
// For production: migrate to Vercel KV, Supabase, or PostgreSQL

const dataStore = {}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { studentId } = req.query

  if (!studentId) {
    return res.status(400).json({ error: 'studentId required' })
  }

  try {
    if (req.method === 'GET') {
      // Fetch progress for a student
      const sessions = dataStore[studentId] || []
      return res.status(200).json(sessions)
    }

    if (req.method === 'POST') {
      // Save progress for a student
      const { data } = req.body

      if (!data) {
        return res.status(400).json({ error: 'data required' })
      }

      if (!dataStore[studentId]) {
        dataStore[studentId] = []
      }

      // Check if this exact session already exists (prevent duplicates)
      const isDuplicate = dataStore[studentId].some(
        s => s.timestamp === data.timestamp && s.correctAnswers === data.correctAnswers
      )

      if (!isDuplicate) {
        dataStore[studentId].push(data)
      }

      return res.status(200).json({ success: true, sessions: dataStore[studentId] })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
