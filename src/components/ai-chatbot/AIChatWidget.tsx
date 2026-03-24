import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Trash2, Globe, Minimize2, Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';
import { useAIChatbot, ChatLanguage } from '@/hooks/useAIChatbot';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { ChatMessage } from './ChatMessage';
import { QuickReplies } from './QuickReplies';
import { cn } from '@/lib/utils';

const languageOptions: { value: ChatLanguage; label: string; flag: string }[] = [
  { value: 'auto', label: 'Auto Detect', flag: '🌐' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'si', label: 'සිංහල', flag: '🇱🇰' },
  { value: 'ta', label: 'தமிழ்', flag: '🇱🇰' },
];

const welcomeMessages: Record<string, string> = {
  en: "👋 Hello! Welcome to NCG Holdings. I'm your AI assistant and I can look up real data instantly! Try me:\n\n🏫 School Fees — Give me an admission number (e.g., N12345)\n🚌 Bus Hire Cost — Tell me from where to where\n🚍 Yutong Bus sales & specs\n🚛 Sinotruck details & pricing\n\n🎤 You can also talk to me using the microphone!\n\nHow can I help you today?",
  si: "👋 ආයුබෝවන්! NCG Holdings වෙත සාදරයෙන් පිළිගනිමු. මම ඔබේ AI සහායකයාය. මට ඔබට ක්ෂණිකව සැබෑ තොරතුරු ලබා දිය හැකිය!\n\n🏫 පාසල් ගාස්තු — ඇතුළත් අංකය දෙන්න (උදා: N12345)\n🚌 බස් කුලී මිල — කොතැනින් කොතැනට ද කියන්න\n🚍 යුටොං බස් විස්තර\n🚛 Sinotruck තොරතුරු සහ මිල\n\n🎤 මයික්‍රෆෝනය ඔබා කතා කරන්න!\n\nඅද මම ඔබට කෙසේ උදව් කළ හැකිද?",
  ta: "👋 வணக்கம்! NCG Holdings க்கு வரவேற்கிறோம். நான் உங்கள் AI உதவியாளர். உண்மையான தகவல்களை உடனடியாக வழங்க முடியும்!\n\n🏫 பள்ளி கட்டணம் — சேர்க்கை எண் கொடுங்கள் (எ.கா: N12345)\n🚌 பேருந்து வாடகை — எங்கிருந்து எங்கு என்று சொல்லுங்கள்\n🚍 யுடோங் பேருந்து விவரங்கள்\n🚛 சைனோட்ரக் விவரங்கள் & விலை\n\n🎤 மைக்ரோஃபோன் பொத்தானை அழுத்தி பேசுங்கள்!\n\nஇன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
};

export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);

  const {
    messages,
    isLoading,
    language,
    setLanguage,
    sendMessage,
    clearChat,
    error,
  } = useAIChatbot();

  const {
    isListening,
    isSpeaking,
    voiceEnabled,
    transcript,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoice,
    setTranscript,
  } = useVoiceChat(language);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Update input field with voice transcript
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-send when voice stops and we have text
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      // Small delay to capture final transcript
      const timer = setTimeout(() => {
        if (transcript.trim()) {
          sendMessage(transcript.trim());
          setInput('');
          setTranscript('');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript]);

  // Auto-speak new assistant messages
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.isLoading && voiceEnabled) {
        speak(lastMsg.content, lastMsg.language);
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, voiceEnabled, speak]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    setTranscript('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const effectiveLang = language === 'auto' ? 'en' : language;
  const welcomeMsg = welcomeMessages[effectiveLang] || welcomeMessages.en;
  const showWelcome = messages.length === 0;

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 rounded-full shadow-2xl transition-all duration-300 ease-in-out',
          'hover:scale-110 active:scale-95',
          isOpen
            ? 'bg-destructive text-destructive-foreground w-12 h-12'
            : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground w-14 h-14'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open NCG AI Chat'}
      >
        {isOpen ? (
          <X className="h-5 w-5 mx-auto" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6 mx-auto" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-[400px] max-h-[620px] flex flex-col',
          'bg-background border border-border rounded-2xl shadow-2xl',
          'transition-all duration-300 ease-in-out origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-sm font-bold">
                AI
              </div>
              <span className={cn(
                "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
                isSpeaking ? "bg-orange-500 animate-pulse" : "bg-green-500"
              )} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">NCG AI Assistant</h3>
              <p className="text-[10px] text-muted-foreground">
                {isSpeaking
                  ? (language === 'si' ? '🔊 කතා කරමින්...' : language === 'ta' ? '🔊 பேசுகிறது...' : '🔊 Speaking...')
                  : isListening
                    ? (language === 'si' ? '🎤 සවන් දෙමින්...' : language === 'ta' ? '🎤 கேட்கிறது...' : '🎤 Listening...')
                    : `${languageOptions.find(l => l.value === language)?.flag} ${languageOptions.find(l => l.value === language)?.label}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {/* Voice toggle */}
            {voiceSupported && (
              <button
                onClick={toggleVoice}
                className={cn("p-1.5 rounded-lg transition-colors", voiceEnabled ? "text-primary hover:bg-accent" : "text-muted-foreground hover:bg-accent")}
                title={voiceEnabled ? "Voice On" : "Voice Off"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            )}

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                title="Change language"
              >
                <Globe className="h-4 w-4 text-muted-foreground" />
              </button>
              {showLanguageMenu && (
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[140px] z-[60]">
                  {languageOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setLanguage(opt.value); setShowLanguageMenu(false); }}
                      className={cn(
                        'w-full px-3 py-1.5 text-left text-sm hover:bg-accent flex items-center gap-2',
                        language === opt.value && 'bg-accent font-medium'
                      )}
                    >
                      <span>{opt.flag}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={clearChat} className="p-1.5 hover:bg-accent rounded-lg transition-colors" title="Clear chat">
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-accent rounded-lg transition-colors" title="Minimize">
              <Minimize2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[300px] max-h-[400px] space-y-0">
          {showWelcome && (
            <div className="mb-3">
              <ChatMessage role="assistant" content={welcomeMsg} language={effectiveLang} timestamp={new Date()} />
              <div className="mt-3">
                <QuickReplies language={language} onSelect={handleQuickReply} disabled={isLoading} />
              </div>
            </div>
          )}

          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              language={msg.language}
              timestamp={msg.timestamp}
              isLoading={msg.isLoading}
            />
          ))}

          {!showWelcome && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.isLoading && (
            <div className="mt-2">
              <QuickReplies language={language} onSelect={handleQuickReply} disabled={isLoading} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Listening indicator */}
        {isListening && (
          <div className="px-4 py-2 bg-primary/5 border-t flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
            </div>
            <span className="text-xs text-muted-foreground">
              {language === 'si' ? 'සවන් දෙමින්... කතා කරන්න' : language === 'ta' ? 'கேட்கிறது... பேசுங்கள்' : 'Listening... speak now'}
            </span>
            {transcript && <span className="text-xs text-foreground font-medium truncate flex-1">"{transcript}"</span>}
          </div>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="px-4 py-1.5 bg-orange-50 dark:bg-orange-900/10 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">
                {language === 'si' ? 'AI කතා කරමින්...' : language === 'ta' ? 'AI பேசுகிறது...' : 'AI is speaking...'}
              </span>
            </div>
            <button onClick={stopSpeaking} className="p-1 hover:bg-accent rounded" title="Stop">
              <Square className="h-3 w-3 text-destructive" />
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="px-4 py-1.5 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">
            {error}
          </div>
        )}

        {/* Input Area */}
        <div className="px-3 py-3 border-t bg-muted/30 rounded-b-2xl">
          <div className="flex items-center gap-2">
            {/* Microphone button */}
            {voiceSupported && (
              <button
                onClick={handleMicToggle}
                className={cn(
                  'p-2.5 rounded-xl transition-all duration-200 shrink-0',
                  isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                    : 'bg-muted hover:bg-accent text-muted-foreground'
                )}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? (language === 'si' ? 'කතා කරන්න...' : language === 'ta' ? 'பேசுங்கள்...' : 'Speak now...')
                  : language === 'si' ? 'ටයිප් කරන්න හෝ 🎤 ඔබන්න...'
                    : language === 'ta' ? 'தட்டச்சு செய்யுங்கள் அல்லது 🎤 அழுத்தவும்...'
                      : 'Type or press 🎤 to talk...'
              }
              disabled={isLoading || isListening}
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm 
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                'p-2.5 rounded-xl transition-all duration-200 shrink-0',
                input.trim() && !isLoading
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-95'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground text-center mt-1.5 opacity-60">
            {voiceSupported ? '🎤 Voice + Text' : '💬 Text'} · NCG Holdings AI · {language === 'si' ? 'සිංහල' : language === 'ta' ? 'தமிழ்' : 'English'}
          </p>
        </div>
      </div>

      {/* Click outside to close language menu */}
      {showLanguageMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
      )}
    </>
  );
};
