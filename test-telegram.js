const fetch = require('node-fetch'); // Ensure node-fetch or native fetch works

async function testTelegram() {
  const telegramBotToken = '8421992601:AAHCjyGNrrdErAqTVoqO1h_8y1U33c2y7iY';
  const telegramChatId = '-5012037081';

  const message = `🚌 NCG Fleetflow — End of Day Report
📅 29 Apr 2026, 18:00

📈 Business Performance (Today)
🎫 Passengers Transported: 1,240
💰 Daily Ticket Revenue: LKR 450,000
🛣️ Total Fleet Distance: 12,450 km
🚌 Trips Completed: 48

🌱 Sustainability & Fuel (Today)
⛽ Total Fuel Consumed: 2,450 Liters
💵 Total Fuel Cost: LKR 850,000
📊 Fleet Efficiency: 5.1 km/l

🛡️ Safety & Operations
🌟 Average Driver Behavior Score: 92/100
🚨 New Accidents/Incidents: 0
🔧 Buses Currently in Maintenance: 3`;

  const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    
  try {
    const tgResponse = await globalThis.fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
      }),
    });

    if (!tgResponse.ok) {
      const tgError = await tgResponse.text();
      console.error('Telegram API error:', tgError);
    } else {
      console.log('✅ Test message sent successfully!');
    }
  } catch (err) {
    console.error('Error sending message:', err);
  }
}

testTelegram();
