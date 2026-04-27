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
