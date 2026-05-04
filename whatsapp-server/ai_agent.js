require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const checkAvailability = require('./tools/check_availability');
const bookTicket = require('./tools/book_ticket');

// We will use Gemini 1.5 Flash as it is highly optimized for function calling
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  tools: [
    {
      functionDeclarations: [
        {
          name: 'check_seat_availability',
          description: 'Checks the live seat availability and ticket price for a specific bus route on a given date.',
          parameters: {
            type: 'OBJECT',
            properties: {
              route: {
                type: 'STRING',
                description: 'The bus route name (e.g. "Makumbura - Badulla 10:15 AM", "Colombo - Nuwara Eliya 04:00 AM")',
              },
              date: {
                type: 'STRING',
                description: 'The date of travel in YYYY-MM-DD format.',
              },
            },
            required: ['route', 'date'],
          },
        },
        {
          name: 'book_bus_ticket',
          description: 'Books a bus ticket for the user after they have confirmed the route, date, and provided passenger details.',
          parameters: {
            type: 'OBJECT',
            properties: {
              route: { type: 'STRING' },
              date: { type: 'STRING' },
              passengerName: { type: 'STRING' },
              passengerNic: { type: 'STRING' },
              passengerPhone: { type: 'STRING' },
              seatsToBook: { type: 'INTEGER' },
            },
            required: ['route', 'date', 'passengerName', 'passengerNic', 'passengerPhone', 'seatsToBook'],
          },
        },
      ],
    },
  ],
});

// In-memory conversation storage (For production, move to Redis/Supabase)
const conversationMemory = new Map();

async function processWhatsAppMessage(phoneNumber, messageText) {
  if (!apiKey) {
    return "Error: Gemini API Key is missing. Please contact the administrator.";
  }

  // 1. Get or create a chat session for this user
  let chatSession = conversationMemory.get(phoneNumber);
  if (!chatSession) {
    chatSession = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `System Instruction: You are the NCG Express Booking Assistant. You help users check live bus seat availability and book tickets. Be polite, concise, and helpful. Always confirm the exact Route Name and Date before checking availability. To book a ticket, you MUST collect the passenger's Name, NIC, Phone Number, and number of seats. Current date is ${new Date().toISOString().split('T')[0]}.` }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I am the NCG Express Booking Assistant.' }],
        },
      ],
    });
    conversationMemory.set(phoneNumber, chatSession);
  }

  try {
    // 2. Send the message to Gemini
    console.log('   [AI] Sending message to Gemini API...');
    const result = await chatSession.sendMessage([{ text: messageText }]);
    console.log('   [AI] Received response from Gemini API.');
    
    let responseText = "";
    try {
      responseText = result.response.text();
    } catch (e) {
      // Model returned a function call with no text, this is expected.
    }

    // 3. Handle Function Calling
    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === 'check_seat_availability') {
          const args = call.args;
          console.log(`🤖 AI executing tool: check_seat_availability`, args);
          
          // Execute the Puppeteer scraper tool
          const seatsData = await checkAvailability(args.route, args.date);
          
          // Pass the tool output back to the AI
          const functionResult = await chatSession.sendMessage([{
            functionResponse: {
              name: 'check_seat_availability',
              response: { content: seatsData }
            }
          }]);
          
          responseText = functionResult.response.text();
        } 
        else if (call.name === 'book_bus_ticket') {
          const args = call.args;
          console.log(`🤖 AI executing tool: book_bus_ticket`, args);
          
          // Execute the Puppeteer booking tool
          const bookingData = await bookTicket(args);
          
          const functionResult = await chatSession.sendMessage([{
            functionResponse: {
              name: 'book_bus_ticket',
              response: { content: bookingData }
            }
          }]);
          
          responseText = functionResult.response.text();
        }
      }
    }

    return responseText;

  } catch (error) {
    const fs = require('fs');
    fs.appendFileSync(__dirname + '/ai_error.log', new Date().toISOString() + '\\n' + (error.stack || error.toString()) + '\\n\\n');
    console.error('AI Agent Error:', error);
    return "Sorry, I am having trouble connecting to the booking system right now. Please try again later.";
  }
}

module.exports = { processWhatsAppMessage };
