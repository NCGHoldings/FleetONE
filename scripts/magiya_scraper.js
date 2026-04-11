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

// Click any visible element containing exact text
async function clickByText(page, text, tag = '*') {
  const xpath = `//${tag}[contains(text(), "${text}")]`;
  const elements = await page.$x(xpath);
  if (elements.length > 0) {
    await elements[0].click();
    console.log(`   ✅ Clicked: "${text}"`);
    return true;
  }
  console.log(`   ⚠️ Not found: "${text}"`);
  return false;
}

// Check if text exists anywhere on page
async function hasText(page, text) {
  const xpath = `//*[contains(text(), "${text}")]`;
  const elements = await page.$x(xpath);
  return elements.length > 0;
}

async function runMagiyaScraper() {
  console.log('🚀 Magiya Scraper V5 — Custom Dropdown Handler');
  
  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    protocolTimeout: 0
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

    // ===== DEBUG: Dump page structure =====
    console.log('🔍 Analyzing page structure...');
    const pageDebug = await page.evaluate(() => {
      const info = {};
      info.selects = document.querySelectorAll('select').length;
      info.inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type, placeholder: i.placeholder, value: i.value, name: i.name
      }));
      info.buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim().substring(0, 50));
      // Look for dropdown-like elements
      info.divWithClick = document.querySelectorAll('[wire\\:click]').length;
      info.wireModel = document.querySelectorAll('[wire\\:model]').length;
      info.xData = document.querySelectorAll('[x-data]').length;
      // All visible text items that look like dropdown options
      info.allLinks = Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim().substring(0, 60));
      // Check for Livewire select components
      info.wireSelect = document.querySelectorAll('[wire\\:model\\.live]').length;
      // Any element with "Report Type" text
      const allEls = document.querySelectorAll('*');
      const reportTypeEls = [];
      for (const el of allEls) {
        const t = el.textContent?.trim();
        if (t && (t === 'Report Type...' || t === 'Daily Bookings Report' || t === 'All Trips')) {
          reportTypeEls.push({ tag: el.tagName, text: t.substring(0, 40), classes: el.className?.substring?.(0, 60) || '' });
        }
      }
      info.reportTypeElements = reportTypeEls;
      return info;
    }).catch(e => ({ error: e.message }));
    
    console.log('📊 Page structure:');
    console.log(JSON.stringify(pageDebug, null, 2));

    // ===== STEP 1: Click the "Report Type" dropdown to open it =====
    console.log('\n📋 Step 1: Opening Report Type dropdown...');
    // Try clicking text "Report Type..." or any placeholder
    let clicked = await clickByText(page, 'Report Type');
    if (!clicked) {
      // Try clicking by placeholder attribute
      const placeholderEl = await page.$('[placeholder*="Report"]');
      if (placeholderEl) {
        await placeholderEl.click();
        clicked = true;
        console.log('   ✅ Clicked via placeholder');
      }
    }
    await sleep(3000);

    // Now click "Daily Bookings Report" from the opened dropdown
    console.log('   Selecting "Daily Bookings Report"...');
    await clickByText(page, 'Daily Bookings Report');
    await sleep(5000); // Wait for Livewire to update second dropdown

    // ===== STEP 2: Click the Trip/Route dropdown =====
    console.log('\n🗺 Step 2: Opening Trip dropdown...');
    // After selecting report type, the second dropdown should now be active
    // Try clicking "All Trips" text to open the dropdown
    clicked = await clickByText(page, 'All Trips');
    await sleep(3000);

    // Select the first specific route
    console.log('   Selecting first route...');
    clicked = await clickByText(page, 'Makumbura - Badulla 10:15 AM');
    if (!clicked) {
      // Try partial match
      clicked = await clickByText(page, 'Makumbura');
    }
    await sleep(5000);

    // ===== STEP 3: Set date =====
    console.log('\n📅 Step 3: Setting date to 2026-04-10...');
    const dateInputs = await page.$$('input[type="date"]');
    console.log(`   Found ${dateInputs.length} date inputs`);
    
    if (dateInputs.length >= 1) {
      // Clear and set via JS to avoid Livewire interference
      for (const di of dateInputs) {
        await di.evaluate(el => {
          el.value = '2026-04-10';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      console.log('   ✅ Date set to 2026-04-10');
    } else {
      // Try any input that might be a date field
      const allInputs = await page.$$('input');
      for (const inp of allInputs) {
        const placeholder = await inp.evaluate(el => el.placeholder || '');
        if (placeholder.includes('yyyy') || placeholder.includes('date')) {
          await inp.click({ clickCount: 3 });
          await inp.type('2026-04-10', { delay: 30 });
          console.log('   ✅ Date typed into text input');
          break;
        }
      }
    }
    await sleep(3000);

    // ===== STEP 4: Click Generate Report =====
    console.log('\n⚙️ Step 4: Clicking Generate Report...');
    await clickByText(page, 'Generate Report', 'button');
    if (!clicked) {
      await clickByText(page, 'Generate', 'button');
    }
    await sleep(3000);

    // ===== STEP 5: Wait for Download button =====
    console.log('\n⏳ Step 5: Waiting for Download button (polling up to 4 min)...');
    let downloadReady = false;
    for (let i = 0; i < 48; i++) {
      await sleep(5000);
      try {
        const found = await hasText(page, 'Download');
        if (found) {
          downloadReady = true;
          console.log(`   ✅ Download appeared after ~${(i + 1) * 5}s`);
          break;
        }
        // Also check for Share PDF which appeared in user's screenshot
        const foundShare = await hasText(page, 'Share PDF');
        if (foundShare) {
          downloadReady = true;
          console.log(`   ✅ Share PDF appeared after ~${(i + 1) * 5}s`);
          break;
        }
        console.log(`   ... poll ${i + 1}/48`);
      } catch (e) {
        console.log(`   ... poll ${i + 1} error, continuing`);
      }
    }

    if (!downloadReady) {
      // Take debug screenshot and dump HTML
      console.log('📸 Taking debug screenshot...');
      await page.screenshot({ path: path.join(downloadPath, 'debug_step5.png'), fullPage: true });
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => 'N/A');
      console.log('📄 Page text at failure:');
      console.log(bodyText.substring(0, 2000));
      throw new Error('Download/Share PDF button never appeared.');
    }

    // ===== STEP 6: Download the PDF =====
    console.log('\n📥 Step 6: Getting PDF...');
    
    // First check if Download PDF is an <a> link with href
    let pdfUrl = null;
    const downloadLinks = await page.$x("//*[contains(text(), 'Download')]");
    for (const el of downloadLinks) {
      const href = await el.evaluate(e => e.href || e.closest('a')?.href || null).catch(() => null);
      if (href && href.includes('http')) {
        pdfUrl = href;
        console.log(`   📎 PDF URL found: ${pdfUrl}`);
        break;
      }
    }

    // Click the download button
    await clickByText(page, 'Download PDF');
    await sleep(3000);

    // Get PDF data
    let pdfBuffer = null;

    // Method A: Direct URL fetch
    if (pdfUrl) {
      console.log('   Fetching PDF via direct URL...');
      try {
        const cookies = await page.cookies();
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        const resp = await page.goto(pdfUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (resp) {
          pdfBuffer = await resp.buffer();
          console.log(`   ✅ PDF fetched: ${pdfBuffer.length} bytes`);
        }
      } catch (e) {
        console.log(`   Direct fetch failed: ${e.message}`);
      }
    }

    // Method B: Check downloads folder
    if (!pdfBuffer) {
      console.log('   Waiting for file download...');
      for (let i = 0; i < 30; i++) {
        await sleep(2000);
        const files = fs.readdirSync(downloadPath).filter(f => f.endsWith('.pdf'));
        if (files.length > 0) {
          const fp = path.join(downloadPath, files[0]);
          if (fs.statSync(fp).size > 100) {
            pdfBuffer = fs.readFileSync(fp);
            console.log(`   ✅ PDF from download: ${pdfBuffer.length} bytes`);
            break;
          }
        }
      }
    }

    if (!pdfBuffer) throw new Error('Could not obtain PDF!');

    // ===== STEP 7: Parse PDF =====
    console.log('\n🔍 Parsing PDF...');
    const pdfData = await pdf(pdfBuffer);
    console.log('\n================= RAW PDF TEXT =================');
    console.log(pdfData.text);
    console.log('================= END PDF TEXT =================\n');
    console.log(`Pages: ${pdfData.numpages}, Characters: ${pdfData.text.length}`);
    console.log('✅ Phase 1 complete.');

  } catch (err) {
    console.error('❌ Scraper Failed:', err.message);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed.');
  }
}

runMagiyaScraper();
