/**
 * Text-to-Speech using Web Speech API
 * Mrs. Love voice (African American woman, warm & encouraging)
 */

export function speakText(text) {
  if (!('speechSynthesis' in window)) {
    console.log('Speech Synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Voice settings for Mrs. Love
  utterance.rate = 0.9; // Slightly slower for clarity
  utterance.pitch = 1.2; // Warmer, slightly higher pitch
  utterance.volume = 1;

  // Try to select female voice (varies by browser/OS)
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(
    voice => voice.name.includes('Female') || voice.name.includes('woman')
  ) || voices.find(voice => voice.lang === 'en-US');

  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// Load voices when available
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
