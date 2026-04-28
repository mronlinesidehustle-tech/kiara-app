import React, { useState, useEffect } from 'react'
import { getProgress, getProgressFromServer } from '../api/kvSync'
import './ParentDashboard.css'

export default function ParentDashboard({ studentId, onBack }) {
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalCorrect: 0,
    averageScore: 0,
  })
  const [isSharedLink, setIsSharedLink] = useState(false)
  const [readingConfig, setReadingConfig] = useState({ sightWords: '', phonicsWords: '', story: '' })
  const [readingSaved, setReadingSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`reading-config-${studentId}`)
      if (raw) {
        const cfg = JSON.parse(raw)
        setReadingConfig({
          sightWords: (cfg.sightWords || []).join(', '),
          phonicsWords: (cfg.phonicsWords || []).join(', '),
          story: cfg.story || '',
        })
      }
    } catch {}
  }, [studentId])

  const handleSaveReadingConfig = () => {
    const sightWords = readingConfig.sightWords.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)
    const phonicsWords = readingConfig.phonicsWords.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)
    const story = readingConfig.story.trim()
    localStorage.setItem(`reading-config-${studentId}`, JSON.stringify({ sightWords, phonicsWords, story }))
    setReadingSaved(true)
    setTimeout(() => setReadingSaved(false), 2000)
  }

  const handleResetReadingConfig = () => {
    localStorage.removeItem(`reading-config-${studentId}`)
    setReadingConfig({ sightWords: '', phonicsWords: '', story: '' })
  }

  const readingSessions = sessions.filter(s => s.lessonType === 'reading')
  const mathSessions = sessions.filter(s => !s.lessonType || s.lessonType !== 'reading')

  useEffect(() => {
    // Check if this is a shared link (studentId from URL param)
    const params = new URLSearchParams(window.location.search)
    const sharedLink = params.has('studentId')
    setIsSharedLink(sharedLink)

    const loadData = async () => {
      // For shared links, try to fetch from server first (multi-device sync)
      let data = sharedLink ? await getProgressFromServer(studentId) : getProgress(studentId)

      setSessions(data)

      if (data.length > 0) {
        const totalCorrect = data.reduce((sum, s) => sum + (s.correctAnswers || 0), 0)
        const totalProblems = data.reduce((sum, s) => sum + (s.totalProblems || 0), 0)
        const avgScore = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0
        setStats({ totalSessions: data.length, totalCorrect, averageScore: avgScore })
      }
    }

    loadData()
  }, [studentId])

  return (
    <div className="dashboard-container">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="dashboard-content">
        <h1>📊 Kiara's Progress Dashboard</h1>
        <p className="subtitle">Track her learning journey</p>

        {sessions.length === 0 ? (
          <div className="no-data">
            {isSharedLink ? (
              <>
                <p>No sessions yet on Kiara's account.</p>
                <p style={{ fontSize: '0.95em', color: '#999', marginTop: 8 }}>
                  Once Kiara completes a lesson, her progress will show here automatically.
                </p>
              </>
            ) : (
              <p>No sessions yet. Start a lesson to see progress!</p>
            )}
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{stats.totalSessions}</div>
                <p>Total Sessions</p>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalCorrect}</div>
                <p>Correct Answers</p>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.averageScore}%</div>
                <p>Average Score</p>
              </div>
            </div>

            <div className="sessions-list">
              <h2>Recent Sessions</h2>
              {mathSessions.slice().reverse().map((session, idx) => (
                <div key={idx} className="session-card">
                  <div className="session-left">
                    <p className="lesson-name">{session.lesson}</p>
                    <p className="session-date">
                      {new Date(session.timestamp).toLocaleDateString()} @{' '}
                      {new Date(session.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="session-right">
                    <div className="score-badge">
                      {session.correctAnswers}/{session.totalProblems}
                    </div>
                    <p className="percentage">
                      {Math.round((session.correctAnswers / session.totalProblems) * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {readingSessions.length > 0 && (
              <div className="sessions-list" style={{ marginTop: 24 }}>
                <h2>📖 Reading Sessions</h2>
                {readingSessions.slice().reverse().map((session, idx) => (
                  <div key={idx} className="session-card">
                    <div className="session-left">
                      <p className="lesson-name">Reading Lesson</p>
                      <p className="session-date">
                        {new Date(session.timestamp).toLocaleDateString()} @{' '}
                        {new Date(session.timestamp).toLocaleTimeString()}
                      </p>
                      <p style={{ fontSize: '0.85em', color: '#64748b', margin: '2px 0 0' }}>
                        Sight Words: {session.sightWordsScore ?? '—'}/5 ·{' '}
                        Phonics: {session.phonicsScore ?? '—'}/5 ·{' '}
                        Story: {session.storyScore ?? '—'}/{session.storyTotal ?? '—'}
                      </p>
                    </div>
                    <div className="session-right">
                      <div className="score-badge">
                        {session.correctAnswers}/{session.totalProblems}
                      </div>
                      <p className="percentage">
                        {Math.round((session.correctAnswers / session.totalProblems) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="share-section">
              <h3>📱 Share with Family</h3>

              <div className="share-subsection">
                <h4>See the same progress on another device</h4>
                <p>Kiara's ID: <code className="student-id">{studentId}</code></p>
                <p className="note">
                  Dad, Grandma, and others can see the same dashboard on their phones
                  by opening this link:
                </p>
                <div className="share-box">
                  <code className="share-url">{window.location.origin}?studentId={studentId}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}?studentId=${studentId}`)
                      alert('Link copied! Share with Dad, Grandma, etc.')
                    }}
                    className="copy-btn"
                  >
                    📋 Copy Dashboard Link
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 32 }}>
          <h3>📖 Reading Settings</h3>
          <p style={{ fontSize: '0.9em', color: '#64748b', marginBottom: 16 }}>Leave blank to use the built-in defaults.</p>

          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85em', color: '#64748b' }}>
            SIGHT WORDS (comma-separated, min 5)
          </label>
          <input
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 14, fontSize: '0.95em', boxSizing: 'border-box' }}
            value={readingConfig.sightWords}
            onChange={e => setReadingConfig(c => ({ ...c, sightWords: e.target.value }))}
            placeholder="the, and, is, are, it, we, go, my, he, she"
          />

          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85em', color: '#64748b' }}>
            PHONICS WORDS (comma-separated, min 5)
          </label>
          <input
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 14, fontSize: '0.95em', boxSizing: 'border-box' }}
            value={readingConfig.phonicsWords}
            onChange={e => setReadingConfig(c => ({ ...c, phonicsWords: e.target.value }))}
            placeholder="cat, dog, sun, hat, big, red, fun, sit, hop, map"
          />

          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85em', color: '#64748b' }}>
            SHORT STORY (separate sentences with periods)
          </label>
          <textarea
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 14, fontSize: '0.95em', minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
            value={readingConfig.story}
            onChange={e => setReadingConfig(c => ({ ...c, story: e.target.value }))}
            placeholder="The cat sat on the mat. It is a big red mat. The cat is happy."
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleSaveReadingConfig}
              style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 20, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
            >
              {readingSaved ? '✅ Saved!' : '💾 Save Reading Settings'}
            </button>
            <button
              onClick={handleResetReadingConfig}
              style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 20, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
            >
              ↩ Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
