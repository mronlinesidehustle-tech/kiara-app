// Vercel Serverless Function for syncing progress across devices.
// Uses Vercel KV / Upstash Redis for persistence.
//
// Env var compatibility: Vercel's new "Upstash for Redis" Marketplace
// integration uses UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN,
// while the legacy Vercel KV uses KV_REST_API_URL / KV_REST_API_TOKEN.
// We accept either so the function works regardless of which integration
// the user configured in their Vercel dashboard.

import { createClient } from '@vercel/kv'

const url =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  null
const token =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  null

const kv = url && token ? createClient({ url, token }) : null

// Fallback for environments where no Redis is configured.
const memoryFallback = new Map()

async function readSessions(studentId) {
  const key = `progress:${studentId}`
  if (kv) {
    try {
      const val = await kv.get(key)
      return Array.isArray(val) ? val : []
    } catch (err) {
      console.error('KV get failed:', err)
      return memoryFallback.get(key) || []
    }
  }
  return memoryFallback.get(key) || []
}

async function writeSessions(studentId, sessions) {
  const key = `progress:${studentId}`
  if (kv) {
    try {
      await kv.set(key, sessions)
      return
    } catch (err) {
      console.error('KV set failed:', err)
    }
  }
  memoryFallback.set(key, sessions)
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

      return res.status(200).json({
        success: true,
        persistent: !!kv,
        envVarsSeen: {
          KV_REST_API_URL: !!process.env.KV_REST_API_URL,
          KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
          UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        },
        sessions,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
