import React, { useState, useEffect, useRef } from 'react'
import './MathLesson2.css'
import { speakText, stopSpeaking } from '../utils/voiceAgent'
import { saveProgress } from '../api/kvSync'
import { createSpeechRecognizer, extractNumber, detectSentiment } from '../utils/speechRecognition'

const FAMILY_MEMBERS = [
  'Daddy', 'Mommy', 'Kelani', 'Grandma', 'Granny', 'Grandpa', 'Nay',
  'Uncle Jair', 'GG', 'Jasmine', 'French Fries', 'Marcello'
]

// Rotating praise lines — Mrs. Love says something different each correct answer.
const PRAISE_LINES = [
  'You got it! Great job!',
  'You are awesome, Kiara!',
  'Great job, Kiara!',
  "You're doing a great job counting!",
  'You are doing amazing!',
  'Kiara, way to go!',
  'Wow, that is right! Super work!',
  'Yes! You nailed it!',
  'High five, Kiara! You got it!',
  "I'm so proud of you!",
  'That is exactly right! Keep it up!',
  'Beautiful counting, Kiara!',
]

function randomPraise() {
  return PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)]
}

// Expanded emoji set: 7 original + 8 new = 15 total
const OBJECTS = [
  '🍎', '🎈', '🧸', '🍪', '⭐', '🌸', '🚗',  // Original 7
  '🍌', '🍒', '🐠', '🦋', '🌺', '🎂', '🎁', '🎨'  // New 8
]
const OBJECT_NAMES = {
  '🍎': 'apples', '🎈': 'balloons', '🧸': 'teddy bears',
  '🍪': 'cookies', '⭐': 'stars', '🌸': 'flowers', '🚗': 'toy cars',
  '🍌': 'bananas', '🍒': 'cherries', '🐠': 'fish',
  '🦋': 'butterflies', '🌺': 'hibiscus', '🎂': 'cakes', '🎁': 'gifts', '🎨': 'paintbrushes'
}

export default function MathLesson2({ studentId, onBack }) {
  const [step, setStep] = useState(0)
  const [startCount, setStartCount] = useState(0)
  const [removeCount, setRemoveCount] = useState(0)
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
  const [problemLocked, setProblemLocked] = useState(false)  // Drives UI disabled state
  const [hasGuided, setHasGuided] = useState(false)  // Tracks if auto-guide voice has played this problem
  const problemLockedRef = useRef(false)  // Synchronous guard — immune to React state batching
  const recognizerRef = useRef(null)
  const lessonFamiliesRef = useRef([])  // Shuffled list of 5 unique family names for this lesson

  // --- Generate new problem when step advances ---
  useEffect(() => {
    if (step > 0 && step <= 5) {
      // Pick from the pre-shuffled lesson list so names don't repeat within one lesson.
      const fam = lessonFamiliesRef.current[step - 1]
      const obj = OBJECTS[Math.floor(Math.random() * OBJECTS.length)]
      // Subtraction: startCount from 1-9, removeCount from 1 to (startCount - 1)
      const start = Math.floor(Math.random() * 9) + 1  // 1-9
      const remove = Math.floor(Math.random() * (start - 1)) + 1  // 1 to (start-1)

      setCurrentFamily(fam)
      setCurrentObject(obj)
      setStartCount(start)
      setRemoveCount(remove)
      setTappedObjects(new Set())
      setTypedAnswer('')
      setFeedback('')
      setFeedbackType('')
      setAttemptCount(0)
      setListeningTranscript('')
      setAllSpoken('')
      setHasGuided(false)  // Reset auto-guide flag for new problem
      problemLockedRef.current = false  // Reset ref synchronously
      setProblemLocked(false)  // Unlock UI for new problem

      const objName = OBJECT_NAMES[obj] || 'things'
      setTimeout(() => {
        speakText(
          `${fam} has ${start} ${objName}. Takes away ${remove}. How many are left?`
        )
      }, 400)
    }
  }, [step])

  // --- Save completed lesson when step reaches 6 ---
  useEffect(() => {
    if (step === 6) {
      saveProgress(studentId, {
        lesson: 'math-lesson-2',
        correctAnswers: Math.min(correctCount, 5),  // Safety cap — never exceed totalProblems
        totalProblems: 5,
        timestamp: new Date().toISOString()
      })
    }
  }, [step, correctCount, studentId])

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

  // --- Tap an object to mark it as removed ---
  const handleObjectTap = (objectId) => {
    const newTapped = new Set(tappedObjects)
    if (newTapped.has(objectId)) {
      // Always allow untapping (to correct mistakes)
      newTapped.delete(objectId)
    } else {
      // Only allow new taps if under the target — prevents over-tapping
      if (tappedObjects.size >= removeCount) return
      newTapped.add(objectId)
    }
    setTappedObjects(newTapped)
  }

  // --- Auto-guide voice when Kiara reaches target count ---
  useEffect(() => {
    if (tappedObjects.size === removeCount && removeCount > 0 && !hasGuided && !problemLocked && step > 0 && step <= 5) {
      setHasGuided(true)
      setTimeout(() => {
        speakText(`Great! You took away ${removeCount}. Now count what's left and tell me the number!`)
      }, 300)
    }
  }, [tappedObjects.size, removeCount, hasGuided, problemLocked, step])

  // --- Start lesson ---
  const handleIntroClick = () => {
    // Shuffle family members and take 5 unique names — one per problem, no repeats.
    const shuffled = [...FAMILY_MEMBERS].sort(() => Math.random() - 0.5)
    lessonFamiliesRef.current = shuffled.slice(0, 5)
    speakText("Click the objects to take away. Then tell me how many are left. Ready?")
    setStep(1)
  }

  // --- Core answer check with 3-level progressive hints ---
  const checkAnswer = (answer, newAttemptCount) => {
    if (problemLockedRef.current) return  // Synchronous guard — blocks rapid double-submits

    const correct = startCount - removeCount
    const objName = OBJECT_NAMES[currentObject] || 'things'

    if (answer === correct) {
      problemLockedRef.current = true  // Lock synchronously — second call in same tick hits guard above
      setProblemLocked(true)            // Drive UI disabled state
      const newCorrectCount = correctCount + 1
      setCorrectCount(newCorrectCount)
      setFeedback('✅ That is right!')
      setFeedbackType('correct')

      // Random praise so Mrs. Love doesn't repeat herself.
      // Special bonus line when Kiara counted out loud into the mic.
      let praise
      if (allSpoken.toLowerCase().includes('one') || allSpoken.toLowerCase().includes('1')) {
        praise = `I love how you counted out loud! ${randomPraise()}`
      } else {
        praise = randomPraise()
      }

      speakText(praise, () => {
        // Wait for speech to finish before advancing
        if (step < 5) {
          setStep(step + 1)
        } else {
          setStep(6)
        }
      })

    } else {
      if (newAttemptCount === 1) {
        setFeedback('Not quite — try again!')
        setFeedbackType('wrong')
        setTappedObjects(new Set())
        setTypedAnswer('')

        const hint = `Let's try again. Count the ones left.`
        speakText(hint)

      } else if (newAttemptCount === 2) {
        setFeedback(`Let's count the ones left.`)
        setFeedbackType('hint')
        setTappedObjects(new Set())
        setTypedAnswer('')

        const remaining = startCount - removeCount
        const countRemaining = Array.from({ length: remaining }, (_, i) => i + 1).join('... ')
        speakText(
          `We took away ${removeCount}. Let's count what's left: ${countRemaining}. What number?`
        )

      } else {
        setFeedback(`Count with me!`)
        setFeedbackType('hint')
        setTappedObjects(new Set())
        setTypedAnswer('')

        const remaining = startCount - removeCount
        const countRemaining = Array.from({ length: remaining }, (_, i) => i + 1).join('... ')
        speakText(
          `Let's count together what's left: ${countRemaining}. What number did we reach?`
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
      const completed = step - 1
      saveProgress(studentId, {
        lesson: 'math-lesson-2',
        correctAnswers: Math.min(correctCount, completed),  // Safety cap
        totalProblems: completed,
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
          <p className="lesson-title">Subtraction: Taking Things Away</p>
          <p className="lesson-description">
            Mrs. Love is going to teach you how to subtract! We will look at a group of objects,
            click the ones to take away, and figure out how many are left.
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
            <strong>{currentFamily}</strong> has <strong>{startCount}</strong> {currentObject}.
            Takes away <strong>{removeCount}</strong>.
          </p>
        </div>

        {/* Explicit tap instruction with big number */}
        <div className="tap-instruction">
          👆 Click <strong className="tap-number">{removeCount}</strong> {currentObject} to take away!
        </div>

        {/* Objects area - single group for subtraction */}
        <div className="objects-area">
          <div className="group-1">
            <p className="group-label">All the {OBJECT_NAMES[currentObject] || 'objects'}</p>
            <div className="objects">
              {Array.from({ length: startCount }).map((_, i) => {
                const id = `obj-${i}`
                const isTapped = tappedObjects.has(id)
                const isDisabled = !isTapped && tappedObjects.size >= removeCount
                return (
                  <span
                    key={id}
                    className={`object ${isTapped ? 'tapped' : ''} ${isDisabled ? 'object-disabled' : ''}`}
                    onClick={() => handleObjectTap(id)}
                  >
                    {currentObject}
                    {isTapped && <span className="tap-check-remove">✗</span>}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Running tap count with state-based styling */}
        <div className={`tap-counter tap-counter-${tappedObjects.size === removeCount ? 'done' : tappedObjects.size > 0 ? 'in-progress' : 'start'}`}>
          {tappedObjects.size === 0
            ? `Click ${removeCount} to take away`
            : tappedObjects.size === removeCount
            ? `✅ ${tappedObjects.size} taken away! Now count what's left!`
            : `${tappedObjects.size} of ${removeCount} taken away — keep going!`
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
            <p className="answer-prompt">How many are left?</p>

            <button
              className="btn-mic"
              onClick={handleStartListening}
              disabled={problemLocked}
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
                disabled={!typedAnswer || problemLocked}
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
