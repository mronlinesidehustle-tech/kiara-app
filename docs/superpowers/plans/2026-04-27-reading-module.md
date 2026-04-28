# Reading Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a progressive reading lesson (Sight Words → Phonics → Short Story) to Kiara's learning app, coached by Mrs. Love with voice recognition and the same encouragement layer used in the math lessons.

**Architecture:** Single `ReadingLesson.jsx` component with a `phase` state variable driving what's rendered — mirrors the `step` pattern in `MathLesson1.jsx`. Parent content overrides stored in `localStorage`; completed session saved via the existing `saveProgress()` KV sync. Dashboard gets a reading progress section and a settings override form.

**Tech Stack:** React, Web Speech API (SpeechRecognition + SpeechSynthesis), localStorage, existing `speakText` / `createSpeechRecognizer` utilities.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/ReadingLesson.jsx` | All three reading phases + completion |
| Create | `src/components/ReadingLesson.css` | Styles scoped to reading lesson |
| Modify | `src/App.jsx` | Add `reading-lesson` route + home button |
| Modify | `src/components/ParentDashboard.jsx` | Reading progress display + settings override |

---

## Task 1: ReadingLesson.jsx — constants, config, and helpers

**Files:**
- Create: `src/components/ReadingLesson.jsx`

- [ ] **Step 1: Create the file with all constants and pure helper functions**

```jsx
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
  return story.split('.').map(s => s.trim()).filter(Boolean)
}

function wordOverlap(spoken, target) {
  const targetWords = target.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  const spokenWords = spoken.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  if (targetWords.length === 0) return 0
  const matches = targetWords.filter(w => spokenWords.includes(w))
  return matches.length / targetWords.length
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ReadingLesson.jsx
git commit -m "feat: add ReadingLesson constants and helpers"
```

---

## Task 2: ReadingLesson.jsx — intro screen + word phase

**Files:**
- Modify: `src/components/ReadingLesson.jsx`

- [ ] **Step 1: Add the main component with intro and word phase state**

Append after the helpers from Task 1:

```jsx
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
```

- [ ] **Step 2: Verify the file loads without syntax errors**

Run the dev server (`npm run dev`) and open the app. Console should be clean. The reading lesson button doesn't exist yet — that's fine.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReadingLesson.jsx
git commit -m "feat: add ReadingLesson intro and word phase logic"
```

---

## Task 3: ReadingLesson.jsx — story phase + completion + render

**Files:**
- Modify: `src/components/ReadingLesson.jsx`

- [ ] **Step 1: Add story phase, completion, and render tree**

Append after `handleReadWord` inside the component:

```jsx
  // ── Story phase: handle "Read this sentence!" tap ────────
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
    }
  }

  const handleReadSentence = () => {
    if (isListening) { recognizerRef.current?.stop(); return }
    if (sentenceLockedRef.current) return
    stopSpeaking()

    const targetSentence = sentences[sentenceIndex]
    const capturedIndex = sentenceIndex
    const capturedSentences = sentences

    const recognizer = createSpeechRecognizer({
      onResult: ({ transcript }) => {
        if (sentenceLockedRef.current) return
        sentenceLockedRef.current = true
        setSentenceLocked(true)
        const overlap = wordOverlap(transcript, targetSentence)
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
      },
      onError: (err) => {
        setIsListening(false)
        if (err === 'not-supported') setFeedback('Voice not supported.')
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
    const prompt = phase === 'sight-words'
      ? '👩🏾‍🏫 "Can you read this word for me?"'
      : '👩🏾‍🏫 "Let\'s sound this one out — what does it say?"'

    return (
      <div className="reading-container">
        <button className="reading-back-btn" onClick={onBack}>← Back</button>
        <div className="reading-content">
          <div className="reading-progress-label">Word {wordIndex + 1} of {wordList.length} · {phaseLabel}</div>
          <p className="reading-speech">{prompt}</p>
          <div className="reading-word">{displayWord}</div>
          {feedback && <div className={`reading-feedback reading-feedback-${feedbackType}`}>{feedback}</div>}
          <button
            className={`reading-btn reading-btn-primary${isListening ? ' reading-btn-listening' : ''}`}
            onClick={handleReadWord}
            disabled={wordLocked}
          >
            {isListening ? '🎙️ Listening...' : '🎤 Read it!'}
          </button>
          <div className="reading-dots">
            {wordList.map((_, i) => (
              <span key={i} className={`reading-dot${i < wordIndex ? ' reading-dot-done' : i === wordIndex ? ' reading-dot-active' : ''}`} />
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
          <p className="reading-speech">👩🏾‍🏫 "Now let's read our story together!"</p>
          <div className="reading-sentences">
            {sentences.map((s, i) => (
              <div
                key={i}
                className={`reading-sentence${i === sentenceIndex ? ' reading-sentence-active' : i < sentenceIndex ? ' reading-sentence-done' : ' reading-sentence-upcoming'}`}
              >
                {s}.
              </div>
            ))}
          </div>
          {feedback && <div className={`reading-feedback reading-feedback-${feedbackType}`}>{feedback}</div>}
          <button
            className={`reading-btn reading-btn-story${isListening ? ' reading-btn-listening' : ''}`}
            onClick={handleReadSentence}
            disabled={sentenceLocked}
          >
            {isListening ? '🎙️ Listening...' : '🎤 Read this sentence!'}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ReadingLesson.jsx
git commit -m "feat: add ReadingLesson story phase, completion screen, and render tree"
```

---

## Task 4: ReadingLesson.css

**Files:**
- Create: `src/components/ReadingLesson.css`

- [ ] **Step 1: Create the stylesheet**

```css
.reading-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%);
}

.reading-back-btn {
  align-self: flex-start;
  background: none;
  border: none;
  font-size: 1rem;
  color: #6d28d9;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 8px;
}

.reading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 480px;
  text-align: center;
  gap: 16px;
}

.reading-character {
  font-size: 4rem;
}

.reading-speech {
  background: white;
  border-radius: 16px;
  padding: 14px 20px;
  font-size: 1rem;
  color: #4c1d95;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin: 0;
}

.reading-progress-label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
}

.reading-word {
  font-size: 3.5rem;
  font-weight: 900;
  color: #1e293b;
  letter-spacing: 2px;
  margin: 8px 0;
}

.reading-feedback {
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 12px;
}

.reading-feedback-correct {
  background: #dcfce7;
  color: #166534;
}

.reading-feedback-hint {
  background: #fef3c7;
  color: #92400e;
}

.reading-btn {
  border: none;
  border-radius: 24px;
  padding: 14px 36px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}

.reading-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reading-btn-primary {
  background: #7c3aed;
  color: white;
}

.reading-btn-story {
  background: #d97706;
  color: white;
}

.reading-btn-listening {
  background: #dc2626 !important;
  animation: reading-pulse 1s ease-in-out infinite;
}

@keyframes reading-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.75; }
}

.reading-dots {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.reading-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e1;
  display: inline-block;
}

.reading-dot-done { background: #86efac; }
.reading-dot-active { background: #7c3aed; }

/* Story phase */
.reading-sentences {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.reading-sentence {
  border-radius: 14px;
  padding: 14px 20px;
  font-weight: 600;
  transition: background 0.2s;
}

.reading-sentence-active {
  background: #fef9c3;
  font-size: 1.3rem;
  color: #1e293b;
}

.reading-sentence-done {
  background: #dcfce7;
  color: #166534;
  font-size: 1rem;
}

.reading-sentence-upcoming {
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 1rem;
}

/* Completion */
.reading-completion {
  padding-top: 24px;
}

.reading-completion h2 {
  font-size: 1.8rem;
  color: #1e293b;
  margin: 0;
}

.reading-score-grid {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.reading-score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: white;
  border-radius: 16px;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.reading-score-num {
  font-size: 2rem;
  font-weight: 900;
  color: #7c3aed;
}

.reading-score-label {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 4px;
}

.reading-pct {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}
```

- [ ] **Step 2: Verify in browser**

Dev server should show no CSS errors in console.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReadingLesson.css
git commit -m "feat: add ReadingLesson styles"
```

---

## Task 5: Wire App.jsx — route and home button

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Import ReadingLesson and add the route**

At the top of `src/App.jsx`, add the import after the existing lesson imports:

```jsx
import ReadingLesson from './components/ReadingLesson'
```

Inside the `App` component's return, add the reading route after the `math-lesson-2` block (around line 55):

```jsx
      {page === 'reading-lesson' && (
        <ReadingLesson
          studentId={studentId}
          onBack={() => setPage('home')}
        />
      )}
```

- [ ] **Step 2: Add the home button**

Inside `HomePage`'s `button-group` div, add the reading button after the subtraction button (around line 86):

```jsx
          <button className="btn btn-primary" onClick={() => onSelectLesson('reading-lesson')}>
            📖 Start Reading Lesson
          </button>
```

- [ ] **Step 3: Verify in browser**

- Home screen shows "📖 Start Reading Lesson" button
- Tapping it enters the intro screen with Mrs. Love's greeting
- "← Back" returns to home

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire reading-lesson route and home button"
```

---

## Task 6: ParentDashboard — reading progress display

**Files:**
- Modify: `src/components/ParentDashboard.jsx`

- [ ] **Step 1: Read the current ParentDashboard render to find where to insert**

The sessions list is rendered in the `sessions.length > 0` branch. Add a reading-specific section. Find the block that maps over sessions and add a filter to separate reading from math sessions, then render reading sessions below the existing math sessions display.

Add this helper at the top of the component function (after `const [isSharedLink, setIsSharedLink] = useState(false)`):

```jsx
  const readingSessions = sessions.filter(s => s.lessonType === 'reading')
  const mathSessions = sessions.filter(s => !s.lessonType || s.lessonType !== 'reading')
```

- [ ] **Step 2: Add reading sessions display**

In the `sessions.length > 0` branch of the render, after the existing sessions list, add:

```jsx
        {readingSessions.length > 0 && (
          <div className="dashboard-section" style={{ marginTop: 32 }}>
            <h3>📖 Reading Sessions</h3>
            {readingSessions.map((session, i) => (
              <div key={i} className="session-card">
                <div className="session-date">{new Date(session.timestamp).toLocaleDateString()}</div>
                <div className="session-scores">
                  <span>Sight Words: {session.sightWordsScore ?? '—'}/5</span>
                  <span>Phonics: {session.phonicsScore ?? '—'}/5</span>
                  <span>Story: {session.storyScore ?? '—'}/{session.storyTotal ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
```

- [ ] **Step 3: Verify in browser**

Complete a reading lesson, then open the Parent Dashboard. The reading session should appear in the Reading Sessions section.

- [ ] **Step 4: Commit**

```bash
git add src/components/ParentDashboard.jsx
git commit -m "feat: add reading sessions display to ParentDashboard"
```

---

## Task 7: ParentDashboard — reading settings override

**Files:**
- Modify: `src/components/ParentDashboard.jsx`

- [ ] **Step 1: Add reading settings state to ParentDashboard**

At the top of the `ParentDashboard` component, add:

```jsx
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
```

- [ ] **Step 2: Add the settings form to the render**

At the bottom of the dashboard content (before the closing `</div>` of `dashboard-content`), add:

```jsx
        <div className="dashboard-section" style={{ marginTop: 32 }}>
          <h3>📖 Reading Settings</h3>
          <p style={{ fontSize: '0.9em', color: '#64748b' }}>Leave blank to use the built-in defaults.</p>

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
```

- [ ] **Step 3: Verify in browser**

- Open Parent Dashboard — Reading Settings section appears
- Enter custom sight words and save — complete a reading lesson — confirm custom words appear
- Hit Reset to Defaults — confirm the lesson reverts to the built-in word lists

- [ ] **Step 4: Commit**

```bash
git add src/components/ParentDashboard.jsx
git commit -m "feat: add reading settings override to ParentDashboard"
```

---

## Self-Review

### Spec coverage
| Spec requirement | Task |
|-----------------|------|
| Sight words phase (5 words, random from pool of 10) | Task 2 |
| Phonics phase (5 CVC words, letter-spaced display) | Task 2 |
| Short story phase (sentence-by-sentence, 70% overlap) | Task 3 |
| Mrs. Love praise on correct, sounds out on struggle | Task 2 & 3 |
| Max 2 retry attempts per word | Task 2 |
| Phase transition encouragement lines | Task 2 |
| Completion screen with per-phase scores | Task 3 |
| Voice-only (no typing) | Task 2 & 3 |
| saveProgress with lessonType: "reading" | Task 3 |
| Home screen reading button | Task 5 |
| Parent dashboard reading sessions display | Task 6 |
| Parent settings override (words + story) | Task 7 |
| Falls back to defaults when config absent/invalid | Task 1 |
| Score refs to avoid stale closure bugs | Task 2 |

### Placeholder scan
No TBDs, TODOs, or "implement later" references found.

### Type consistency
- `wordList`, `wordIndex`, `wordLocked`, `wordLockedRef` used consistently across Task 2 and Task 3's render
- `sentenceIndex`, `sentences`, `sentenceLocked`, `sentenceLockedRef` consistent in Task 3
- `sightScoreRef`, `phonicsScoreRef`, `storyScoreRef` written and read consistently in Tasks 2, 3
- `reading-config-${studentId}` localStorage key matches between Task 1 (`loadReadingConfig`) and Task 7 (`handleSaveReadingConfig`)
- `lessonType: 'reading'` field saved in Task 3 matches the filter in Task 6
