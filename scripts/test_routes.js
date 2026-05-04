import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://magiyaoperator.zuselab.dev/login');
  await new Promise(r => setTimeout(r, 2000));
  await page.type('input[type="email"]', 'ncgexpress@magiya.lk');
  await page.type('input[type="password"]', '0770455981');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));
  await page.goto('https://magiyaoperator.zuselab.dev/reports');
  await new Promise(r => setTimeout(r, 4000));
  
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.innerText.trim().startsWith('Report Type')) { btn.click(); break; }
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    const options = document.querySelectorAll('ui-option');
    for (const opt of options) {
      if (opt.innerText.trim() === 'Daily Bookings Report') { opt.click(); break; }
    }
  });
  await new Promise(r => setTimeout(r, 3000));
  
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.innerText.trim().startsWith('All Trips')) { btn.click(); break; }
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  
  const allRoutes = await page.evaluate(() => {
    const options = document.querySelectorAll('ui-option');
    const routes = [];
    for (const opt of options) {
      routes.push(opt.innerText.trim());
    }
    return routes;
  });
  console.log("ROUTES FOUND: ", allRoutes);
  await browser.close();
}
test();
