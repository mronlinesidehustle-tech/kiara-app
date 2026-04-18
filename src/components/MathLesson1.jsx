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

// Names for speech (TTS doesn't read emojis well)
const OBJECT_NAMES = {
  '🍎': 'apples', '🎈': 'balloons', '🧸': 'teddy bears',
  '🍪': 'cookies', '⭐': 'stars', '🌸': 'flowers', '🚗': 'toy cars'
}

export default function MathLesson1({ studentId, onBack }) {
  const [step, setStep] = useState(0)           // 0: intro, 1–5: problems, 6: done
  const [group1Count, setGroup1Count] = useState(0)
  const [group2Count, setGroup2Count] = useState(0)
  const [tappedObjects, setTappedObjects] = useState(new Set())
  const [typedAnswer, setTypedAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('')  // 'correct' | 'wrong' | 'hint'
  const [correctCount, setCorrectCount] = useState(0)
  const [currentFamily, setCurrentFamily] = useState('')
  const [currentObject, setCurrentObject] = useState('')
  const [attemptCount, setAttemptCount] = useState(0)   // wrong attempts on current problem
  const [isListening, setIsListening] = useState(false)
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

      const objName = OBJECT_NAMES[obj] || 'things'
      setTimeout(() => {
        speakText(
          `Problem ${step}! ${fam} has ${g1} ${objName}. ` +
          `Then ${fam} gets ${g2} more ${objName}. ` +
          `Touch each one to count them, then tell Mrs. Love how many altogether!`
        )
      }, 400)
    }
  }, [step])

  // --- Tap an object to count it (toggle) ---
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
    speakText(
      "Alright, let's get started! I'm going to show you two groups of objects. " +
      "Touch each one to count it, and then tell me how many there are altogether. Ready?"
    )
    setStep(1)
  }

  // --- Core answer check with 3-level progressive hints ---
  const checkAnswer = (answer, newAttemptCount) => {
    const correct = group1Count + group2Count
    const objName = OBJECT_NAMES[currentObject] || 'things'

    if (answer === correct) {
      // CORRECT
      const newCorrectCount = correctCount + 1
      setCorrectCount(newCorrectCount)
      setFeedback('✅ That is right!')
      setFeedbackType('correct')

      const praise = newAttemptCount === 1
        ? `That's right! ${correct}! Excellent counting, Kiara! I am so proud of you!`
        : `Yes! ${correct} is correct! See, you figured it out! You are a great counter!`
      speakText(praise)

      setTimeout(() => {
        if (step < 5) {
          setStep(step + 1)
        } else {
          finishLesson(newCorrectCount)
        }
      }, 2800)

    } else {
      // WRONG — give progressive hints, never give the answer away

      if (newAttemptCount === 1) {
        // Hint 1: Gentle encouragement, reset taps, try again
        setFeedback('Not quite — try touching each one again to count!')
        setFeedbackType('wrong')
        setTappedObjects(new Set())
        setTypedAnswer('')
        speakText(
          `Hmm, not quite. Let's try again. Touch each ${objName === 'things' ? 'one' : objName.slice(0, -1)} ` +
          `one by one and count out loud as you go!`
        )

      } else if (newAttemptCount === 2) {
        // Hint 2: Count group 1 out loud together, let Kiara finish group 2
        setFeedback(`Let's count each group one at a time.`)
        setFeedbackType('hint')
        setTappedObjects(new Set())
        setTypedAnswer('')

        const countGroup1 = Array.from({ length: group1Count }, (_, i) => i + 1).join('... ')
        speakText(
          `Let me help you get started. Let's count the first group together. ` +
          `Ready? ${countGroup1}. That first group has ${group1Count}. ` +
          `Now you count the second group by yourself — touch each one!`
        )

      } else {
        // Hint 3: Count ALL objects slowly — stop just before saying the total
        setFeedback(`Count with Mrs. Love — touch each one as we count!`)
        setFeedbackType('hint')
        setTappedObjects(new Set())
        setTypedAnswer('')

        const total = group1Count + group2Count
        const countAll = Array.from({ length: total }, (_, i) => i + 1).join('... ')
        speakText(
          `Okay, let's count everything together, nice and slow. Ready? Here we go. ` +
          `${countAll}. ` +
          `We counted all the way to... what number did we reach? You tell me!`
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

  // --- Mic button: listen for spoken answer ---
  const handleMicPress = () => {
    if (isListening) {
      recognizerRef.current?.stop()
      return
    }

    stopSpeaking()

    const recognizer = createSpeechRecognizer({
      onResult: ({ transcript, number }) => {
        setIsListening(false)

        // Check for frustration / confusion first
        const sentiment = detectSentiment(transcript)

        if (sentiment === 'frustrated') {
          setFeedback("Take a deep breath — you can do this! 💛")
          setFeedbackType('hint')
          speakText(
            "Hey, it's okay. Take a deep breath with me. " +
            "I know this is a little tricky, but I believe in you. Let's try one more time together."
          )
          return
        }

        if (sentiment === 'confused') {
          setFeedback("That's okay — let's count together!")
          setFeedbackType('hint')
          setTappedObjects(new Set())
          const objName = OBJECT_NAMES[currentObject] || 'things'
          speakText(
            `That's perfectly okay if you're not sure! Touch each ${objName === 'things' ? 'one' : objName.slice(0, -1)} ` +
            `and count out loud with me. Start from the first group!`
          )
          return
        }

        if (number !== null) {
          setTypedAnswer(String(number))
          const newAttemptCount = attemptCount + 1
          setAttemptCount(newAttemptCount)
          checkAnswer(number, newAttemptCount)
        } else {
          setFeedback("I didn't hear a number — try saying just the number, like 'five' or 'seven'!")
          setFeedbackType('wrong')
          speakText("Hmm, I didn't quite catch that. Try saying just the number — like 'five' or 'eight'!")
        }
      },
      onError: (err) => {
        setIsListening(false)
        if (err === 'not-supported') {
          setFeedback("Voice not supported in this browser. Please type your answer!")
          setFeedbackType('wrong')
        } else if (err === 'not-allowed') {
          setFeedback("Microphone permission needed. You can type your answer below!")
          setFeedbackType('wrong')
        } else {
          setFeedback("I didn't catch that — try again or type your answer!")
          setFeedbackType('wrong')
        }
      },
      onEnd: () => setIsListening(false),
    })

    if (recognizer) {
      recognizerRef.current = recognizer
      recognizer.start()
      setIsListening(true)
      speakText("I'm listening! Tell me how many altogether!")
    }
  }

  // --- Save progress and go to end screen ---
  const finishLesson = (finalCorrect) => {
    saveProgress(studentId, {
      lesson: 'math-lesson-1',
      correctAnswers: finalCorrect,
      totalProblems: 5,
      timestamp: new Date().toISOString()
    })
    setStep(6)
  }

  // --- Back button: save partial progress if mid-lesson ---
  const handleBack = () => {
    stopSpeaking()
    if (step >= 1 && step <= 5 && step > 1) {
      // They completed at least one problem
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
            Mrs. Love is going to teach you how to add! We'll look at two groups of objects,
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
            : `You've counted: ${tappedObjects.size}`
          }
        </div>

        {/* Answer section */}
        <div className="answer-section">
          <p className="answer-prompt">How many altogether?</p>

          <button
            className={`btn-mic ${isListening ? 'listening' : ''}`}
            onClick={handleMicPress}
          >
            {isListening ? '🔴 Listening...' : '🎤 Tell Mrs. Love!'}
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
