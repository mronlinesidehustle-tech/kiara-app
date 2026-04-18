import React, { useState, useEffect, useRef } from 'react'
import './MathLesson1.css'
import { speakText, stopSpeaking } from '../utils/voiceAgent'
import { saveProgress } from '../api/kvSync'
import { createSpeechRecognizer, extractNumber, detectSentiment } from '../utils/speechRecognition'

const FAMILY_MEMBERS = [
  'Daddy', 'Mommy', 'Kelani', 'Grandma', 'Grandpa', 'Nay',
  'Uncle Jair', 'GG', 'Jasmine', 'French Fries', 'Marcello'
]

const OBJECTS = ['🍎', '🎈', '🧸', '🍪', '⭐', '🌸', '🚗']
const OBJECT_NAMES = {
  '🍎': 'apples', '🎈': 'balloons', '🧸': 'teddy bears',
  '🍪': 'cookies', '⭐': 'stars', '🌸': 'flowers', '🚗': 'toy cars'
}

export default function MathLesson1({ studentId, onBack }) {
  const [step, setStep] = useState(0)
  const [group1Count, setGroup1Count] = useState(0)
  const [group2Count, setGroup2Count] = useState(0)
  const [tappedObjects, setTappedObjects] = useState(new Set())
  const [typedAnswer, setTypedAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const [currentFamily, setCurrentFamily] = useState('')
  const [currentObject, setCurrentObject] = useState('')
  const [attemptCount, setAttemptCount] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [listeningTranscript, setListeningTranscript] = useState('')
  const [allSpoken, setAllSpoken] = useState('')  // Cumulative transcript for the whole problem
  const recognizerRef = useRef(null)

  // --- Generate new problem when step advances ---
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
      setTappedObjects(new Set())
      setTypedAnswer('')
      setFeedback('')
      setFeedbackType('')
      setAttemptCount(0)
      setListeningTranscript('')
      setAllSpoken('')

      const objName = OBJECT_NAMES[obj] || 'things'
      setTimeout(() => {
        speakText(
          `${fam} has ${g1} ${objName}. Then gets ${g2} more. How many altogether?`
        )
      }, 400)
    }
  }, [step])

  // --- Start listening to Kiara work through the problem ---
  const handleStartListening = () => {
    if (isListening) {
      recognizerRef.current?.stop()
      return
    }

    stopSpeaking()

    const recognizer = createSpeechRecognizer({
      onResult: ({ transcript }) => {
        // Accumulate what Kiara says as she works
        setListeningTranscript(transcript)
        setAllSpoken(prev => prev + ' ' + transcript)
      },
      onError: (err) => {
        setIsListening(false)
        if (err === 'not-supported') {
          setFeedback('Voice not supported in this browser.')
          setFeedbackType('wrong')
        } else if (err === 'not-allowed') {
          setFeedback('Microphone permission needed.')
          setFeedbackType('wrong')
        }
      },
      onEnd: () => setIsListening(false),
    })

    if (recognizer) {
      recognizerRef.current = recognizer
      recognizer.start()
      setIsListening(true)
      setListeningTranscript('')
      speakText('I am listening! Count out loud so I can hear you!')
    }
  }

  // --- Tap an object to count it ---
  const handleObjectTap = (objectId) => {
    const newTapped = new Set(tappedObjects)
    if (newTapped.has(objectId)) {
      newTapped.delete(objectId)
    } else {
      newTapped.add(objectId)
    }
    setTappedObjects(newTapped)
  }

  // --- Start lesson ---
  const handleIntroClick = () => {
    speakText("Touch the objects to count them. Then tell me how many altogether. Ready?")
    setStep(1)
  }

  // --- Core answer check with 3-level progressive hints ---
  const checkAnswer = (answer, newAttemptCount) => {
    const correct = group1Count + group2Count
    const objName = OBJECT_NAMES[currentObject] || 'things'

    if (answer === correct) {
      const newCorrectCount = correctCount + 1
      setCorrectCount(newCorrectCount)
      setFeedback('✅ That is right!')
      setFeedbackType('correct')

      // Tailor praise — KEEP SENTENCES SHORT
      let praise
      if (allSpoken.toLowerCase().includes('one') || allSpoken.toLowerCase().includes('1')) {
        praise = `I love how you counted out loud!`
      } else {
        praise = `You got it! Great job!`
      }

      speakText(praise, () => {
        // Wait for speech to finish before advancing
        if (step < 5) {
          setStep(step + 1)
        } else {
          finishLesson(newCorrectCount)
        }
      })

    } else {
      if (newAttemptCount === 1) {
        setFeedback('Not quite — try again!')
        setFeedbackType('wrong')
        setTappedObjects(new Set())
        setTypedAnswer('')

        const hint = `Let's try again. Count each one carefully.`
        speakText(hint)

      } else if (newAttemptCount === 2) {
        setFeedback(`Let's count each group.`)
        setFeedbackType('hint')
        setTappedObjects(new Set())
        setTypedAnswer('')

        const countGroup1 = Array.from({ length: group1Count }, (_, i) => i + 1).join('... ')
        speakText(
          `Let's count together: ${countGroup1}. Now you count the second group!`
        )

      } else {
        setFeedback(`Count with me!`)
        setFeedbackType('hint')
        setTappedObjects(new Set())
        setTypedAnswer('')

        const total = group1Count + group2Count
        const countAll = Array.from({ length: total }, (_, i) => i + 1).join('... ')
        speakText(
          `Let's count all together: ${countAll}. What number did we reach?`
        )
      }
    }
  }

  // --- Submit typed answer ---
  const handleSubmitTyped = () => {
    const answer = parseInt(typedAnswer)
    if (!isNaN(answer)) {
      const newAttemptCount = attemptCount + 1
      setAttemptCount(newAttemptCount)
      checkAnswer(answer, newAttemptCount)
    }
  }

  // --- Stop listening and submit final answer ---
  const handleStopListeningAndSubmit = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop()
    }
    setIsListening(false)

    // Extract final number from what she said
    const allText = (allSpoken + ' ' + listeningTranscript).toLowerCase()
    const finalNumber = extractNumber(allText)

    if (finalNumber !== null) {
      const newAttemptCount = attemptCount + 1
      setAttemptCount(newAttemptCount)
      setTypedAnswer('')
      checkAnswer(finalNumber, newAttemptCount)
    } else {
      setFeedback(`I heard: "${listeningTranscript}" but I did not catch a number. Try typing it below!`)
      setFeedbackType('wrong')
    }
  }

  // --- Back button: save partial progress if mid-lesson ---
  const handleBack = () => {
    stopSpeaking()
    if (recognizerRef.current) {
      recognizerRef.current.stop()
    }
    if (step >= 1 && step <= 5 && step > 1) {
      saveProgress(studentId, {
        lesson: 'math-lesson-1',
        correctAnswers: correctCount,
        totalProblems: step - 1,
        timestamp: new Date().toISOString()
      })
    }
    onBack()
  }

  // =====================
  // RENDER: Intro screen
  // =====================
  if (step === 0) {
    return (
      <div className="lesson-container">
        <button className="back-btn" onClick={handleBack}>← Back</button>
        <div className="lesson-intro">
          <div className="mrs-love-char">👩🏾‍🏫</div>
          <p className="lesson-title">Addition: Putting Things Together</p>
          <p className="lesson-description">
            Mrs. Love is going to teach you how to add! We will look at two groups of objects,
            touch each one to count them, and figure out how many there are altogether.
          </p>
          <button className="btn-start" onClick={handleIntroClick}>
            Let's Start! ▶️
          </button>
        </div>
      </div>
    )
  }

  // =====================
  // RENDER: End screen
  // =====================
  if (step === 6) {
    const msg =
      correctCount === 5
        ? "Perfect score! You got every single one right! I am so proud of you today!"
        : correctCount >= 3
        ? `You got ${correctCount} out of 5! That is really good counting, Kiara! Keep it up!`
        : `You got ${correctCount} out of 5. Every time you practice, you get a little better. Let's try again soon!`

    return (
      <div className="lesson-container">
        <div className="lesson-end">
          <div className="celebration">{correctCount === 5 ? '🏆' : '🎉'}</div>
          <h2>Great Work, Kiara!</h2>
          <p className="score">You got {correctCount} out of 5!</p>
          <p className="mrs-love-message">"{msg}"</p>
          <button className="btn-home" onClick={onBack}>Go Home 🏠</button>
        </div>
      </div>
    )
  }

  // =====================
  // RENDER: Problem screen
  // =====================
  const totalObjects = group1Count + group2Count

  return (
    <div className="lesson-container">
      <button className="back-btn" onClick={handleBack}>← Back</button>

      <div className="lesson-header">
        <h2>Problem {step} of 5</h2>
        <p className="progress">✅ {correctCount} correct so far</p>
      </div>

      <div className="lesson-content">

        {/* Mrs. Love's instruction bubble */}
        <div className="mrs-love-instruction">
          <div className="char">👩🏾‍🏫</div>
          <p>
            <strong>{currentFamily}</strong> has <strong>{group1Count}</strong> {currentObject}.
            Then <strong>{currentFamily}</strong> gets <strong>{group2Count}</strong> more {currentObject}.
            <br />
            <span className="tap-hint">Touch each one to count — how many altogether?</span>
          </p>
        </div>

        {/* Object groups */}
        <div className="objects-area">
          <div className="group-1">
            <p className="group-label">First group</p>
            <div className="objects">
              {Array.from({ length: group1Count }).map((_, i) => {
                const id = `g1-${i}`
                const isTapped = tappedObjects.has(id)
                return (
                  <span
                    key={id}
                    className={`object ${isTapped ? 'tapped' : ''}`}
                    onClick={() => handleObjectTap(id)}
                  >
                    {currentObject}
                    {isTapped && <span className="tap-check">✓</span>}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="plus-sign">➕</div>

          <div className="group-2">
            <p className="group-label">Second group</p>
            <div className="objects">
              {Array.from({ length: group2Count }).map((_, i) => {
                const id = `g2-${i}`
                const isTapped = tappedObjects.has(id)
                return (
                  <span
                    key={id}
                    className={`object ${isTapped ? 'tapped' : ''}`}
                    onClick={() => handleObjectTap(id)}
                  >
                    {currentObject}
                    {isTapped && <span className="tap-check">✓</span>}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Running tap count */}
        <div className="tap-counter">
          {tappedObjects.size === 0
            ? 'Touch each one to count!'
            : tappedObjects.size === totalObjects
            ? `You counted all ${tappedObjects.size}! Now tell Mrs. Love!`
            : `You have counted: ${tappedObjects.size}`
          }
        </div>

        {/* Listening section */}
        {isListening && (
          <div className="listening-box">
            <div className="listening-indicator">
              <span className="pulse"></span>
              🔴 Mrs. Love is listening...
            </div>
            {listeningTranscript && (
              <div className="transcript">
                Kiara said: "<em>{listeningTranscript}</em>"
              </div>
            )}
            <button
              className="btn-stop-listening"
              onClick={handleStopListeningAndSubmit}
            >
              ✓ Done Counting
            </button>
          </div>
        )}

        {/* Answer section */}
        {!isListening && (
          <div className="answer-section">
            <p className="answer-prompt">How many altogether?</p>

            <button
              className="btn-mic"
              onClick={handleStartListening}
            >
              🎤 Listen to Kiara
            </button>

            <div className="answer-divider">— or type your answer —</div>

            <div className="type-row">
              <input
                type="number"
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && typedAnswer && handleSubmitTyped()}
                placeholder="?"
                min="0"
                max="15"
              />
              <button
                className="btn-submit"
                onClick={handleSubmitTyped}
                disabled={!typedAnswer}
              >
                Check ✓
              </button>
            </div>
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div className={`feedback feedback-${feedbackType}`}>
            {feedback}
          </div>
        )}

      </div>
    </div>
  )
}
