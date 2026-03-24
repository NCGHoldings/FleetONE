-- AI Chatbot tables for NCG FleetFlow
-- Supports multilingual conversations (Sinhala, Tamil, English)

-- Chat sessions (one per visitor)
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  visitor_name TEXT,
  visitor_phone TEXT,
  visitor_email TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'si', 'ta')),
  product_interest TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'escalated')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual chat messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  language TEXT CHECK (language IN ('en', 'si', 'ta', 'auto')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bot knowledge base (admin-editable FAQs)
CREATE TABLE IF NOT EXISTS ai_chatbot_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('special_hire', 'yutong', 'sinotruck', 'light_vehicle', 'general', 'company')),
  question_en TEXT,
  question_si TEXT,
  question_ta TEXT,
  answer_en TEXT NOT NULL,
  answer_si TEXT,
  answer_ta TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_token ON ai_chat_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_status ON ai_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created ON ai_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chatbot_knowledge_category ON ai_chatbot_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_ai_chatbot_knowledge_active ON ai_chatbot_knowledge(is_active);

-- Enable RLS
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chatbot_knowledge ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow service role full access (edge function uses service role)
-- Public users can only interact via the edge function
CREATE POLICY "Service role full access on ai_chat_sessions"
  ON ai_chat_sessions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on ai_chat_messages"
  ON ai_chat_messages FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on ai_chatbot_knowledge"
  ON ai_chatbot_knowledge FOR ALL
  USING (true) WITH CHECK (true);

-- Seed some initial knowledge base entries
INSERT INTO ai_chatbot_knowledge (category, question_en, question_si, question_ta, answer_en, answer_si, answer_ta, tags) VALUES
(
  'company',
  'What does NCG Holdings do?',
  'NCG Holdings සමාගම මොනවාද කරන්නේ?',
  'NCG Holdings என்ன செய்கிறது?',
  'NCG Holdings (Pvt) Ltd is a leading transportation and vehicle sales company in Sri Lanka. We offer Special Bus Hire services, sell Yutong buses, Sinotruck trucks, and Light Vehicles. We have been serving customers across Sri Lanka with reliable and professional service.',
  'NCG Holdings (Pvt) Ltd ශ්‍රී ලංකාවේ ප්‍රමුඛ ප්‍රවාහන සහ වාහන විකුණුම් සමාගමකි. අපි විශේෂ බස් කුලී සේවා, යුටොං බස් රථ, Sinotruck ට්‍රක් රථ සහ සැහැල්ලු වාහන විකුණනවා.',
  'NCG Holdings (Pvt) Ltd இலங்கையில் முன்னணி போக்குவரத்து மற்றும் வாகன விற்பனை நிறுவனமாகும். சிறப்பு பேருந்து வாடகை, யுடோங் பேருந்துகள், சைனோட்ரக் லொறிகள் மற்றும் இலகு வாகனங்களை விற்பனை செய்கிறோம்.',
  ARRAY['company', 'about', 'info']
),
(
  'special_hire',
  'How do I book a special hire bus?',
  'විශේෂ කුලී බස් එකක් වෙන් කරගන්නේ කෙසේද?',
  'சிறப்பு வாடகை பேருந்தை எப்படி முன்பதிவு செய்வது?',
  'To book a special hire bus: 1) Tell us your pickup and drop locations, 2) Share your travel date and time, 3) Let us know the number of passengers, 4) We''ll provide a quotation with pricing, 5) Confirm and make the advance payment. You can also submit a booking request through our website!',
  'විශේෂ කුලී බස් එකක් වෙන් කරගැනීමට: 1) ඔබේ පිකප් සහ ගමනාන්ත ස්ථාන අපට කියන්න, 2) ගමන් දිනය සහ වේලාව බෙදාගන්න, 3) මගීන් සංඛ්‍යාව දන්වන්න, 4) අපි මිල ගණන් සමඟ quotation එකක් දෙන්නම්, 5) තහවුරු කර අත්තිකාරම් ගෙවීම කරන්න.',
  'சிறப்பு வாடகை பேருந்தை முன்பதிவு செய்ய: 1) பிக்கப் மற்றும் இறக்கும் இடங்களை தெரிவிக்கவும், 2) பயண தேதி மற்றும் நேரத்தை பகிரவும், 3) பயணிகள் எண்ணிக்கையை தெரிவிக்கவும், 4) விலை மதிப்பீட்டை வழங்குவோம், 5) உறுதிப்படுத்தி முன்பணம் செலுத்தவும்.',
  ARRAY['booking', 'hire', 'bus', 'reserve']
),
(
  'special_hire',
  'What types of special hire are available?',
  'කුමන ආකාරයේ විශේෂ කුලී සේවා තිබේද?',
  'என்ன வகையான சிறப்பு வாடகை சேவைகள் உள்ளன?',
  'We offer various special hire types: School Trips, Corporate Events, Wedding Transport, Pilgrimages & Temple Trips, Airport Transfers, Tour Packages, Sports Events, and Custom Group Travel. Each type has competitive pricing based on distance and duration.',
  'අපි විවිධ විශේෂ කුලී සේවා ලබා දෙනවා: පාසල් චාරිකා, ආයතනික වැඩසටහන්, විවාහ ප්‍රවාහනය, වන්දනා ගමන්, ගුවන් තොට මාරු කිරීම්, සංචාරක පැකේජ, ක්‍රීඩා උත්සව සහ අභිරුචි කණ්ඩායම් ගමන්.',
  'பள்ளி சுற்றுலாக்கள், கார்ப்பரேட் நிகழ்வுகள், திருமண போக்குவரத்து, திருத்தல யாத்திரைகள், விமான நிலைய இடமாற்றங்கள், சுற்றுலா தொகுப்புகள், விளையாட்டு நிகழ்வுகள் மற்றும் தனிப்பயன் குழு பயணங்கள் என பல்வேறு சிறப்பு வாடகை சேவைகளை வழங்குகிறோம்.',
  ARRAY['types', 'hire', 'services', 'school', 'wedding', 'tour']
),
(
  'yutong',
  'Tell me about Yutong buses',
  'යුටොං බස් රථ ගැන කියන්න',
  'யுடோங் பேருந்துகள் பற்றி கூறுங்கள்',
  'NCG Holdings is an authorized Yutong dealer in Sri Lanka. Yutong is the world''s largest bus manufacturer from China. We offer various models for intercity, tourism, and city bus operations. Our Yutong buses come with advanced features, fuel-efficient engines, and comprehensive after-sales service. Contact us for the latest models and pricing!',
  'NCG Holdings ශ්‍රී ලංකාවේ බලයලත් යුටොං බස් නියෝජිතයාය. యుటොං යනු චීනයේ ලොව විශාලතම බස් නිෂ්පාදකයාය. අපි නගරාන්තර, සංචාරක සහ නගර බස් සේවා සඳහා විවිධ මාදලි ලබා දෙනවා.',
  'NCG Holdings இலங்கையில் அங்கீகரிக்கப்பட்ட யுடோங் பேருந்து விற்பனையாளர். யுடோங் சீனாவின் உலகின் மிகப்பெரிய பேருந்து உற்பத்தியாளர். நகரங்களுக்கிடையிலான, சுற்றுலா மற்றும் நகர பேருந்து சேவைகளுக்கான பல்வேறு மாடல்களை வழங்குகிறோம்.',
  ARRAY['yutong', 'bus', 'sales', 'chinese']
),
(
  'sinotruck',
  'Tell me about Sinotruck trucks',
  'Sinotruck ට්‍රක් රථ ගැන කියන්න',
  'சைனோட்ரக் லொறிகள் பற்றி கூறுங்கள்',
  'NCG Holdings is an authorized Sinotruck dealer in Sri Lanka. Sinotruck (CNHTC) is one of China''s leading truck manufacturers. We offer a range of models including dump trucks, cargo trucks, tractor heads, and mixer trucks. All trucks come with warranty, genuine spare parts, and professional after-sales service.',
  'NCG Holdings ශ්‍රී ලංකාවේ බලයලත් Sinotruck නියෝජිතයාය. Sinotruck (CNHTC) යනු චීනයේ ප්‍රමුඛ ට්‍රක් නිෂ්පාදකයෙකි. අපි ඩම්ප් ට්‍රක්, කාගෝ ට්‍රක්, ට්‍රැක්ටර් හෙඩ් සහ මික්සර් ට්‍රක් ඇතුළු මාදලි පරාසයක් ලබා දෙනවා.',
  'NCG Holdings இலங்கையில் அங்கீகரிக்கப்பட்ட சைனோட்ரக் விற்பனையாளர். சைனோட்ரக் (CNHTC) சீனாவின் முன்னணி லொறி உற்பத்தியாளர்களில் ஒன்று. டம்ப் லொறிகள், சரக்கு லொறிகள், டிராக்டர் ஹெட்கள் மற்றும் மிக்சர் லொறிகள் என்ற பலவிதமான மாடல்களை வழங்குகிறோம்.',
  ARRAY['sinotruck', 'truck', 'sales', 'chinese']
);
