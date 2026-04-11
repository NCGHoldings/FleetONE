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

      // ✅ SCRAPE DATA — TreeWalker approach works on Angular Material and any framework
      console.log(`   📊 Extracting passenger data from live DOM...`);
      const passengers = await page.evaluate(() => {
        const phoneRegex = /^07\d{8}$/;
        const rows = [];
        const seen = new Set();

        // Walk every text node looking for phone numbers
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent.trim();
          if (!phoneRegex.test(text) || seen.has(text)) continue;
          seen.add(text);

          // Walk up to find a row-like container (tr, mat-row, [role=row], etc.)
          let el = node.parentElement;
          let rowEl = null;
          for (let i = 0; i < 6; i++) {
            if (!el) break;
            const tag = el.tagName.toLowerCase();
            const role = el.getAttribute('role') || '';
            if (tag === 'tr' || tag === 'mat-row' || role === 'row' || el.className.includes('row')) {
              rowEl = el; break;
            }
            el = el.parentElement;
          }

          if (!rowEl) continue;

          // Get all cell-like children
          const cells = rowEl.querySelectorAll('td, mat-cell, [role="cell"]');
          const texts = Array.from(cells).map(c => c.textContent.trim()).filter(Boolean);

          rows.push({
            seat_number: texts[0] || '',
            contact: text,
            location_route: texts[2] || texts[1] || '',
            booking_type: texts[3] || 'Unknown',
            remarks: texts[4] || ''
          });
        }
        return rows;
      });

      console.log(`   👥 Found ${passengers.length} passenger rows`);

      // Count individual seats (e.g. "3-M, 4-M" = 2)
      let totalPassengers = 0;
      for (const p of passengers) {
        totalPassengers += p.seat_number ? p.seat_number.split(',').length : 1;
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
