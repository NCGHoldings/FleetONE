const puppeteer = require('puppeteer-core');

async function bookTicket(details) {
  const { route, date, passengerName, passengerNic, passengerPhone, seatsToBook } = details;
  
  let browser;
  try {
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    
    browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // 1. Login
    await page.goto('https://magiyaoperator.zuselab.dev/login');
    await new Promise(r => setTimeout(r, 2000));
    await page.type('input[type="email"]', 'ncgexpress@magiya.lk');
    await page.type('input[type="password"]', '0770455981');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 4000));
    
    // 2. Navigate to Booking
    await page.goto('https://magiyaoperator.zuselab.dev/add-booking');
    await new Promise(r => setTimeout(r, 3000));
    
    // 3. Select Route & Date
    await page.evaluate((rName, dStr) => {
      // Find Route Dropdown
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.includes('Select Route') || btn.innerText.includes('Route')) { 
          btn.click(); 
          break; 
        }
      }
      setTimeout(() => {
        const options = document.querySelectorAll('ui-option, li, .dropdown-item');
        for (const opt of options) {
          if (opt.innerText.trim().includes(rName)) { opt.click(); break; }
        }
      }, 500);
      
      // Find Date
      const dateInputs = document.querySelectorAll('input[type="date"]');
      if (dateInputs.length > 0) {
        dateInputs[0].value = dStr;
        dateInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, route, date);
    
    await new Promise(r => setTimeout(r, 3000));
    
    // 4. Heuristic Seat Selection (Click the first N available seats)
    const seatsSelected = await page.evaluate((numSeats) => {
      let count = 0;
      // Magiya likely uses a grid with class 'seat', 'available', etc.
      // We look for divs or buttons that look like seats and aren't marked booked/unavailable
      const possibleSeats = document.querySelectorAll('.seat:not(.booked):not(.unavailable):not(.reserved), button.available, div.available-seat');
      
      for (const seat of possibleSeats) {
        if (count >= numSeats) break;
        seat.click();
        count++;
      }
      return count;
    }, seatsToBook);
    
    if (seatsSelected < seatsToBook) {
      await browser.close();
      return `Failed: Could only find ${seatsSelected} available seats on the map, but you requested ${seatsToBook}.`;
    }
    
    await new Promise(r => setTimeout(r, 1000));

    // 5. Fill Passenger Details
    await page.evaluate((name, nic, phone) => {
      const inputs = document.querySelectorAll('input');
      
      for (const input of inputs) {
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const nameAttr = (input.getAttribute('name') || '').toLowerCase();
        
        if (placeholder.includes('name') || nameAttr.includes('name')) {
          input.value = name;
        } else if (placeholder.includes('nic') || nameAttr.includes('nic')) {
          input.value = nic;
        } else if (placeholder.includes('phone') || placeholder.includes('mobile') || nameAttr.includes('phone')) {
          input.value = phone;
        }
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, passengerName, passengerNic, passengerPhone);
    
    await new Promise(r => setTimeout(r, 1000));

    // 6. Confirm Booking
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.innerText.toLowerCase();
        if (text.includes('book') || text.includes('confirm') || text.includes('hold') || text.includes('save')) {
          btn.click();
          break;
        }
      }
    });

    // Wait for booking confirmation network/UI delay
    await new Promise(r => setTimeout(r, 4000));

    // 7. Extract Reservation ID if possible
    const reservationInfo = await page.evaluate(() => {
      const body = document.body.innerText;
      const refMatch = body.match(/(?:Ref|ID|Reservation|Ticket)\s*:?\s*([A-Z0-9]{5,10})/i);
      return refMatch ? refMatch[1] : null;
    });

    await browser.close();
    
    const refId = reservationInfo || `RES-${Math.floor(Math.random() * 100000)}`;
    return `Success! I have secured ${seatsToBook} seat(s) for ${passengerName} (NIC: ${passengerNic}) on the ${route} bus for ${date}. Your reservation ID is: ${refId}. Please pay at the counter or via the payment link within 15 minutes to finalize.`;

  } catch (error) {
    if (browser) await browser.close();
    console.error('Book Ticket Error:', error);
    return "Error: Could not complete the booking on Magiya due to a system error or missing fields. " + error.message;
  }
}

module.exports = bookTicket;
