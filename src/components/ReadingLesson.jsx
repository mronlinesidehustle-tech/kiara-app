import React, { useState, useRef } from 'react'
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

  // Score refs — refs avoid stale-closure bugs when reading values inside callbacks
  const sightScoreRef = useRef(0)
  const phonicsScoreRef = useRef(0)
  const storyScoreRef = useRef(0)
  // Mirror state for rendering the completion screen
  const [sightScore, setSightScore] = useState(0)
  const [phonicsScore, setPhonicsScore] = useState(0)
  const [storyScore, setStoryScore] = useState(0)

  // Story phase state
  const [sentences, setSentences] = useState([])
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [sentenceLocked, setSentenceLocked] = useState(false)
  const sentenceLockedRef = useRef(false)

  // Voice
  const [isListening, setIsListening] = useState(false)
  const recognizerRef = useRef(null)

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
    setPhase('sight-words')
    setTimeout(() => speakText("Let's start with some sight words! Can you read this word for me?"), 300)
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
          setTimeout(() => speakText("Let's sound this one out together — what does it say?"), 300)
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
          setTimeout(() => speakText("Now let's read our story together!"), 300)
        })
      }
    } else {
      setWordIndex(nextIndex)
      setAttemptCount(0)
      setFeedback('')
      setFeedbackType('')
      wordLockedRef.current = false
      setWordLocked(false)
      const prompt = currentPhase === 'sight-words'
        ? 'Can you read this word for me?'
        : "Let's sound this one out together — what does it say?"
      setTimeout(() => speakText(prompt), 300)
    }
  }

  // ── Word phase: handle "Read it!" tap ───────────────────
  const handleReadWord = () => {
    if (isListening) { recognizerRef.current?.stop(); return }
    if (wordLockedRef.current) return
    stopSpeaking()

    const targetWord = wordList[wordIndex]
    // Capture these in closure so they don't go stale inside onResult
    const capturedPhase = phase
    const capturedIndex = wordIndex
    const capturedWordList = wordList
    let capturedAttempt = attemptCount

    const recognizer = createSpeechRecognizer({
      onResult: ({ transcript, allTranscripts }) => {
        if (wordLockedRef.current) return
        const allOptions = [transcript, ...(allTranscripts || [])]
        const matched = allOptions.some(t => t.toLowerCase().trim() === targetWord.toLowerCase())

        if (matched) {
          wordLockedRef.current = true
          setWordLocked(true)
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
            setFeedback('Look closely — try again!')
            setFeedbackType('hint')
            speakText("Let's try again! Look at the word and say what you see.")
          }
        }
      },
      onError: (err) => {
        setIsListening(false)
        if (err === 'not-supported') setFeedback('Voice not supported in this browser.')
        else if (err === 'not-allowed') setFeedback('Microphone permission needed.')
      },
      onEnd: () => setIsListening(false),
    })

    if (recognizer) {
      recognizerRef.current = recognizer
      recognizer.start()
      setIsListening(true)
    }
  }
