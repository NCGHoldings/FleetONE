require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('Testing Gemini API Connection...');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY is missing from .env');
    return;
  }
  console.log('✅ API Key found. Length:', apiKey.length);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    console.log('⏳ Sending message to Gemini...');
    const result = await model.generateContent('Say hello world');
    console.log('✅ Response received:');
    console.log(result.response.text());
  } catch (err) {
    console.error('❌ Gemini Error:', err);
  }
}

testGemini();
