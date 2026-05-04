const checkAvailability = require('./tools/check_availability');
const bookTicket = require('./tools/book_ticket');

// Store user conversation states
// state structure: { step: number, route: string, date: string, name: string, nic: string, phone: string, availableSeats: string }
const userStates = new Map();

async function processWhatsAppMessage(phoneNumber, messageText) {
  const text = messageText.trim().toLowerCase();
  
  // Get or initialize user state
  let state = userStates.get(phoneNumber) || { step: 0 };

  // Reset command
  if (text === 'reset' || text === 'cancel') {
    userStates.delete(phoneNumber);
    return "Session cancelled. Reply with 'Hi' to start over.";
  }

  let response = "";

  switch (state.step) {
    case 0:
      response = "🚍 *Welcome to NCG Express Booking!* 🚍\\n\\nReply with the number of the option you want:\\n1️⃣ Book a Seat\\n2️⃣ Contact Support";
      state.step = 1;
      break;

    case 1:
      if (text === '1') {
        response = "Great! Where would you like to go?\\n\\nReply with a letter:\\n*A* - Colombo to Badulla\\n*B* - Colombo to Kandy\\n*C* - Colombo to Galle";
        state.step = 2;
      } else if (text === '2') {
        response = "Please call our hotline at 011-222-3333 for support. Have a great day!";
        userStates.delete(phoneNumber);
        return response;
      } else {
        response = "Invalid option. Please reply with *1* or *2*.";
      }
      break;

    case 2:
      if (text === 'a') state.route = "Badulla";
      else if (text === 'b') state.route = "Kandy";
      else if (text === 'c') state.route = "Galle";
      else {
        return "Invalid option. Please reply with *A*, *B*, or *C*.";
      }
      response = `You selected ${state.route}. What date would you like to travel?\\n\\nReply with the date in YYYY-MM-DD format (e.g., 2026-05-10).`;
      state.step = 3;
      break;

    case 3:
      // Basic date validation
      if (!text.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
        return "Invalid format. Please reply exactly like this: 2026-05-10";
      }
      state.date = text;
      response = `Checking live seats for ${state.route} on ${state.date}... Please wait a moment ⏳`;
      
      // Execute the Puppeteer check in the background
      setTimeout(async () => {
        try {
          const availText = await checkAvailability(state.route, state.date);
          state.availableSeats = availText;
          state.step = 4;
          // Note: we can't send a push message from inside this async flow easily without passing the waClient, 
          // so we ask the user to type "Status" or we handle it smoothly.
          // Wait, actually `processWhatsAppMessage` just returns a string. It cannot push async later unless we pass a callback.
        } catch (e) {
          console.error(e);
        }
      }, 0);
      
      // Let's make it synchronous for the sake of the WhatsApp flow
      try {
        const availText = await checkAvailability(state.route, state.date);
        response = `✅ Results:\\n${availText}\\n\\nWould you like to book a seat? Reply *Yes* or *No*.`;
        state.step = 4;
      } catch (err) {
         response = "Sorry, I couldn't check seats right now. Try again later.";
         userStates.delete(phoneNumber);
         return response;
      }
      break;

    case 4:
      if (text === 'yes' || text === 'y') {
        response = "Excellent. Please reply with your *Full Name*.";
        state.step = 5;
      } else {
        response = "Okay, maybe next time! Reply 'Hi' to start over.";
        userStates.delete(phoneNumber);
        return response;
      }
      break;

    case 5:
      state.name = messageText.trim();
      response = `Thanks ${state.name}. Now please reply with your *NIC Number*.`;
      state.step = 6;
      break;

    case 6:
      state.nic = messageText.trim();
      response = `Almost done! Please reply with your *Phone Number*.`;
      state.step = 7;
      break;

    case 7:
      state.phone = messageText.trim();
      response = `Processing your booking for ${state.route}... Please wait ⏳`;
      
      try {
         const bookingResult = await bookTicket(state.route, state.date, state.name, state.nic, state.phone, 1);
         response = `✅ BOOKING COMPLETE!\\n\\n${bookingResult}\\n\\nThank you for choosing NCG Express!`;
      } catch (err) {
         response = "An error occurred while booking. Please try again later or contact support.";
      }
      
      // Reset state at the end
      userStates.delete(phoneNumber);
      return response;

    default:
      userStates.delete(phoneNumber);
      return "Something went wrong. Let's start over.";
  }

  // Save state
  userStates.set(phoneNumber, state);
  return response;
}

module.exports = {
  processWhatsAppMessage
};
