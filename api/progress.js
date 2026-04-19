// Vercel Serverless Function for syncing progress across devices.
// Uses Vercel KV (Upstash Redis under the hood) for persistence.
// If KV env vars are not configured, falls back to in-memory (ephemeral)
// so local/preview deploys don't crash — but real cross-device sync
// only works once KV is linked to the project.

import { kv } from '@vercel/kv'

// Fallback for environments where KV isn't configured.
const memoryFallback = new Map()
const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

async function readSessions(studentId) {
  const key = `progress:${studentId}`
  if (hasKV) {
    const val = await kv.get(key)
    return Array.isArray(val) ? val : []
  }
  return memoryFallback.get(key) || []
}

async function writeSessions(studentId, sessions) {
  const key = `progress:${studentId}`
  if (hasKV) {
    await kv.set(key, sessions)
  } else {
    memoryFallback.set(key, sessions)
  }
}

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
      const sessions = await readSessions(studentId)
      return res.status(200).json(sessions)
    }

    if (req.method === 'POST') {
      const { data } = req.body

      if (!data) {
        return res.status(400).json({ error: 'data required' })
      }

      const sessions = await readSessions(studentId)

      // Duplicate prevention: same timestamp + same correctAnswers
      const isDuplicate = sessions.some(
        s => s.timestamp === data.timestamp && s.correctAnswers === data.correctAnswers
      )

      if (!isDuplicate) {
        sessions.push(data)
        await writeSessions(studentId, sessions)
      }

      return res.status(200).json({ success: true, sessions })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
