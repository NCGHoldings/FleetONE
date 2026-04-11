import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const _pdfMod = require('pdf-parse');
const pdfParse = typeof _pdfMod === 'function' ? _pdfMod : (_pdfMod.default || _pdfMod);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runMagiyaScraper() {
  console.log('🚀 Magiya Scraper V6 — UI-OPTION targeting');

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

    // ===== NAVIGATE TO REPORTS =====
    console.log('📄 Going to Reports page...');
    await page.goto('https://magiyaoperator.zuselab.dev/reports', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);

    // ===== STEP 1: Click "Report Type.." button to open dropdown =====
    console.log('📋 Step 1: Opening Report Type dropdown...');
    const step1 = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim().startsWith('Report Type')) {
          btn.click();
          return 'clicked_report_type_button';
        }
      }
      return 'not_found';
    });
    console.log('   ' + step1);
    await sleep(2000); // Let dropdown animate open

    // ===== STEP 2: Click "Daily Bookings Report" ui-option =====
    console.log('📋 Step 2: Selecting "Daily Bookings Report"...');
    const step2 = await page.evaluate(() => {
      // Target the custom <ui-option> elements
      const options = document.querySelectorAll('ui-option');
      for (const opt of options) {
        if (opt.innerText.trim() === 'Daily Bookings Report') {
          opt.click();
          return 'clicked_daily_bookings';
        }
      }
      // Fallback: try any element
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.children.length === 0 && el.innerText?.trim() === 'Daily Bookings Report') {
          el.click();
          return 'clicked_daily_bookings_fallback';
        }
      }
      return 'not_found';
    });
    console.log('   ' + step2);
    await sleep(5000); // Wait for Livewire to load trip options

    // ===== STEP 3: Click "All Trips" button to open trip dropdown =====
    console.log('🗺 Step 3: Opening Trip dropdown...');
    const step3 = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.innerText.trim();
        if (text === 'All Trips' || text.startsWith('All Trips')) {
          btn.click();
          return 'clicked_all_trips_button';
        }
      }
      return 'not_found';
    });
    console.log('   ' + step3);
    await sleep(2000);

    // ===== STEP 4: Select first specific route (NOT "All Trips") from ui-option list =====
    console.log('🗺 Step 4: Selecting first specific route...');
    const step4 = await page.evaluate(() => {
      const options = document.querySelectorAll('ui-option');
      const routeOptions = [];
      for (const opt of options) {
        const text = opt.innerText.trim();
        routeOptions.push(text);
        // Skip "All Trips" and pick first real route
        if (text !== 'All Trips' && text.includes('Makumbura')) {
          opt.click();
          return 'clicked_route: ' + text;
        }
      }
      // If no Makumbura, pick the first non-All-Trips option
      for (const opt of options) {
        const text = opt.innerText.trim();
        if (text !== 'All Trips' && text !== '' && text !== 'Daily Bookings Report' && 
            text !== 'Online Bookings Report' && text !== 'Agent Bookings Report' && 
            text !== 'Booking Cancellations Report') {
          opt.click();
          return 'clicked_route: ' + text;
        }
      }
      return 'not_found. Available options: ' + routeOptions.join(' | ');
    });
    console.log('   ' + step4);
    await sleep(5000);

    // ===== STEP 5: Set date to 2026-04-10 =====
    console.log('📅 Step 5: Setting date...');
    const step5 = await page.evaluate(() => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const results = [];
      for (const di of dateInputs) {
        // Use native setter to bypass Livewire interception
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(di, '2026-04-10');
        di.dispatchEvent(new Event('input', { bubbles: true }));
        di.dispatchEvent(new Event('change', { bubbles: true }));
        results.push(di.placeholder + ' → 2026-04-10');
      }
      return results.join(', ') || 'no date inputs';
    });
    console.log('   ' + step5);
    await sleep(3000);

    // ===== STEP 6: Click "Generate Report" =====
    console.log('⚙️ Step 6: Clicking Generate Report...');
    const step6 = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim().includes('Generate Report')) {
          btn.click();
          return 'clicked_generate';
        }
      }
      return 'not_found';
    });
    console.log('   ' + step6);

    // ===== STEP 7: Wait for Download/Share PDF =====
    console.log('⏳ Step 7: Waiting for PDF generation (polling up to 4 min)...');
    let downloadReady = false;
    for (let i = 0; i < 48; i++) {
      await sleep(5000);
      try {
        const check = await page.evaluate(() => {
          const body = document.body.innerText;
          if (body.includes('Download PDF')) return 'download_pdf';
          if (body.includes('Share PDF')) return 'share_pdf';
          if (body.includes('PDF Ready')) return 'pdf_ready';
          return null;
        });
        if (check) {
          downloadReady = true;
          console.log(`   ✅ ${check} found after ~${(i + 1) * 5}s`);
          break;
        }
        console.log(`   ... poll ${i + 1}/48`);
      } catch (e) {
        console.log(`   ... poll ${i + 1} hiccup`);
      }
    }

    if (!downloadReady) {
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => 'N/A');
      console.log('📄 Page text:\n' + bodyText.substring(0, 1500));
      throw new Error('PDF never appeared.');
    }

    // ===== STEP 8: Get PDF URL and download =====
    console.log('📥 Step 8: Downloading PDF...');
    const pdfUrl = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const a of links) {
        if (a.innerText.includes('Download PDF') || a.href?.includes('.pdf') || a.href?.includes('download')) {
          return a.href;
        }
      }
      // Also check buttons that might trigger download
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.includes('Download PDF')) {
          btn.click();
          return '__clicked_button__';
        }
      }
      return null;
    });
    console.log('   PDF source: ' + pdfUrl);

    let pdfBuffer = null;

    // If we got a URL, navigate to it
    if (pdfUrl && pdfUrl !== '__clicked_button__') {
      console.log('   Fetching PDF via URL...');
      try {
        const resp = await page.goto(pdfUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (resp) {
          pdfBuffer = await resp.buffer();
          console.log(`   ✅ PDF fetched: ${pdfBuffer.length} bytes`);
        }
      } catch (e) {
        console.log('   URL fetch failed, checking downloads...');
      }
    }

    // Check downloads folder
    if (!pdfBuffer) {
      console.log('   Checking downloads folder...');
      for (let i = 0; i < 20; i++) {
        await sleep(2000);
        const files = fs.readdirSync(downloadPath).filter(f => f.endsWith('.pdf'));
        if (files.length > 0) {
          const fp = path.join(downloadPath, files[0]);
          if (fs.statSync(fp).size > 100) {
            pdfBuffer = fs.readFileSync(fp);
            console.log(`   ✅ PDF from file: ${pdfBuffer.length} bytes`);
            break;
          }
        }
      }
    }

    if (!pdfBuffer) throw new Error('Could not get PDF data!');

    // ===== STEP 9: Parse PDF =====
    console.log('🔍 Parsing PDF text...');
    const pdfData = await pdfParse(pdfBuffer);
    console.log('\n================= RAW PDF TEXT =================');
    console.log(pdfData.text);
    console.log('================= END PDF TEXT =================\n');
    console.log(`Pages: ${pdfData.numpages}, Chars: ${pdfData.text.length}`);
    console.log('✅ V6 Phase 1 complete.');

  } catch (err) {
    console.error('❌ Scraper Failed:', err.message);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed.');
  }
}

runMagiyaScraper();
