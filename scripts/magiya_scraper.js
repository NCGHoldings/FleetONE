import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pdfParseLib from 'pdf-parse';
const pdfParse = typeof pdfParseLib === 'function' ? pdfParseLib : (pdfParseLib.default || pdfParseLib);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runMagiyaScraper() {
  console.log('🚀 Magiya Scraper V8 — Native Data Extraction');

  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });

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

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow', downloadPath: downloadPath,
    });

    console.log('🚪 Logging in...');
    await page.goto('https://magiyaoperator.zuselab.dev/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => { });
    await sleep(3000);
    await page.type('input[type="email"]', 'ncgexpress@magiya.lk', { delay: 30 });
    await page.type('input[type="password"]', '0770455981', { delay: 30 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => { }),
      page.click('button[type="submit"]')
    ]);
    console.log('✅ Logged in.');
    await sleep(5000);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    console.log(`📅 Target date: ${dateStr}`);

    console.log('📄 Going to Reports page...');
    await page.goto('https://magiyaoperator.zuselab.dev/reports', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => { });
    await sleep(8000);

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

    console.log('🗺 Selecting route...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim().startsWith('All Trips')) { btn.click(); break; }
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

    console.log('⚙️ Clicking Generate Report...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim().includes('Generate Report')) { btn.click(); break; }
      }
    });

    console.log('⏳ Waiting for PDF...');
    let pdfReady = false;
    for (let i = 0; i < 48; i++) {
      await sleep(5000);
      try {
        const check = await page.evaluate(() => {
          const body = document.body.innerText;
          return body.includes('Download PDF') || body.includes('Share PDF');
        });
        if (check) { pdfReady = true; console.log(`   ✅ PDF ready after ~${(i + 1) * 5}s`); break; }
      } catch (e) { }
    }

    if (!pdfReady) throw new Error('Download button never appeared');

    console.log('📥 Extracting PDF URL...');
    const pdfUrl = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const a of links) {
        if (a.href?.includes('.pdf') || a.href?.includes('/storage/reports/')) return a.href;
      }
      return null;
    });
    console.log(`   📎 PDF URL: ${pdfUrl}`);

    let pdfBuffer = null;
    if (pdfUrl) {
      console.log('   Fetching PDF data...');
      const resp = await page.goto(pdfUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (resp) pdfBuffer = await resp.buffer();
    }

    if (!pdfBuffer) {
      console.log('   Checking local downloads...');
      const files = fs.readdirSync(downloadPath).filter(f => f.endsWith('.pdf'));
      if (files.length > 0) pdfBuffer = fs.readFileSync(path.join(downloadPath, files[0]));
    }

    if (!pdfBuffer) throw new Error('Could not get PDF buffer!');

    console.log('🔍 Parsing PDF for exact passenger rows...');
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    // A robust regex to find booking rows based exactly on your screenshot format
    // It captures: Seat (e.g. 3-M, 4-M) | Phone (e.g. 0760309820) | Route parts | Booking Date
    // Note: PDF text parsing often strips horizontal whitespace into spaces or newlines.

    const passengerRows = [];

    // We split by standard phone numbers lengths (9-10 digits) which are unique anchors
    const lines = text.split('\n').filter(l => l.trim().length > 0);

    let totalPassengersCount = 0;

    // Fallback heuristic line scanning
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // If line contains a phone number e.g. 0760309820
      const phoneMatch = line.match(/(07\d{8})/);

      if (phoneMatch) {
        // The seat number is usually right before it
        const phoneStr = phoneMatch[1];
        let seatStr = line.substring(0, line.indexOf(phoneStr)).trim();

        // Sometimes seat is on previous line
        if (seatStr.length === 0 && i > 0) {
          seatStr = lines[i - 1].trim();
        }

        // Looking ahead for Location (e.g. Makumbura - 10:15 AM)
        const remaining = line.substring(line.indexOf(phoneStr) + phoneStr.length).trim();
        let locationStr = remaining;
        let bookingType = "Unknown";

        // In PDF parsing, "NCG Express", "Online Booking" often end up on the next 1-3 lines
        for (let j = 1; j <= 4; j++) {
          if (i + j < lines.length) {
            const nextText = lines[i + j].trim();
            if (nextText.includes("NCG Express") || nextText.includes("Online Booking") || nextText.includes("Agent Booking")) {
              bookingType = nextText;
            } else if (nextText.includes("Badulla") || nextText.includes("Makumbura")) {
              locationStr = locationStr + " " + nextText;
            }
          }
        }

        passengerRows.push({
          seat_number: seatStr,
          contact: phoneStr,
          location_route: locationStr || "Unknown",
          booking_type: bookingType,
          remarks: ""
        });

        // Count individual seats (e.g., "3-M, 4-M" -> 2 seats)
        if (seatStr) {
          const seats = seatStr.split(',');
          totalPassengersCount += seats.length;
        } else {
          totalPassengersCount += 1;
        }
      }
    }

    console.log(`   Found ${passengerRows.length} distinct booking records (approx ${totalPassengersCount} passengers).`);

    // ===== PUSH TO SUPABASE =====
    // Push the parent report
    const reportData = {
      route_name: selectedRoute || 'Unknown Route',
      report_date: dateStr,
      status: 'completed',
      bus_number: 'NG 8241',
      total_passengers: totalPassengersCount,
      total_revenue_lkr: totalPassengersCount > 0 ? 0 : 0 // Needs separate logic if calculating
    };

    console.log(`\n💾 Saving Report Data to magiya_daily_reports...`);
    const { data: parentRecord, error: parentErr } = await supabase
      .from('magiya_daily_reports')
      .upsert(reportData, { onConflict: 'bus_number,report_date' })
      .select('id')
      .single();

    if (parentErr) {
      console.error(`   ❌ DB Error (Report): ${parentErr.message}`);
      throw parentErr;
    }

    const reportId = parentRecord.id;

    if (passengerRows.length > 0) {
      console.log(`   Saving ${passengerRows.length} passenger records to magiya_passenger_bookings...`);

      // Assign the parent FK
      const rowsToInsert = passengerRows.map(row => ({
        ...row,
        report_id: reportId
      }));

      // Clear old rows for this report to prevent duplicates if rerunning
      await supabase.from('magiya_passenger_bookings').delete().eq('report_id', reportId);

      const { error: childrenErr } = await supabase
        .from('magiya_passenger_bookings')
        .insert(rowsToInsert);

      if (childrenErr) {
        console.error(`   ❌ DB Error (Passengers): ${childrenErr.message}`);
      } else {
        console.log(`   ✅ Successfully saved all detailed data rows to Supabase.`);
      }
    } else {
      console.log(`   ⚠️ No passenger rows could be parsed. Is the report empty?`);
    }

    console.log('\n🎉 Scraper V8 complete!');

  } catch (err) {
    console.error('❌ Scraper Failed:', err.message);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed.');
  }
}

runMagiyaScraper();
