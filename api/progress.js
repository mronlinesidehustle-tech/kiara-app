/**
 * Vercel Serverless Function - Progress Storage
 * Handles saving/retrieving student progress
 * Uses Vercel KV (or simulates with JSON for local testing)
 */

// For local dev: use in-memory storage
// For production: Vercel KV will be used via environment variables
const storage = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { studentId } = req.query;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId required' });
  }

  if (req.method === 'POST') {
    // Save progress
    const { sessionData } = req.body;

    if (!storage[studentId]) {
      storage[studentId] = [];
    }

    storage[studentId].push(sessionData);

    // TODO: In production, save to Vercel KV:
    // await kv.lpush(`progress:${studentId}`, JSON.stringify(sessionData))

    return res.status(200).json({
      success: true,
      message: 'Progress saved',
      sessions: storage[studentId],
    });
  }

  if (req.method === 'GET') {
    // Get progress
    const sessions = storage[studentId] || [];

    // TODO: In production, read from Vercel KV:
    // const sessions = await kv.lrange(`progress:${studentId}`, 0, -1)

    return res.status(200).json({
      success: true,
      sessions,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
