import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  language?: string;
  timestamp: Date;
  isLoading?: boolean;
}

export type ChatLanguage = 'en' | 'si' | 'ta' | 'auto';

interface UseAIChatbotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  language: ChatLanguage;
  setLanguage: (lang: ChatLanguage) => void;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  error: string | null;
  sessionToken: string | null;
}

const STORAGE_KEY = 'ncg_ai_chat_session';
const MESSAGES_KEY = 'ncg_ai_chat_messages';

export function useAIChatbot(): UseAIChatbotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch { /* ignore */ }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<ChatLanguage>(() => {
    try {
      return (localStorage.getItem('ncg_ai_chat_lang') as ChatLanguage) || 'auto';
    } catch { return 'auto'; }
  });
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch { return null; }
  });

  const retryCountRef = useRef(0);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      const toSave = messages.filter(m => !m.isLoading).slice(-50); // Keep last 50 messages
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, [messages]);

  // Save language preference
  useEffect(() => {
    try {
      localStorage.setItem('ncg_ai_chat_lang', language);
    } catch { /* ignore */ }
  }, [language]);

  // Save session token
  useEffect(() => {
    if (sessionToken) {
      try {
        localStorage.setItem(STORAGE_KEY, sessionToken);
      } catch { /* ignore */ }
    }
  }, [sessionToken]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);

    // Add user message optimistically
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      language: language === 'auto' ? undefined : language,
      timestamp: new Date(),
    };

    // Add loading indicator
    const loadingMsg: ChatMessage = {
      id: 'loading-' + crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      // Use direct fetch for better error handling (supabase.functions.invoke swallows error body)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          message: text.trim(),
          session_token: sessionToken,
          language: language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 429) {
          throw new Error('Gemini API rate limit reached. Please wait 30 seconds and try again.');
        }
        throw new Error(data?.error || `Server error (${response.status})`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Save session token
      if (data?.session_token) {
        setSessionToken(data.session_token);
      }

      // Replace loading message with actual response
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.response || 'Sorry, I could not generate a response.',
        language: data?.language || 'en',
        timestamp: new Date(),
      };

      setMessages(prev =>
        prev.filter(m => !m.isLoading).concat(assistantMsg)
      );

      retryCountRef.current = 0;
    } catch (err: any) {
      console.error('AI Chatbot error:', err);

      // Remove loading message
      setMessages(prev => prev.filter(m => !m.isLoading));

      const errorContent = err?.message || 'Failed to send message. Please try again.';
      setError(errorContent);

      // Add descriptive error message from bot
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorContent.includes('rate limit')
          ? (language === 'si' ? '⏳ Gemini API අනුපාත සීමාව ළඟා වී ඇත. තත්පර 30ක් ඉන්න, ඉන්පසු නැවත උත්සාහ කරන්න.' :
             language === 'ta' ? '⏳ Gemini API வரம்பு எட்டப்பட்டது. 30 வினாடிகள் காத்திருந்து மீண்டும் முயற்சிக்கவும்.' :
             '⏳ Gemini API rate limit reached. Please wait 30 seconds and try again.')
          : (language === 'si' ? 'සමාවන්න, දෝෂයක් ඇති විය. කරුණාකර නැවත උත්සාහ කරන්න. 🙏' :
             language === 'ta' ? 'மன்னிக்கவும், பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும். 🙏' :
             `Oops! ${errorContent} 🙏`),
        language: language === 'auto' ? 'en' : language,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, language, sessionToken]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionToken(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MESSAGES_KEY);
    } catch { /* ignore */ }
  }, []);

  return {
    messages,
    isLoading,
    language,
    setLanguage,
    sendMessage,
    clearChat,
    error,
    sessionToken,
  };
}
