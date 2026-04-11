import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runMagiyaScraper() {
  console.log('🚀 Magiya Scraper V9 — URL Storage Mode');

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

    // ---- Login ----
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

    // ---- Target date ----
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    console.log(`📅 Target date: ${dateStr}`);

    // ---- Navigate to Reports ----
    console.log('📄 Going to Reports page...');
    await page.goto('https://magiyaoperator.zuselab.dev/reports', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);

    // ---- Select report type ----
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

    // ---- Select routes and collect all PDFs ----
    // Get all available route options first
    console.log('🗺 Finding all routes...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim().startsWith('All Trips')) { btn.click(); break; }
      }
    });
    await sleep(2000);

    const allRoutes = await page.evaluate(() => {
      const options = document.querySelectorAll('ui-option');
      const routes = [];
      for (const opt of options) {
        const text = opt.innerText.trim();
        if (text !== 'All Trips' && text !== '' && !text.includes('Bookings') && !text.includes('Cancellation')) {
          routes.push(text);
        }
      }
      return routes;
    });

    // Close the dropdown so the next loop sequence works properly
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim().startsWith('All Trips')) { btn.click(); break; }
      }
    });
    await sleep(1000);

    console.log(`   Found ${allRoutes.length} routes: ${allRoutes.join(', ')}`);

    const savedReports = [];

    // Process all routes — limit to 1 for testing the storage upload
    const routesToProcess = allRoutes.length > 0 ? allRoutes.slice(0, 1) : ['Default'];

    for (const routeName of routesToProcess) {
      console.log(`\n📍 Processing route: ${routeName}`);

      // Re-open route dropdown and select this route
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.innerText.trim().startsWith('All Trips') || btn.innerText.trim().includes('Makumbura') || btn.innerText.trim().includes('Badulla')) {
            btn.click(); break;
          }
        }
      });
      await sleep(1500);

      await page.evaluate((targetRoute) => {
        const options = document.querySelectorAll('ui-option');
        for (const opt of options) {
          if (opt.innerText.trim() === targetRoute) { opt.click(); break; }
        }
      }, routeName);
      await sleep(3000);

      // Set date
      await page.evaluate((d) => {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        for (const di of dateInputs) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(di, d);
          di.dispatchEvent(new Event('input', { bubbles: true }));
          di.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, dateStr);
      await sleep(2000);

      // Generate report
      console.log('   ⚙️ Generating report...');
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.innerText.trim().includes('Generate Report')) { btn.click(); break; }
        }
      });

      // Wait for PDF to be ready
      let pdfReady = false;
      for (let i = 0; i < 48; i++) {
        await sleep(5000);
        try {
          const check = await page.evaluate(() => {
            const body = document.body.innerText;
            return body.includes('Download PDF') || body.includes('Share PDF');
          });
          if (check) { pdfReady = true; console.log(`   ✅ PDF ready after ~${(i + 1) * 5}s`); break; }
        } catch (e) {}
      }

      if (!pdfReady) {
        console.log(`   ⚠️ PDF not ready for route: ${routeName}, skipping.`);
        continue;
      }

      // Extract PDF URL (kept for reference)
      const pdfUrl = await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const a of links) {
          if (a.href?.includes('.pdf') || a.href?.includes('/storage/reports/')) return a.href;
        }
        return null;
      });
      console.log(`   📎 PDF URL: ${pdfUrl}`);

      // ✅ Download PDF using authenticated browser session (has cookies/auth)
      console.log(`   📥 Downloading PDF via authenticated session...`);
      let passengers = [];
      let totalPassengers = 0;

      try {
        // Use page.evaluate + fetch to download PDF bytes WITH the browser's auth cookies
        const pdfBase64 = await page.evaluate(async (url) => {
          const resp = await fetch(url, { credentials: 'include' });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buffer = await resp.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary);
        }, pdfUrl);

        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        console.log(`   📄 PDF downloaded: ${Math.round(pdfBuffer.length / 1024)} KB`);

        // Parse using pdfjs-dist (Mozilla's official PDF.js — works in Node 20 ESM perfectly)
        const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdfjsLib = pdfjsMod.default || pdfjsMod;
        pdfjsLib.GlobalWorkerOptions.workerSrc = false; // disable worker for Node

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0 });
        const pdfDoc = await loadingTask.promise;
        console.log(`   📖 PDF loaded: ${pdfDoc.numPages} pages`);

        // Extract all text items with positions across all pages  
        const allItems = [];
        for (let p = 1; p <= pdfDoc.numPages; p++) {
          const pg = await pdfDoc.getPage(p);
          const textContent = await pg.getTextContent();
          for (const item of textContent.items) {
            if (item.str && item.str.trim()) {
              allItems.push({ str: item.str.trim(), x: item.transform[4], y: item.transform[5] });
            }
          }
        }

        // Group items into rows by Y coordinate (within ±4 pt tolerance)
        const rowMap = {};
        for (const item of allItems) {
          const rowY = Math.round(item.y / 4) * 4; // snap to 4pt grid
          if (!rowMap[rowY]) rowMap[rowY] = [];
          rowMap[rowY].push(item);
        }

        // Sort each row's items by X position (left to right)
        const sortedRows = Object.values(rowMap)
          .map(items => items.sort((a, b) => a.x - b.x))
          .sort((a, b) => b[0].y - a[0].y); // top to bottom (Y decreases downward in PDF)

        // Magiya PDF fixed columns (from left, px approx):
        // Col0: Seat Number (~50-110)
        // Col1: Contact phone (~130-200)  
        // Col2: Location (~200-330)
        // Col3: Booking Type + Date (~330-500)
        // Col4: Remarks (~500+)
        const PHONE_RE = /^07\d{8}$/;

        for (const rowItems of sortedRows) {
          const rowTexts = rowItems.map(i => i.str);
          // A data row must contain a phone number
          const phone = rowTexts.find(t => PHONE_RE.test(t));
          if (!phone) continue;

          const seat = rowTexts[0] || '';
          const phoneIdx = rowTexts.indexOf(phone);
          const location = rowTexts.slice(phoneIdx + 1).find(t => t.includes('–') || t.includes('-') || t.match(/\d{1,2}:\d{2}/)) || '';
          const bookingType = rowTexts.find(t => t.includes('NCG') || t.includes('Online') || t.includes('Agent')) || 'Unknown';
          const dateStr2 = rowTexts.find(t => /\d{4}-\d{2}-\d{2}/.test(t)) || '';

          passengers.push({
            seat_number: seat,
            contact: phone,
            location_route: location,
            booking_type: `${bookingType}${dateStr2 ? ' ' + dateStr2 : ''}`,
            remarks: ''
          });
        }

        console.log(`   👥 Extracted ${passengers.length} passenger rows from PDF`);
        for (const p of passengers) {
          totalPassengers += p.seat_number ? p.seat_number.split(',').filter(Boolean).length : 1;
        }

      } catch (pdfErr) {
        console.log(`   ⚠️ PDF extraction error: ${pdfErr.message}`);
      }

      savedReports.push({ routeName, pdfUrl: pdfUrl || '', passengers, totalPassengers });

      // Go back to reports page for next route
      await page.goto('https://magiyaoperator.zuselab.dev/reports', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await sleep(5000);

      // Re-select report type
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
      await sleep(4000);
    }

    // ==== SAVE ALL REPORTS TO SUPABASE ====
    console.log(`\n💾 Saving ${savedReports.length} report(s) to Supabase...`);

    for (const rep of savedReports) {
      const reportData = {
        route_name: rep.routeName,
        report_date: dateStr,
        status: 'completed',
        bus_number: 'NG 8241',
        pdf_url: rep.pdfUrl || null,
        total_passengers: rep.totalPassengers || 0,
        total_revenue_lkr: 0
      };

      const { data: saved, error: parentErr } = await supabase
        .from('magiya_daily_reports')
        .upsert(reportData, { onConflict: 'bus_number,report_date,route_name' })
        .select('id')
        .single();

      if (parentErr) {
        console.error(`   ❌ DB Error (${rep.routeName}): ${parentErr.message}`);
        continue;
      }

      console.log(`   ✅ Saved report: ${rep.routeName} (${rep.totalPassengers} passengers)`);

      // Save individual passenger rows
      if (rep.passengers && rep.passengers.length > 0) {
        const reportId = saved.id;
        // Delete old rows for this report to avoid duplicates
        await supabase.from('magiya_passenger_bookings').delete().eq('report_id', reportId);

        const rowsToInsert = rep.passengers.map(p => ({ ...p, report_id: reportId }));
        const { error: rowErr } = await supabase
          .from('magiya_passenger_bookings')
          .insert(rowsToInsert);

        if (rowErr) {
          console.log(`   ⚠️ Passenger rows save failed: ${rowErr.message}`);
        } else {
          console.log(`   ✅ Saved ${rep.passengers.length} passenger records`);
        }
      }
    }

    console.log('\n🎉 Scraper complete! Data with passenger counts saved to Supabase.');

  } catch (err) {
    console.error('❌ Scraper Failed:', err.message);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed.');
  }
}

runMagiyaScraper();
