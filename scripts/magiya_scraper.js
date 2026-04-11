import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMagiyaScraper() {
  console.log('🚀 Starting Magiya Operator Scraping Job...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 60000 
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigate to Login...');
    await page.goto('https://magiyaoperator.zuselab.dev/login', { waitUntil: 'domcontentloaded' });

    console.log('Entering credentials...');
    await page.type('input[type="email"]', 'ncgexpress@magiya.lk');
    await page.type('input[type="password"]', '0770455981');
    
    console.log('Waiting for authentication...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('button[type="submit"]')
    ]);

    console.log('Navigating to Reports Section...');
    await page.goto('https://magiyaoperator.zuselab.dev/reports', { waitUntil: 'domcontentloaded' });

    console.log('Triggering Report Generation...');
    await page.evaluate(async () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const genBtn = buttons.find(b => b.innerText.includes('Generate'));
      if (genBtn) genBtn.click();
    });

    console.log('Waiting for datatable to render from the network...');
    await page.waitForFunction(() => {
      return document.querySelector('table tbody tr') !== null;
    }, { timeout: 45000 });

    console.log('Analyzing DOM for Datatable Results...');
    const reportData = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        let extracted = [];
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if(cols.length > 3) {
               extracted.push({
                   bus_number: cols[0]?.innerText.trim() || 'UNKNOWN',
                   route: cols[1]?.innerText.trim() || 'Route',
                   passengers: parseInt(cols[2]?.innerText.trim() || '0', 10),
                   revenue: parseFloat((cols[3]?.innerText.trim() || '0').replace(/,/g, '')),
               });
            }
        });
        return extracted;
    });

    console.log(`📊 Extracted ${reportData.length} booking records for today.`);

    if (reportData.length > 0) {
      console.log('Uploading results directly to NCG Fleetflow Database...');
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = reportData.map(r => ({
        ...r,
        report_date: todayStr,
        status: 'completed'
      }));
      const { error } = await supabase
        .from('magiya_daily_reports')
        .upsert(payload, { onConflict: 'bus_number, report_date' });
      if (error) console.error('Database Sync Failed:', error);
      else console.log('✅ Daily Scrape Synced to Cloud!');
    }

  } catch (err) {
    console.error('❌ Scraper Failed:', err.message);
  } finally {
    await browser.close();
    console.log('Browser safely closed.');
  }
}

runMagiyaScraper();
