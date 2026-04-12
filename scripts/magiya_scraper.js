import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { createRequire } from 'module';

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
        // Use createRequire so Node resolves the path through node_modules (not relative to script)
        const _require = createRequire(import.meta.url);
        const workerPath = _require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

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

        // Sort ALL items top-to-bottom, then left-to-right within same Y
        allItems.sort((a, b) => {
          const yDiff = b.y - a.y;
          if (Math.abs(yDiff) > 4) return yDiff;
          return a.x - b.x;
        });

        // ── Seat-anchored block parsing ──────────────────────────────────────
        // Magiya PDF: each passenger row begins with a seat pattern like:
        //   "3-M"  |  "3-M, 4-M"  |  "26-F, 25-F, 27-M"
        const SEAT_RE  = /^\d{1,2}[-–][MF](\s*,\s*\d{1,2}[-–][MF])*$/i;
        const PHONE_RE = /^07\d{8}$/;

        const blocks = [];
        let cur = null;
        for (const item of allItems) {
          if (SEAT_RE.test(item.str)) {
            if (cur) blocks.push(cur);
            cur = { seat: item.str, tokens: [] };
          } else if (cur) {
            cur.tokens.push(item.str);
          }
        }
        if (cur) blocks.push(cur);

        console.log(`   🧩 Found ${blocks.length} seat blocks in PDF`);

        for (const block of blocks) {
          const tokens = block.tokens.filter(Boolean);
          const phone = tokens.find(t => PHONE_RE.test(t)) || '';

          // Booking type: look for known keywords
          let bookingType = 'Unknown';
          const hasNCG    = tokens.some(t => t.includes('NCG'));
          const hasOnline = tokens.some(t => /online/i.test(t));
          const hasAgent  = tokens.some(t => /agent/i.test(t));
          if (hasNCG)    bookingType = 'NCG Express';
          else if (hasOnline) bookingType = 'Online Booking';
          else if (hasAgent)  bookingType = 'Agent';

          // Location: time-based tokens (departure + destination)
          const locTokens = tokens.filter(t =>
            t !== phone &&
            !t.includes('NCG') && !/online/i.test(t) && !/agent/i.test(t) &&
            !/^\d{4}-\d{2}-\d{2}/.test(t) &&
            (t.match(/\d{1,2}:\d{2}/) || t.includes('–') || /AM|PM/.test(t))
          );

          // Remarks / booking date
          const dateToken = tokens.find(t => /\d{4}-\d{2}-\d{2}/.test(t)) || '';

          passengers.push({
            seat_number: block.seat,
            contact: phone,
            location_route: locTokens.slice(0, 2).join(' → '),
            booking_type: bookingType,
            remarks: dateToken
          });
          totalPassengers += block.seat.split(',').filter(Boolean).length;
        }

        console.log(`   👥 Extracted ${passengers.length} passengers (${totalPassengers} seats) from PDF`);

        // ── Extract financial summary table from bottom of PDF ───────────────
        // Labels like "Total Booked Seats", "Revenue", "Total Amount to Collect"
        const parseLKR = (str) => parseFloat((str || '0').replace(/[^0-9.]/g, '')) || 0;
        const strs = allItems.map(i => i.str);

        let summarySeats = 0, summaryRevenue = 0, summaryTotal = 0, summaryOnline = 0, summaryNCG = 0;
        for (let i = 0; i < strs.length; i++) {
          const s = strs[i];
          const next = strs[i + 1] || '';
          if (/Total Booked Seats/i.test(s))         summarySeats   = parseInt(next) || totalPassengers;
          if (/^Revenue$/i.test(s))                   summaryRevenue = parseLKR(next);
          if (/Total Amount to Collect/i.test(s))     summaryTotal   = parseLKR(next);
          if (/NCG Express Bookings/i.test(s) && /LKR/.test(strs.slice(i, i+4).join(' '))) {
            const lkrStr = strs.slice(i+1, i+5).find(t => /LKR/.test(t));
            summaryNCG = parseLKR(lkrStr);
          }
          if (/^Total Online$/i.test(s))              summaryOnline  = parseLKR(next);
        }

        // Use summary seats if available (more accurate than block count)
        if (summarySeats > 0) totalPassengers = summarySeats;

        console.log(`   💰 Revenue: LKR ${summaryRevenue.toLocaleString()} | Total to collect: LKR ${summaryTotal.toLocaleString()} | Seats: ${summarySeats}`);

        // ── Upload PDF to Supabase Storage for permanent URL ─────────────────
        const safeRoute = routeName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60);
        const storageFile = `${dateStr}/${safeRoute}.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from('magiya-reports')
          .upload(storageFile, pdfBuffer, { contentType: 'application/pdf', upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('magiya-reports').getPublicUrl(storageFile);
          pdfUrl = urlData.publicUrl;
          console.log(`   ☁️ Stored PDF: ${pdfUrl}`);
        } else {
          console.log(`   ⚠️ Storage upload: ${uploadErr.message} (using original URL)`);
        }

      } catch (pdfErr) {
        console.log(`   ⚠️ PDF extraction error: ${pdfErr.message}`);
      }

      savedReports.push({ routeName, pdfUrl: pdfUrl || '', passengers, totalPassengers, summaryRevenue, summaryTotal, summaryNCG, summaryOnline });

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
        total_revenue_lkr: rep.summaryRevenue || 0,
        total_amount_to_collect: rep.summaryTotal || 0,
        ncg_revenue_lkr: rep.summaryNCG || 0,
        online_revenue_lkr: rep.summaryOnline || 0
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
