import React, { useState, useEffect } from 'react'
import './MathLesson1.css'
import { speakText } from '../utils/voiceAgent'
import { saveProgress } from '../api/kvSync'

const FAMILY_MEMBERS = [
  'Daddy', 'Mommy', 'Kelani', 'Grandma', 'Grandpa', 'Nay',
  'Uncle Jair', 'GG', 'Jasmine', 'French Fries', 'Marcello'
]

const OBJECTS = ['🍎', '🎈', '🧸', '🍪', '⭐', '🌸', '🚗']

export default function MathLesson1({ studentId, onBack }) {
  const [step, setStep] = useState(0) // 0: intro, 1-5: practice problems, 6: end
  const [group1Count, setGroup1Count] = useState(0)
  const [group2Count, setGroup2Count] = useState(0)
  const [selectedObjects, setSelectedObjects] = useState([])
  const [response, setResponse] = useState('')
  const [feedback, setFeedback] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const [currentFamily, setCurrentFamily] = useState('')
  const [currentObject, setCurrentObject] = useState('')

  // Generate random problem
  useEffect(() => {
    if (step > 0 && step <= 5) {
      const fam = FAMILY_MEMBERS[Math.floor(Math.random() * FAMILY_MEMBERS.length)]
      const obj = OBJECTS[Math.floor(Math.random() * OBJECTS.length)]
      const g1 = Math.floor(Math.random() * 5) + 1
      const g2 = Math.floor(Math.random() * 5) + 1

      setCurrentFamily(fam)
      setCurrentObject(obj)
      setGroup1Count(g1)
      setGroup2Count(g2)
      setSelectedObjects([])
      setResponse('')
      setFeedback('')

      // Speak the problem
      setTimeout(() => {
        speakText(
          `Let's do addition! ${fam} has ${g1} ${obj}. Then, ${fam} gets ${g2} more. How many altogether? Drag the objects together and tell Mrs. Love!`
        )
      }, 500)
    }
  }, [step])

  const handleIntroClick = () => {
    speakText("Good! Let's put objects together. I show you, yes?")
    setStep(1)
  }

  const handleObjectClick = (index, group) => {
    const newObjects = [...selectedObjects, { index, group }]
    setSelectedObjects(newObjects)
  }

  const handleSubmitAnswer = () => {
    const answer = parseInt(response)
    const correct = group1Count + group2Count

    if (answer === correct) {
      setCorrectCount(correctCount + 1)
      setFeedback('✅ YES! That right!')
      speakText(`Yes, yes! ${correct} is correct, baby! You so smart! ${currentFamily} have ${correct} now. Great job!`)
      setTimeout(() => {
        if (step < 5) {
          setStep(step + 1)
        } else {
          setStep(6)
        }
      }, 3000)
    } else {
      setFeedback(`❌ Try again! Hint: ${group1Count} + ${group2Count} = ?`)
      speakText(`Not yet, sweetie. Count again. ${group1Count} and ${group2Count}. How many altogether?`)
    }
  }

  const handleBack = () => {
    saveProgress(studentId, {
      lesson: 'math-lesson-1',
      correctAnswers: correctCount,
      totalProblems: step - 1,
      timestamp: new Date().toISOString()
    })
    onBack()
  }

  // Render based on step
  if (step === 0) {
    return (
      <div className="lesson-container">
        <button className="back-btn" onClick={handleBack}>← Back</button>

        <div className="lesson-intro">
          <div className="mrs-love-char">👩‍🏫</div>
          <p className="lesson-title">Addition: Putting Things Together</p>
          <p className="lesson-description">
            Mrs. Love teach you addition! We put things together, yes?
            First you see example, then you try!
          </p>
          <button className="btn-start" onClick={handleIntroClick}>
            Start Learning! ▶️
          </button>
        </div>
      </div>
    )
  }

  if (step === 6) {
    return (
      <div className="lesson-container">
        <div className="lesson-end">
          <div className="celebration">🎉</div>
          <h2>Wonderful Job, Kiara!</h2>
          <p className="score">You got {correctCount} out of 5 correct!</p>
          <p className="mrs-love-message">
            "Mrs. Love so proud of you, baby! You learning addition so good!
            Come back tomorrow, yes?"
          </p>
          <button className="btn-home" onClick={handleBack}>
            Go Home 🏠
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="lesson-container">
      <button className="back-btn" onClick={handleBack}>← Back</button>

      <div className="lesson-header">
        <h2>Problem {step} of 5</h2>
        <p className="progress">✅ {correctCount} correct so far</p>
      </div>

      <div className="lesson-content">
        <div className="mrs-love-instruction">
          <div className="char">👩‍🏫</div>
          <p>
            {currentFamily} has {group1Count} {currentObject}.
            Then {currentFamily} gets {group2Count} more.
            <br />How many altogether?
          </p>
        </div>

        <div className="objects-area">
          <div className="group-1">
            <p className="group-label">Group 1: {group1Count}</p>
            <div className="objects">
              {Array.from({ length: group1Count }).map((_, i) => (
                <span key={`g1-${i}`} className="object" onClick={() => handleObjectClick(i, 1)}>
                  {currentObject}
                </span>
              ))}
            </div>
          </div>

          <div className="plus-sign">➕</div>

          <div className="group-2">
            <p className="group-label">Group 2: {group2Count}</p>
            <div className="objects">
              {Array.from({ length: group2Count }).map((_, i) => (
                <span key={`g2-${i}`} className="object" onClick={() => handleObjectClick(i, 2)}>
                  {currentObject}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="answer-section">
          <label>How many altogether?</label>
          <input
            type="number"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your answer"
            min="0"
            max="10"
          />
          <button
            className="btn-submit"
            onClick={handleSubmitAnswer}
            disabled={!response}
          >
            Check Answer ✓
          </button>
        </div>

        {feedback && <div className="feedback">{feedback}</div>}
      </div>
    </div>
  )
}
