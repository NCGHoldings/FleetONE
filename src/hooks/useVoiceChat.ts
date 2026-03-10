import { useState, useCallback, useRef, useEffect } from 'react';

// ────────────────────────────────────────────
// Voice Chat Hook v2
// Speech-to-Text (Microphone) + Text-to-Speech (AI Speaks)
// Supports: English, Sinhala, Tamil
// Falls back gracefully when voices are unavailable
// ────────────────────────────────────────────

// Speech Recognition language codes
// NOTE: Most browsers only support English for speech-to-text.
// For Sinhala/Tamil, we capture in English (romanized Sinhala/Tamil)
// and the AI backend detects and responds in the correct language.
const langCodes: Record<string, string> = {
  en: 'en-US',
  si: 'en-US',  // Capture romanized Sinhala → AI detects & responds in Sinhala
  ta: 'en-US',  // Capture romanized Tamil → AI detects & responds in Tamil
  auto: 'en-US',
};

// Fallback chain: if Sinhala TTS not available, try English
const ttsFallbacks: Record<string, string[]> = {
  en: ['en-US', 'en-GB', 'en'],
  si: ['si-LK', 'si', 'en-US', 'en'],  // Sinhala → fallback to English
  ta: ['ta-IN', 'ta-LK', 'ta', 'en-US', 'en'],  // Tamil → fallback to English
  auto: ['en-US', 'en'],
};

export function useVoiceChat(language: string = 'en') {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try {
      return localStorage.getItem('ncg_ai_voice_enabled') !== 'false';
    } catch { return true; }
  });
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check browser support and load voices
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const hasRecognition = !!SpeechRecognition;
    const hasSynthesis = !!window.speechSynthesis;
    setIsSupported(hasRecognition || hasSynthesis);
    synthRef.current = window.speechSynthesis || null;

    // Load voices (they load asynchronously in Chrome)
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      setAvailableVoices(voices);
      console.log(`[Voice] Loaded ${voices.length} voices`);
    };

    loadVoices();
    // Chrome fires voiceschanged event when voices are ready
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Save voice preference
  useEffect(() => {
    try {
      localStorage.setItem('ncg_ai_voice_enabled', String(voiceEnabled));
    } catch { /* ignore */ }
  }, [voiceEnabled]);

  // Find the best voice for the given language
  const findVoice = useCallback((lang: string): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;

    const fallbacks = ttsFallbacks[lang] || ttsFallbacks['en'];

    for (const targetLang of fallbacks) {
      // Exact match first
      const exact = availableVoices.find(v => v.lang === targetLang);
      if (exact) return exact;

      // Prefix match
      const prefix = targetLang.split('-')[0];
      const prefixMatch = availableVoices.find(v => v.lang.startsWith(prefix));
      if (prefixMatch) return prefixMatch;
    }

    // Last resort: any English voice
    return availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0] || null;
  }, [availableVoices]);

  // Start listening (Speech-to-Text)
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('[Voice] SpeechRecognition not supported');
      return;
    }

    // Stop any current speech
    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = langCodes[language] || 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log(`[Voice] Listening started (capture: ${recognition.lang}, UI lang: ${language})`);
        if (language === 'si' || language === 'ta') {
          console.log('[Voice] Sinhala/Tamil voice: capturing in English — AI will detect and respond in correct language');
        }
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('[Voice] Recognition error:', event.error);
        setIsListening(false);

        // If permission denied, log helpful message
        if (event.error === 'not-allowed') {
          console.error('[Voice] Microphone permission denied. Please allow microphone access.');
        }
      };

      recognition.onend = () => {
        console.log('[Voice] Listening ended');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('[Voice] Failed to start recognition:', e);
      setIsListening(false);
    }
  }, [language]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { /* ignore */ }
      setIsListening(false);
    }
  }, []);

  // Speak text (Text-to-Speech)
  const speak = useCallback((text: string, lang?: string) => {
    if (!synthRef.current || !voiceEnabled) {
      console.log('[Voice] TTS disabled or not available');
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    // Detect if text contains Sinhala or Tamil Unicode
    // Browsers can't speak these languages — skip TTS gracefully
    const sinhalaCount = (text.match(/[\u0D80-\u0DFF]/g) || []).length;
    const tamilCount = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
    const totalNonLatin = sinhalaCount + tamilCount;

    if (totalNonLatin > 10) {
      console.log(`[Voice] Response is in Sinhala/Tamil (${sinhalaCount} si, ${tamilCount} ta chars) — browser TTS cannot speak this language. Showing text only.`);
      // Don't attempt to speak — browser would read gibberish
      return;
    }

    // Clean up text for speech (remove emojis, markdown, etc.)
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/[─═]/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!cleanText) return;

    const speechLang = lang || language;
    const voice = findVoice(speechLang);

    if (!voice) {
      console.warn('[Voice] No voice found for language:', speechLang);
      return;
    }

    console.log(`[Voice] Speaking (${voice.name} / ${voice.lang}): "${cleanText.slice(0, 50)}..."`);

    // Split long text into chunks (browsers have char limits for TTS)
    const chunks = splitTextForSpeech(cleanText, 180);

    const speakChunk = (index: number) => {
      if (index >= chunks.length || !synthRef.current) {
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        // Chrome bug: need to resume speech synthesis periodically
        if (synthRef.current?.paused) {
          synthRef.current.resume();
        }
        speakChunk(index + 1);
      };
      utterance.onerror = (e) => {
        console.error('[Voice] Speech error:', e);
        setIsSpeaking(false);
      };

      synthRef.current?.speak(utterance);

      // Chrome bug workaround: Chrome pauses utterances after ~15s
      // Resume every 10 seconds to prevent this
      if (chunks[index].length > 100) {
        const resumeInterval = setInterval(() => {
          if (synthRef.current?.speaking && synthRef.current?.paused) {
            synthRef.current.resume();
          } else if (!synthRef.current?.speaking) {
            clearInterval(resumeInterval);
          }
        }, 10000);
      }
    };

    speakChunk(0);
  }, [voiceEnabled, language, findVoice]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Toggle voice on/off
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      const newVal = !prev;
      if (!newVal && synthRef.current?.speaking) {
        synthRef.current.cancel();
        setIsSpeaking(false);
      }
      return newVal;
    });
  }, []);

  return {
    isListening,
    isSpeaking,
    voiceEnabled,
    transcript,
    isSupported,
    availableVoices,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoice,
    setTranscript,
  };
}

// Split text into speakable chunks at sentence boundaries
function splitTextForSpeech(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}
