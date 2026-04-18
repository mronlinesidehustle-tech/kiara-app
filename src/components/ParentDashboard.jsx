import React, { useState, useEffect } from 'react'
import { getProgress } from '../api/kvSync'
import './ParentDashboard.css'

export default function ParentDashboard({ studentId, onBack }) {
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalCorrect: 0,
    averageScore: 0,
  })

  useEffect(() => {
    loadSessions()
  }, [studentId])

  const loadSessions = async () => {
    const data = await getProgress(studentId)
    setSessions(data)

    // Calculate stats
    if (data.length > 0) {
      const totalCorrect = data.reduce((sum, s) => sum + (s.correctAnswers || 0), 0)
      const totalProblems = data.reduce((sum, s) => sum + (s.totalProblems || 0), 0)
      const avgScore = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0

      setStats({
        totalSessions: data.length,
        totalCorrect,
        averageScore: avgScore,
      })
    }
  }

  return (
    <div className="dashboard-container">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="dashboard-content">
        <h1>📊 Kiara's Progress Dashboard</h1>
        <p className="subtitle">Track her learning journey</p>

        {sessions.length === 0 ? (
          <div className="no-data">
            <p>No sessions yet. Start a lesson to see progress!</p>
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
              {sessions.slice().reverse().map((session, idx) => (
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

            <div className="share-section">
              <h3>📱 Share Progress</h3>
              <p>Share this link with family:</p>
              <div className="share-box">
                <code>{window.location.origin}?studentId={studentId}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}?studentId=${studentId}`)
                    alert('Link copied to clipboard!')
                  }}
                  className="copy-btn"
                >
                  📋 Copy Link
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
