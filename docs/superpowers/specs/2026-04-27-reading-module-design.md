# Reading Module Design

**Date:** 2026-04-27  
**Status:** Approved

---

## Overview

A progressive reading lesson for Kiara that runs as a single sitting session covering three phases: Sight Words → Phonics → Short Story. Mrs. Love coaches throughout with the same voice encouragement layer used in the math lessons.

---

## Architecture

### New files
- `src/components/ReadingLesson.jsx` — single component, all three phases
- `src/components/ReadingLesson.css` — styles

### Modified files
- `src/App.jsx` — add `reading-lesson` route + "📖 Start Reading Lesson" home button
- `src/components/ParentDashboard.jsx` — add reading progress tab + reading settings override section

### Approach
Single component with a `phase` state variable driving what's rendered — mirrors the `step` pattern in `MathLesson1.jsx`. No new abstractions.

**Phase state machine:**
```
intro → sight-words → phonics → short-story → completion
```

### Data flow
- Default word lists and story are hardcoded constants in `ReadingLesson.jsx`
- Parent overrides stored in `localStorage` under key `reading-config-{studentId}`
- On session start, component reads localStorage and falls back to defaults if nothing set
- Completed session saved via `saveProgress()` (same KV sync as math lessons)

---

## Phases & Content

### Phase 1 — Sight Words (5 words)
- **Default pool (10 words, 5 chosen randomly per session):** the, and, is, are, it, we, go, my, he, she
- **Flow per word:**
  1. Mrs. Love says: *"Can you read this word for me?"*
  2. Word shown large on screen
  3. Kiara taps **🎤 Read it!** and reads aloud
  4. ✅ Match → random praise line spoken
  5. ❌ Mismatch → Mrs. Love sounds out the word: *"That word is 'the' — can you say 'the'?"* → Kiara retries (max 2 attempts, then moves on with encouragement)
- **Phase transition line:** *"Amazing work on those words! Now let's try sounding some out!"*

### Phase 2 — Phonics (5 words)
- **Default pool (10 CVC words, 5 chosen randomly):** cat, dog, sun, hat, big, red, fun, sit, hop, map
- **Flow per word:** Same match/hint/retry logic as Phase 1
- Words displayed with slightly spaced letters to hint at sounding out (e.g., `c · a · t`)
- Mrs. Love intro: *"Let's sound this one out together — what does it say?"*
- **Phase transition line:** *"You are such a great reader! Now let's read a story!"*

### Phase 3 — Short Story
- **Default story:** *"The cat sat on the mat. It is a big red mat. The cat is happy."*
- Story shown sentence by sentence; active sentence highlighted in yellow, upcoming sentences dimmed
- Kiara taps **🎤 Read this sentence!** per sentence
- Matching: ≥70% word overlap counts as correct (loose match for fluency)
- Mrs. Love intro: *"Now let's read our story together!"*

---

## Encouragement Layer

Defines its own `PRAISE_LINES` constant (same pool as the math lessons) and reuses `speakText` / voice agent infrastructure:

| Moment | Mrs. Love response |
|--------|-------------------|
| Correct read | Random line from `PRAISE_LINES` |
| Struggle / mismatch | Models the word, invites retry (max 2x) |
| Phase transition | Unique motivational line between each phase |
| Completion | Celebration + score screen (same pattern as math) |

---

## UI

### Word screen (Phases 1 & 2)
- Progress indicator (e.g., "Word 2 of 5 · Sight Words")
- Mrs. Love speech bubble
- Large word display (centered, bold)
- Single **🎤 Read it!** button — voice only, no typing
- Dot progress tracker at bottom

### Story screen (Phase 3)
- Active sentence highlighted (yellow background, large)
- Upcoming sentences dimmed (grey)
- **🎤 Read this sentence!** button
- Sentence advances after each read

### Home screen
New button added below the two math lesson buttons:
```
📖 Start Reading Lesson
```

---

## Parent Dashboard

### Reading progress tab
Each completed session saves:
- `lessonType: "reading"`
- `sightWordsScore` — correct out of 5
- `phonicsScore` — correct out of 5
- `storyScore` — sentences correct out of total
- `totalCorrect / totalProblems` — for aggregate stats
- `date / studentId` — same as math

Dashboard gets a **"📖 Reading"** section alongside existing math sessions.

### Reading Settings override (inside dashboard)
Parent can customize:
- **Sight words** — comma-separated list (min 5)
- **Phonics words** — comma-separated list (min 5)
- **Short story** — free text (sentences separated by periods)
- **Save** button — writes to `localStorage` under `reading-config-{studentId}`
- **Reset to Defaults** button — clears override, falls back to hardcoded defaults

---

## Out of scope (this version)
- Server-side storage of reading config (localStorage only for now)
- Recording/playback of Kiara's reads
- Multiple stories or story progression levels
