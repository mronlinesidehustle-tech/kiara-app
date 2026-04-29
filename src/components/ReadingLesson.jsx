import React, { useState, useEffect, useRef } from 'react'
import './ReadingLesson.css'
import { speakText, stopSpeaking } from '../utils/voiceAgent'
import { saveProgress } from '../api/kvSync'
import { createSpeechRecognizer } from '../utils/speechRecognition'

const PRAISE_LINES = [
  'You got it! Great job!',
  'You are awesome, Kiara!',
  'Great job, Kiara!',
  "You're doing a great job reading!",
  'You are doing amazing!',
  'Kiara, way to go!',
  'Wow, that is right! Super work!',
  'Yes! You nailed it!',
  'High five, Kiara! You got it!',
  "I'm so proud of you!",
  'That is exactly right! Keep it up!',
  'Beautiful reading, Kiara!',
]

const DEFAULT_SIGHT_WORDS = ['the', 'and', 'is', 'are', 'it', 'we', 'go', 'my', 'he', 'she']
const DEFAULT_PHONICS_WORDS = ['cat', 'dog', 'sun', 'hat', 'big', 'red', 'fun', 'sit', 'hop', 'map']
const DEFAULT_STORY = 'The cat sat on the mat. It is a big red mat. The cat is happy.'

function randomPraise() {
  return PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)]
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function loadReadingConfig(studentId) {
  try {
    const raw = localStorage.getItem(`reading-config-${studentId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getSightWords(studentId) {
  const cfg = loadReadingConfig(studentId)
  const words = cfg?.sightWords
  if (Array.isArray(words) && words.length >= 5) return shuffle(words).slice(0, 5)
  return shuffle(DEFAULT_SIGHT_WORDS).slice(0, 5)
}

function getPhonicsWords(studentId) {
  const cfg = loadReadingConfig(studentId)
  const words = cfg?.phonicsWords
  if (Array.isArray(words) && words.length >= 5) return shuffle(words).slice(0, 5)
  return shuffle(DEFAULT_PHONICS_WORDS).slice(0, 5)
}

function getStory(studentId) {
  const cfg = loadReadingConfig(studentId)
  return cfg?.story || DEFAULT_STORY
}

function parseSentences(story) {
  return story.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
}

function wordOverlap(spoken, target) {
  const targetWords = target.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  const spokenWords = spoken.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  if (targetWords.length === 0) return 0
  const matches = targetWords.filter(w => spokenWords.includes(w))
  return matches.length / targetWords.length
}


export default function ReadingLesson({ studentId, onBack }) {
  const [phase, setPhase] = useState('intro')

  // Word phase state (shared by sight-words and phonics)
  const [wordList, setWordList] = useState([])
  const [wordIndex, setWordIndex] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('')
  const [wordLocked, setWordLocked] = useState(false)
  const wordLockedRef = useRef(false)

  // Score refs — avoid stale-closure bugs in async callbacks
  const sightScoreRef = useRef(0)
  const phonicsScoreRef = useRef(0)
  const storyScoreRef = useRef(0)
  const [sightScore, setSightScore] = useState(0)
  const [phonicsScore, setPhonicsScore] = useState(0)
  const [storyScore, setStoryScore] = useState(0)

  // Story phase state
  const [sentences, setSentences] = useState([])
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [sentenceLocked, setSentenceLocked] = useState(false)
  const sentenceLockedRef = useRef(false)

  // Word highlighting: which word Mrs. Love is currently saying (boundary event index)
  const [speakingWordIdx, setSpeakingWordIdx] = useState(-1)
  // Words Kiara has spoken so far in the current sentence (real-time via interimResults)
  const [kiaraSpokenWords, setKiaraSpokenWords] = useState(new Set())

  const [isListening, setIsListening] = useState(false)
  const recognizerRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    speakText("Hello, Kiara! Let's practice our reading today! We'll do sight words, sound out some words, and then read a story together!")
    return () => {
      recognizerRef.current?.stop()
      stopSpeaking()
    }
  }, [])

  // ── Sight words: say the word when it appears ────────────
  useEffect(() => {
    if (phase === 'sight-words' && wordList.length > 0) {
      const word = wordList[wordIndex]
      if (!word) return
      const timer = setTimeout(() => speakText(word, null, 0.75), 400)
      return () => clearTimeout(timer)
    }
  }, [wordIndex, phase, wordList])

  // ── Phonics: spell → sound out slowly → say normally ────
  useEffect(() => {
    if (phase === 'phonics' && wordList.length > 0) {
      const word = wordList[wordIndex]
      if (!word) return
      const letters = word.split('').join(', ')
      const timer = setTimeout(() => {
        speakText(letters, () => {           // "c, a, t"
          speakText(word, () => {            // "caaaat" (very slow — sounds it out)
            speakText(word, null, 0.85)      // "cat" (normal speed)
          }, 0.45)
        }, 0.7)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [wordIndex, phase, wordList])

  // ── Story: read sentence slowly with timer-based word highlight
  // (boundary events unreliable on Android Chrome — timers are cross-platform)
  useEffect(() => {
    if (phase === 'short-story' && sentences.length > 0) {
      const sentence = sentences[sentenceIndex]
      if (!sentence) return
      setSpeakingWordIdx(-1)
      setKiaraSpokenWords(new Set())

      const words = sentence.split(' ')
      const wordTimers = []

      const outerTimer = setTimeout(() => {
        speakText(sentence, () => setSpeakingWordIdx(-1), 0.55)

        // Fire one timer per word at estimated intervals for rate 0.55
        let offset = 100  // small lead so first highlight aligns with first word spoken
        words.forEach((word, wi) => {
          const t = setTimeout(() => setSpeakingWordIdx(wi), offset)
          wordTimers.push(t)
          offset += Math.max(350, word.length * 80)
        })
      }, 400)

      return () => {
        clearTimeout(outerTimer)
        wordTimers.forEach(clearTimeout)
        setSpeakingWordIdx(-1)
      }
    }
  }, [sentenceIndex, phase, sentences])

  // ── Intro ────────────────────────────────────────────────
  const handleStart = () => {
    sightScoreRef.current = 0
    phonicsScoreRef.current = 0
    storyScoreRef.current = 0
    setSightScore(0)
    setPhonicsScore(0)
    setStoryScore(0)

    const words = getSightWords(studentId)
    setWordList(words)
    setWordIndex(0)
    setAttemptCount(0)
    setFeedback('')
    setFeedbackType('')
    wordLockedRef.current = false
    setWordLocked(false)
    // Say intro once, then phase starts — useEffect speaks first word
    speakText("Let's start with some sight words!", () => setPhase('sight-words'))
  }

  // ── Word phase helpers ───────────────────────────────────
  const advanceWord = (currentPhase, currentIndex, currentWordList) => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= currentWordList.length) {
      if (currentPhase === 'sight-words') {
        speakText("Amazing work on those words! Now let's try sounding some out!", () => {
          const phonicsWords = getPhonicsWords(studentId)
          setWordList(phonicsWords)
          setWordIndex(0)
          setAttemptCount(0)
          setFeedback('')
          setFeedbackType('')
          wordLockedRef.current = false
          setWordLocked(false)
          setPhase('phonics')
          // useEffect auto-speaks first phonics word
        })
      } else {
        speakText("You are such a great reader! Now let's read a story!", () => {
          const story = getStory(studentId)
          const parsed = parseSentences(story)
          setSentences(parsed)
          setSentenceIndex(0)
          sentenceLockedRef.current = false
          setSentenceLocked(false)
          setFeedback('')
          setFeedbackType('')
          setPhase('short-story')
          // useEffect auto-speaks first sentence
        })
      }
    } else {
      setWordIndex(nextIndex)
      setAttemptCount(0)
      setFeedback('')
      setFeedbackType('')
      wordLockedRef.current = false
      setWordLocked(false)
      // useEffect auto-speaks next word
    }
  }

  // ── Word phase: "My turn!" ───────────────────────────────
  const handleReadWord = () => {
    if (isListening) { recognizerRef.current?.stop(); return }
    if (wordLockedRef.current) return
    stopSpeaking()

    const targetWord = wordList[wordIndex]
    const capturedPhase = phase
    const capturedIndex = wordIndex
    const capturedWordList = wordList
    let capturedAttempt = attemptCount
    const normalizedTarget = targetWord.toLowerCase().replace(/[^a-z]/g, '')

    const acceptWord = () => {
      if (wordLockedRef.current) return
      wordLockedRef.current = true
      setWordLocked(true)
      recognizerRef.current?.stop()
      setFeedback('✅ You got it!')
      setFeedbackType('correct')
      if (capturedPhase === 'sight-words') {
        sightScoreRef.current += 1
        setSightScore(sightScoreRef.current)
      } else {
        phonicsScoreRef.current += 1
        setPhonicsScore(phonicsScoreRef.current)
      }
      speakText(randomPraise(), () => advanceWord(capturedPhase, capturedIndex, capturedWordList))
    }

    const recognizer = createSpeechRecognizer({
      onInterim: ({ transcript }) => {
        // Match the moment the target word appears in Kiara's partial transcript
        if (wordLockedRef.current) return
        const words = transcript.replace(/[^a-z\s]/g, '').split(/\s+/)
        if (words.includes(normalizedTarget)) acceptWord()
      },
      onResult: ({ transcript, allTranscripts }) => {
        if (wordLockedRef.current) return
        recognizerRef.current?.stop()

        const allOptions = [transcript, ...(allTranscripts || [])]
        // Accept exact full-transcript match OR word appears anywhere in transcript
        const matched = allOptions.some(t => {
          const norm = t.toLowerCase().replace(/[^a-z\s]/g, '').trim()
          return norm === normalizedTarget || norm.split(/\s+/).includes(normalizedTarget)
        })

        if (matched) {
          acceptWord()
        } else {
          capturedAttempt += 1
          setAttemptCount(capturedAttempt)
          if (capturedAttempt >= 2) {
            wordLockedRef.current = true
            setWordLocked(true)
            setFeedback(`That word is "${targetWord}" — great try!`)
            setFeedbackType('hint')
            speakText(
              `That word is "${targetWord}". Can you say "${targetWord}"?`,
              () => setTimeout(() => advanceWord(capturedPhase, capturedIndex, capturedWordList), 1500)
            )
          } else {
            setFeedback("Let's try again!")
            setFeedbackType('hint')
            const spoken = capturedPhase === 'phonics' ? targetWord.split('').join(', ') : targetWord
            const rate = capturedPhase === 'phonics' ? 0.6 : 0.75
            speakText("Let's try again!", () => setTimeout(() => speakText(spoken, null, rate), 300))
          }
        }
      },
      onError: (err) => {
        setIsListening(false)
        if (err === 'not-supported') setFeedback('Voice not supported in this browser.')
        else if (err === 'not-allowed') setFeedback('Microphone permission needed.')
      },
      onEnd: () => setIsListening(false),
      timeout: 20000,
      continuous: true,
      useInterimResults: true,
    })

    // 500ms after TTS cancel so the audio engine fully clears before mic opens
    setTimeout(() => {
      if (!wordLockedRef.current) {
        recognizerRef.current = recognizer
        recognizer.start()
        setIsListening(true)
      }
    }, 500)
  }

  // ── Story phase ──────────────────────────────────────────
  const advanceSentence = (currentIndex, currentSentences) => {
    const next = currentIndex + 1
    if (next >= currentSentences.length) {
      saveProgress(studentId, {
        lesson: 'reading-lesson',
        lessonType: 'reading',
        sightWordsScore: sightScoreRef.current,
        phonicsScore: phonicsScoreRef.current,
        storyScore: storyScoreRef.current,
        storyTotal: currentSentences.length,
        correctAnswers: sightScoreRef.current + phonicsScoreRef.current + storyScoreRef.current,
        totalProblems: 10 + currentSentences.length,
        timestamp: new Date().toISOString(),
      })
      speakText('You did it! What an amazing reader you are!', () => setPhase('completion'))
    } else {
      setSentenceIndex(next)
      sentenceLockedRef.current = false
      setSentenceLocked(false)
      setFeedback('')
      setFeedbackType('')
      setSpeakingWordIdx(-1)
      setKiaraSpokenWords(new Set())
    }
  }

  const handleReadSentence = () => {
    if (isListening) { recognizerRef.current?.stop(); return }
    if (sentenceLockedRef.current) return
    stopSpeaking()
    setSpeakingWordIdx(-1)

    const targetSentence = sentences[sentenceIndex]
    const capturedIndex = sentenceIndex
    const capturedSentences = sentences
    const sentenceWords = targetSentence.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)

    // Accumulate all partial final results so a mid-sentence pause doesn't end early
    let accumulatedTranscript = ''

    const evaluateAndAdvance = () => {
      if (sentenceLockedRef.current) return
      sentenceLockedRef.current = true
      setSentenceLocked(true)
      setKiaraSpokenWords(new Set())

      const overlap = wordOverlap(accumulatedTranscript, targetSentence)
      if (overlap >= 0.7) {
        storyScoreRef.current += 1
        setStoryScore(storyScoreRef.current)
        setFeedback('✅ Great reading!')
        setFeedbackType('correct')
        speakText(randomPraise(), () => advanceSentence(capturedIndex, capturedSentences))
      } else {
        setFeedback("Good try! Let's keep going.")
        setFeedbackType('hint')
        speakText("Good try, Kiara! Let's keep going!", () => advanceSentence(capturedIndex, capturedSentences))
      }
    }

    const recognizer = createSpeechRecognizer({
      onResult: ({ transcript }) => {
        if (sentenceLockedRef.current) return
        // Append to running transcript so pauses don't cut us off early
        accumulatedTranscript = (accumulatedTranscript + ' ' + transcript).trim()

        // Score as soon as we have enough — don't wait for timeout
        if (wordOverlap(accumulatedTranscript, targetSentence) >= 0.7) {
          recognizerRef.current?.stop()
          evaluateAndAdvance()
        }
      },
      onInterim: ({ transcript }) => {
        // Bold words in real-time as Kiara speaks
        const spoken = new Set(transcript.replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean))
        setKiaraSpokenWords(new Set(sentenceWords.filter(w => spoken.has(w))))
      },
      onError: (err) => {
        setIsListening(false)
        if (err === 'not-supported') setFeedback('Voice not supported.')
        else if (err === 'not-allowed') setFeedback('Microphone permission needed.')
      },
      // onEnd fires on timeout or explicit stop — evaluate whatever we accumulated
      onEnd: () => {
        setIsListening(false)
        evaluateAndAdvance()
      },
      timeout: 25000,
      continuous: true,
      useInterimResults: true,
    })

    setTimeout(() => {
      if (!sentenceLockedRef.current) {
        recognizerRef.current = recognizer
        recognizer.start()
        setIsListening(true)
      }
    }, 500)
  }

  // ── Render ────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="reading-container">
        <button className="reading-back-btn" onClick={onBack}>← Back</button>
        <div className="reading-content">
          <div className="reading-character">👩🏾‍🏫</div>
          <p className="reading-speech">"Hello, Kiara! Let's practice our reading today! We'll do sight words, sound out some words, and then read a story together!"</p>
          <button className="reading-btn reading-btn-primary" onClick={handleStart}>📖 Let's Read!</button>
        </div>
      </div>
    )
  }

  if (phase === 'sight-words' || phase === 'phonics') {
    const currentWord = wordList[wordIndex] || ''
    const displayWord = phase === 'phonics'
      ? currentWord.split('').join(' · ')
      : currentWord
    const phaseLabel = phase === 'sight-words' ? 'Sight Words' : 'Phonics'

    return (
      <div className="reading-container">
        <button className="reading-back-btn" onClick={onBack}>← Back</button>
        <div className="reading-content">
          <div className="reading-progress-label">Word {wordIndex + 1} of {wordList.length} · {phaseLabel}</div>
          <div className="reading-word">{displayWord}</div>
          {feedback && <div className={`reading-feedback reading-feedback-${feedbackType}`}>{feedback}</div>}
          <button
            className={`reading-btn reading-btn-primary${isListening ? ' reading-btn-listening' : ''}`}
            onClick={handleReadWord}
            disabled={wordLocked}
          >
            {isListening ? '🎙️ Listening...' : '🎤 My turn!'}
          </button>
          <div className="reading-dots">
            {wordList.map((_, i) => (
              <span
                key={i}
                className={`reading-dot${i < wordIndex ? ' reading-dot-done' : i === wordIndex ? ' reading-dot-active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'short-story') {
    return (
      <div className="reading-container">
        <button className="reading-back-btn" onClick={onBack}>← Back</button>
        <div className="reading-content">
          <div className="reading-progress-label">Short Story · Sentence {sentenceIndex + 1} of {sentences.length}</div>
          <div className="reading-sentences">
            {sentences.map((s, i) => {
              const isActive = i === sentenceIndex
              const words = s.split(' ')
              return (
                <div
                  key={i}
                  className={`reading-sentence${isActive ? ' reading-sentence-active' : i < sentenceIndex ? ' reading-sentence-done' : ' reading-sentence-upcoming'}`}
                >
                  {isActive ? (
                    <>
                      {words.map((word, wi) => {
                        const clean = word.toLowerCase().replace(/[^a-z]/g, '')
                        const isMrsLove = wi === speakingWordIdx
                        const isKiara = kiaraSpokenWords.has(clean)
                        return (
                          <span
                            key={wi}
                            style={{
                              fontWeight: (isMrsLove || isKiara) ? 900 : undefined,
                              color: isKiara ? '#166534' : isMrsLove ? '#7c3aed' : undefined,
                              transition: 'font-weight 0.1s, color 0.1s',
                            }}
                          >
                            {word}{wi < words.length - 1 ? ' ' : ''}
                          </span>
                        )
                      })}.
                    </>
                  ) : (
                    <>{s}.</>
                  )}
                </div>
              )
            })}
          </div>
          {feedback && <div className={`reading-feedback reading-feedback-${feedbackType}`}>{feedback}</div>}
          <button
            className={`reading-btn reading-btn-story${isListening ? ' reading-btn-listening' : ''}`}
            onClick={handleReadSentence}
            disabled={sentenceLocked}
          >
            {isListening ? '🎙️ Listening...' : '🎤 My turn!'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'completion') {
    const totalCorrect = sightScore + phonicsScore + storyScore
    const totalProblems = 10 + sentences.length
    const pct = Math.round((totalCorrect / totalProblems) * 100)
    return (
      <div className="reading-container">
        <div className="reading-content reading-completion">
          <div className="reading-character">🎉</div>
          <h2>Amazing Reading, Kiara!</h2>
          <div className="reading-score-grid">
            <div className="reading-score-item"><span className="reading-score-num">{sightScore}/5</span><span className="reading-score-label">Sight Words</span></div>
            <div className="reading-score-item"><span className="reading-score-num">{phonicsScore}/5</span><span className="reading-score-label">Phonics</span></div>
            <div className="reading-score-item"><span className="reading-score-num">{storyScore}/{sentences.length}</span><span className="reading-score-label">Story</span></div>
          </div>
          <div className="reading-pct">{pct}% — {pct >= 80 ? '⭐ Superstar reader!' : 'Keep practicing!'}</div>
          <button className="reading-btn reading-btn-primary" onClick={onBack}>← Back to Home</button>
        </div>
      </div>
    )
  }

  return null
}
