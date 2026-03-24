import React from 'react';
import { ChatLanguage } from '@/hooks/useAIChatbot';

interface QuickRepliesProps {
  language: ChatLanguage;
  onSelect: (message: string) => void;
  disabled?: boolean;
}

interface QuickReply {
  en: string;
  si: string;
  ta: string;
  icon: string;
}

const quickReplies: QuickReply[] = [
  {
    en: 'Check School Fees',
    si: 'පාසල් ගාස්තු පරීක්ෂා කරන්න',
    ta: 'பள்ளி கட்டணம் சரிபார்க்க',
    icon: '🏫',
  },
  {
    en: 'Bus Hire Cost',
    si: 'බස් කුලී ඇස්තමේන්තු',
    ta: 'பேருந்து வாடகை மதிப்பீடு',
    icon: '💰',
  },
  {
    en: 'Special Hire Pricing',
    si: 'විශේෂ කුලී මිල ගණන්',
    ta: 'சிறப்பு வாடகை விலை',
    icon: '🚌',
  },
  {
    en: 'Yutong Bus Models',
    si: 'යුටොං බස් මාදිලි',
    ta: 'யுடோங் பேருந்து மாடல்கள்',
    icon: '🚍',
  },
  {
    en: 'Sinotruck Details',
    si: 'Sinotruck තොරතුරු',
    ta: 'சைனோட்ரக் விவரங்கள்',
    icon: '🚛',
  },
  {
    en: 'Book a Bus',
    si: 'බස් එකක් වෙන්කරගන්න',
    ta: 'பேருந்து முன்பதிவு செய்ய',
    icon: '📋',
  },
  {
    en: 'Contact Us',
    si: 'අපව අමතන්න',
    ta: 'எங்களை தொடர்புகொள்ள',
    icon: '📞',
  },
];

export const QuickReplies: React.FC<QuickRepliesProps> = ({ language, onSelect, disabled }) => {
  const effectiveLang = language === 'auto' ? 'en' : language;

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {quickReplies.map((reply, index) => (
        <button
          key={index}
          onClick={() => onSelect(reply[effectiveLang])}
          disabled={disabled}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-full 
                     bg-primary/5 hover:bg-primary/15 text-foreground border border-primary/15
                     hover:border-primary/30 transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     active:scale-95"
        >
          <span>{reply.icon}</span>
          <span>{reply[effectiveLang]}</span>
        </button>
      ))}
    </div>
  );
};
