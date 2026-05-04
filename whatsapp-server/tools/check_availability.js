const puppeteer = require('puppeteer-core');

async function checkAvailability(route, date) {
  let browser;
  try {
    // We reuse the Chrome path strategy from the scraper
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    
    browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    // Use an isolated session or login
    await page.goto('https://magiyaoperator.zuselab.dev/login');
    await new Promise(r => setTimeout(r, 2000));
    
    // Login
    await page.type('input[type="email"]', 'ncgexpress@magiya.lk');
    await page.type('input[type="password"]', '0770455981');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 4000));
    
    // Go to booking page
    await page.goto('https://magiyaoperator.zuselab.dev/add-booking');
    await new Promise(r => setTimeout(r, 3000));
    
    // Select Route
    await page.evaluate((rName) => {
      // Find the route dropdown
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.includes('Select Route')) { btn.click(); break; }
      }
      setTimeout(() => {
        const options = document.querySelectorAll('ui-option');
        for (const opt of options) {
          if (opt.innerText.trim().includes(rName)) { opt.click(); break; }
        }
      }, 500);
    }, route);
    await new Promise(r => setTimeout(r, 2000));
    
    // Select Date
    await page.evaluate((dStr) => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      if (dateInputs.length > 0) {
        dateInputs[0].value = dStr;
        dateInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, date);
    await new Promise(r => setTimeout(r, 2000));
    
    // Check available seats (Assuming there is an element showing availability)
    const availability = await page.evaluate(() => {
      // Look for standard text like "Available: X" or a seat map
      const bodyText = document.body.innerText;
      const match = bodyText.match(/Available Seats?:\s*(\d+)/i);
      if (match) return `There are ${match[1]} seats available.`;
      
      const priceMatch = bodyText.match(/(?:Price|Ticket|LKR|Rs\.?)\s*:?\s*([\d,]+)/i);
      
      return `Found the bus schedule. Please proceed to select seats. ${priceMatch ? `Price is approx LKR ${priceMatch[1]}.` : ''}`;
    });
    
    await browser.close();
    return availability;

  } catch (error) {
    if (browser) await browser.close();
    console.error('Check Availability Error:', error);
    return "Error: Could not connect to Magiya booking system to check availability. " + error.message;
  }
}

module.exports = checkAvailability;
