import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// All routes to scrape
const ROUTES = [
  'Makumbura - Badulla 10:15 AM',
  'Makumbura - Badulla 05:15 PM',
  'Badulla - Makumbura 10:15 AM',
  'Badulla - Makumbura 05:15 PM',
  'Moratuwa - Karaingar 87 07:30 PM',
  'Karaingar - Moratuwa 87 06:30 PM',
  'Moratuwa - Karaingar 57 07:30 PM',
];

async function runMagiyaScraper() {
  console.log('🚀 Magiya Scraper V7 — Multi-Route PDF URL Collector');

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 0
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(0);

    // ===== LOGIN =====
    console.log('🚪 Logging in...');
    await page.goto('https://magiyaoperator.zuselab.dev/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(3000);
    await page.type('input[type="email"]', 'ncgexpress@magiya.lk', { delay: 30 });
    await page.type('input[type="password"]', '0770455981', { delay: 30 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    console.log('✅ Logged in.');
    await sleep(5000);

    // Use yesterday's date (most recent complete day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    console.log(`📅 Target date: ${dateStr}`);

    const allResults = [];

    // ===== LOOP THROUGH FIRST ROUTE FOR NOW =====
    // Navigate to reports page
    console.log('📄 Going to Reports page...');
    await page.goto('https://magiyaoperator.zuselab.dev/reports', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);

    // Step 1: Select "Daily Bookings Report"
    console.log('📋 Selecting Daily Bookings Report...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim().startsWith('Report Type')) { btn.click(); break; }
      }
    });
    await sleep(2000);
    await page.evaluate(() => {
      const options = document.querySelectorAll('ui-option');
      for (const opt of options) {
        if (opt.innerText.trim() === 'Daily Bookings Report') { opt.click(); break; }
      }
    });
    await sleep(5000);

    // Step 2: Select first specific route
    console.log('🗺 Selecting route...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim() === 'All Trips' || btn.innerText.trim().startsWith('All Trips')) { btn.click(); break; }
      }
    });
    await sleep(2000);

    const selectedRoute = await page.evaluate(() => {
      const options = document.querySelectorAll('ui-option');
      for (const opt of options) {
        const text = opt.innerText.trim();
        if (text !== 'All Trips' && text.includes('Makumbura') && text.includes('10:15')) {
          opt.click();
          return text;
        }
      }
      // Fallback: first non-All-Trips route
      for (const opt of options) {
        const text = opt.innerText.trim();
        if (text !== 'All Trips' && text !== '' && !text.includes('Bookings') && !text.includes('Cancellation')) {
          opt.click();
          return text;
        }
      }
      return null;
    });
    console.log(`   Route: ${selectedRoute}`);
    await sleep(5000);

    // Step 3: Set date
    console.log('📅 Setting date...');
    await page.evaluate((d) => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      for (const di of dateInputs) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(di, d);
        di.dispatchEvent(new Event('input', { bubbles: true }));
        di.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, dateStr);
    await sleep(3000);

    // Step 4: Click Generate
    console.log('⚙️ Clicking Generate Report...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim().includes('Generate Report')) { btn.click(); break; }
      }
    });

    // Step 5: Wait for Download PDF
    console.log('⏳ Waiting for PDF...');
    let pdfReady = false;
    for (let i = 0; i < 48; i++) {
      await sleep(5000);
      try {
        const check = await page.evaluate(() => {
          const body = document.body.innerText;
          return body.includes('Download PDF') || body.includes('Share PDF');
        });
        if (check) { pdfReady = true; console.log(`   ✅ PDF ready after ~${(i+1)*5}s`); break; }
        console.log(`   ... poll ${i+1}/48`);
      } catch(e) { console.log(`   ... hiccup ${i+1}`); }
    }

    if (!pdfReady) {
      const text = await page.evaluate(() => document.body.innerText).catch(() => '');
      console.log('Page text: ' + text.substring(0, 500));
      throw new Error('Download button never appeared');
    }

    // Step 6: Get PDF URL
    console.log('📥 Extracting PDF URL...');
    const pdfUrl = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const a of links) {
        if (a.innerText.includes('Download PDF') || a.href?.includes('.pdf') || a.href?.includes('/storage/reports/')) {
          return a.href;
        }
      }
      return null;
    });
    console.log(`   📎 PDF URL: ${pdfUrl}`);

    // Step 7: Count passengers from page text
    const reportInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      // Try to find "Daily Report for <route> - <date>"
      const match = text.match(/Daily Report for (.+?) - (.+?)[\n\r]/);
      return {
        title: match ? match[0].trim() : 'Unknown',
        bodyLength: text.length
      };
    });
    console.log(`   Report: ${reportInfo.title}`);

    if (pdfUrl) {
      allResults.push({
        route_name: selectedRoute || 'Unknown Route',
        report_date: dateStr,
        pdf_url: pdfUrl,
        status: 'completed',
        bus_number: 'NG 8241', // From PDF header
        total_passengers: 0,
        total_revenue_lkr: 0
      });
    }

    // ===== PUSH TO SUPABASE =====
    if (allResults.length > 0) {
      console.log(`\n💾 Saving ${allResults.length} report(s) to Supabase...`);
      
      for (const result of allResults) {
        const { error } = await supabase
          .from('magiya_daily_reports')
          .upsert(result, { onConflict: 'bus_number,report_date' });
        
        if (error) {
          console.error(`   ❌ DB Error: ${error.message}`);
          // If pdf_url column doesn't exist, try without it
          if (error.message.includes('pdf_url')) {
            console.log('   Retrying without pdf_url...');
            const { pdf_url, ...withoutUrl } = result;
            const { error: err2 } = await supabase
              .from('magiya_daily_reports')
              .upsert(withoutUrl, { onConflict: 'bus_number,report_date' });
            if (err2) console.error(`   ❌ Retry failed: ${err2.message}`);
            else console.log('   ✅ Saved (without PDF URL)');
          }
        } else {
          console.log(`   ✅ Saved: ${result.route_name} → ${result.pdf_url}`);
        }
      }
    }

    console.log('\n🎉 Scraper V7 complete!');

  } catch (err) {
    console.error('❌ Scraper Failed:', err.message);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed.');
  }
}

runMagiyaScraper();
