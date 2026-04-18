import React, { useState, useEffect } from 'react'
import MathLesson1 from './components/MathLesson1'
import ParentDashboard from './components/ParentDashboard'
import './App.css'

export default function App() {
  const [page, setPage] = useState('home')
  const [studentId, setStudentId] = useState(null)

  useEffect(() => {
    // Get or create student ID from localStorage
    let id = localStorage.getItem('studentId')
    if (!id) {
      id = 'kiara-' + Date.now()
      localStorage.setItem('studentId', id)
    }
    setStudentId(id)
  }, [])

  if (!studentId) return <div>Loading...</div>

  return (
    <div className="app-container">
      {page === 'home' && (
        <HomePage
          onStartLesson={() => setPage('math-lesson-1')}
          onViewDashboard={() => setPage('dashboard')}
        />
      )}
      {page === 'math-lesson-1' && (
        <MathLesson1
          studentId={studentId}
          onBack={() => setPage('home')}
        />
      )}
      {page === 'dashboard' && (
        <ParentDashboard
          studentId={studentId}
          onBack={() => setPage('home')}
        />
      )}
    </div>
  )
}

function HomePage({ onStartLesson, onViewDashboard }) {
  return (
    <div className="home-page">
      <div className="home-content">
        <h1>📚 Kiara's Learning App</h1>
        <p className="subtitle">Powered by Mrs. Love</p>

        <div className="mrs-love-intro">
          <div className="character">👩‍🏫</div>
          <p className="intro-text">
            "Hello, Kiara! I'm Mrs. Love. Today we are going to learn about addition.
            We're going to have so much fun counting together!"
          </p>
        </div>

        <div className="button-group">
          <button className="btn btn-primary" onClick={onStartLesson}>
            ▶️ Start Lesson (Addition)
          </button>
          <button className="btn btn-secondary" onClick={onViewDashboard}>
            📊 Parent Dashboard
          </button>
        </div>

        <div className="info-box">
          <p>💡 <strong>For Family:</strong> Share the dashboard link to see Kiara's progress!</p>
        </div>
      </div>
    </div>
  )
}
