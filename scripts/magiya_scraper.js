import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runMagiyaScraper() {
  console.log('🚀 Magiya Scraper V4 — PDF Route Extraction');
  
  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--disable-extensions',
    ],
    protocolTimeout: 0  // Infinite — never kill CDP
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(0);

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    // ===== LOGIN =====
    console.log('🚪 Logging in...');
    await page.goto('https://magiyaoperator.zuselab.dev/login', { waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
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
    await sleep(8000); // Let ALL Livewire components fully mount

    // ===== STEP 1: Select "Daily Bookings Report" from first dropdown =====
    console.log('📋 Step 1: Selecting "Daily Bookings Report"...');
    const selects = await page.$$('select');
    console.log(`   Found ${selects.length} <select> elements`);
    
    if (selects.length >= 1) {
      // Use Puppeteer native select — avoids page.evaluate CDP freeze
      const options1 = await selects[0].$$('option');
      let dailyValue = null;
      for (const opt of options1) {
        const text = await opt.evaluate(el => el.textContent);
        console.log(`   Option: "${text}"`);
        if (text.includes('Daily Bookings')) {
          dailyValue = await opt.evaluate(el => el.value);
          break;
        }
      }
      if (dailyValue) {
        await selects[0].select(dailyValue);
        console.log('   ✅ "Daily Bookings Report" selected.');
      } else {
        console.log('   ⚠️ Could not find "Daily Bookings Report" option.');
      }
    }
    await sleep(5000); // Wait for Livewire to process

    // ===== STEP 2: Select first specific route (NOT "All Trips") =====
    console.log('🗺 Step 2: Selecting first specific route...');
    // Re-query selects after Livewire may have re-rendered
    const selects2 = await page.$$('select');
    if (selects2.length >= 2) {
      const options2 = await selects2[1].$$('option');
      let routeValue = null;
      let routeName = null;
      for (const opt of options2) {
        const text = await opt.evaluate(el => el.textContent.trim());
        const val = await opt.evaluate(el => el.value);
        console.log(`   Route option: "${text}" (value: ${val})`);
        // Skip "All Trips" and pick the first real route
        if (text !== 'All Trips' && text !== '' && !text.includes('Select') && val !== '') {
          routeValue = val;
          routeName = text;
          break;
        }
      }
      if (routeValue) {
        await selects2[1].select(routeValue);
        console.log(`   ✅ Selected route: "${routeName}"`);
      } else {
        console.log('   ⚠️ No specific route found.');
      }
    }
    await sleep(5000);

    // ===== STEP 3: Set date to 2026-04-10 =====
    console.log('📅 Step 3: Setting date to 2026-04-10...');
    const dateInputs = await page.$$('input[type="date"]');
    console.log(`   Found ${dateInputs.length} date inputs`);
    for (const dateInput of dateInputs) {
      // Clear and type the date
      await dateInput.click({ clickCount: 3 }); // Select all existing text
      await dateInput.type('2026-04-10', { delay: 30 });
    }
    await sleep(3000);

    // ===== STEP 4: Click "Generate Report" =====
    console.log('⚙️ Step 4: Clicking Generate Report...');
    // Use page.click with an XPath-like selector to find the button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.textContent.trim());
      if (text.includes('Generate')) {
        await btn.click();
        console.log('   ✅ Clicked Generate Report.');
        break;
      }
    }

    // ===== STEP 5: Wait for "Download PDF" to appear (sleep-poll, no waitForFunction) =====
    console.log('⏳ Step 5: Waiting for PDF generation (polling every 5s, up to 4 min)...');
    let downloadReady = false;
    for (let i = 0; i < 48; i++) {
      await sleep(5000);
      try {
        // Quick, lightweight check — just look for any element containing "Download"
        const allElements = await page.$$('a, button');
        for (const el of allElements) {
          const text = await el.evaluate(e => e.textContent || '').catch(() => '');
          if (text.includes('Download')) {
            downloadReady = true;
            break;
          }
        }
        if (downloadReady) {
          console.log(`   ✅ Download button found after ~${(i + 1) * 5}s`);
          break;
        }
        console.log(`   ... poll ${i + 1}/48`);
      } catch (e) {
        console.log(`   ... poll ${i + 1} hiccup, retrying`);
      }
    }

    if (!downloadReady) {
      await page.screenshot({ path: path.join(downloadPath, 'debug.png') });
      const html = await page.content().catch(() => 'could not get HTML');
      fs.writeFileSync(path.join(downloadPath, 'debug.html'), html);
      throw new Error('Download button never appeared.');
    }

    // ===== STEP 6: Click Download PDF =====
    console.log('📥 Step 6: Clicking Download PDF...');
    let pdfUrl = null;
    const allLinks = await page.$$('a, button');
    for (const el of allLinks) {
      const text = await el.evaluate(e => e.textContent || '').catch(() => '');
      if (text.includes('Download')) {
        // Check if it's an <a> with href
        const href = await el.evaluate(e => e.tagName === 'A' ? e.href : null).catch(() => null);
        if (href) {
          pdfUrl = href;
          console.log(`   📎 PDF URL: ${href}`);
        }
        await el.click().catch(() => {});
        console.log('   ✅ Clicked Download.');
        break;
      }
    }
    await sleep(3000);

    // ===== STEP 7: Get the PDF data =====
    let pdfBuffer = null;

    // Method A: If we got a direct URL, fetch it via authenticated page
    if (pdfUrl) {
      console.log('💾 Fetching PDF via direct URL...');
      try {
        const resp = await page.goto(pdfUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (resp) {
          pdfBuffer = await resp.buffer();
          console.log(`   ✅ PDF fetched: ${pdfBuffer.length} bytes`);
        }
      } catch (e) {
        console.log('   Could not fetch directly, checking downloads folder...');
      }
    }

    // Method B: Check downloads folder
    if (!pdfBuffer) {
      console.log('💾 Waiting for file download...');
      for (let i = 0; i < 30; i++) {
        await sleep(2000);
        try {
          const files = fs.readdirSync(downloadPath);
          const pdfFiles = files.filter(f => f.endsWith('.pdf'));
          if (pdfFiles.length > 0) {
            const filePath = path.join(downloadPath, pdfFiles[0]);
            const stats = fs.statSync(filePath);
            if (stats.size > 100) {
              pdfBuffer = fs.readFileSync(filePath);
              console.log(`   ✅ PDF from file: ${pdfBuffer.length} bytes`);
              break;
            }
          }
        } catch (e) { /* keep trying */ }
      }
    }

    if (!pdfBuffer) throw new Error('Could not obtain PDF data from either method!');

    // ===== STEP 8: Parse PDF =====
    console.log('🔍 Parsing PDF...');
    const pdfData = await pdf(pdfBuffer);
    console.log('\n================= RAW PDF TEXT =================');
    console.log(pdfData.text);
    console.log('================= END PDF TEXT =================\n');
    console.log(`Pages: ${pdfData.numpages}, Chars: ${pdfData.text.length}`);
    console.log('✅ Phase 1 complete — text extracted for analysis.');

  } catch (err) {
    console.error('❌ Scraper Failed:', err.message);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed.');
  }
}

runMagiyaScraper();
