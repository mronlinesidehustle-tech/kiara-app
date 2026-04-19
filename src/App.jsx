import React, { useState, useEffect } from 'react'
import MathLesson1 from './components/MathLesson1'
import MathLesson2 from './components/MathLesson2'
import ParentDashboard from './components/ParentDashboard'
import './App.css'

export default function App() {
  const [page, setPage] = useState('home')
  const [studentId, setStudentId] = useState(null)

  useEffect(() => {
    // v1.5 fresh start: clear cached session data once so everyone moves
    // to the new persistent KV store with a clean slate. StudentId is
    // preserved so existing shared links keep working.
    if (localStorage.getItem('app-version') !== 'v1.5') {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('progress-')) localStorage.removeItem(k)
      })
      localStorage.setItem('app-version', 'v1.5')
    }

    // Check if studentId is in URL (for shared links)
    const params = new URLSearchParams(window.location.search)
    const urlStudentId = params.get('studentId')

    let id = urlStudentId || localStorage.getItem('studentId')
    if (!id) {
      id = 'kiara-' + Date.now()
    }
    localStorage.setItem('studentId', id)
    setStudentId(id)
  }, [])

  if (!studentId) return <div>Loading...</div>

  return (
    <div className="app-container">
      {page === 'home' && (
        <HomePage
          onSelectLesson={(lessonId) => setPage(lessonId)}
          onViewDashboard={() => setPage('dashboard')}
        />
      )}
      {page === 'math-lesson-1' && (
        <MathLesson1
          studentId={studentId}
          onBack={() => setPage('home')}
        />
      )}
      {page === 'math-lesson-2' && (
        <MathLesson2
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

function HomePage({ onSelectLesson, onViewDashboard }) {
  return (
    <div className="home-page">
      <div className="home-content">
        <h1>📚 Kiara's Learning App</h1>
        <p className="subtitle">Powered by Mrs. Love</p>

        <div className="mrs-love-intro">
          <div className="character">👩🏾‍🏫</div>
          <p className="intro-text">
            "Hello, Kiara! I'm Mrs. Love. Let's learn together!
            Choose a lesson and we're going to have so much fun!"
          </p>
        </div>

        <div className="button-group">
          <button className="btn btn-primary" onClick={() => onSelectLesson('math-lesson-1')}>
            ▶️ Start Lesson (Addition)
          </button>
          <button className="btn btn-primary" onClick={() => onSelectLesson('math-lesson-2')}>
            ▶️ Start Lesson (Subtraction)
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
