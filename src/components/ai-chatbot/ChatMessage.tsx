import React from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  language?: string;
  timestamp: Date;
  isLoading?: boolean;
}

const languageLabels: Record<string, string> = {
  en: '🇬🇧 EN',
  si: '🇱🇰 සිං',
  ta: '🇱🇰 தமி',
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  language,
  timestamp,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-start mb-3">
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex mb-3', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative group max-w-[85%] px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
            : 'bg-muted text-foreground rounded-2xl rounded-bl-md'
        )}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">{content}</div>

        {/* Footer: language badge + time + copy */}
        <div className={cn(
          'flex items-center gap-2 mt-1.5 text-[10px]',
          isUser ? 'text-primary-foreground/60 justify-end' : 'text-muted-foreground justify-between'
        )}>
          <span>
            {language && languageLabels[language] && (
              <span className="opacity-70">{languageLabels[language]} · </span>
            )}
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
              title="Copy"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
