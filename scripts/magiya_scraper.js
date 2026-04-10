import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMagiyaScraper() {
  console.log('🚀 Starting Magiya Operator Scraping Job...');
  
  // 1. Launch Headless Browser
  const browser = await puppeteer.launch({
    headless: "new", // Run entirely invisibly in the background
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigate to Login...');
    await page.goto('https://magiyaoperator.zuselab.dev/login', { waitUntil: 'domcontentloaded' });

    // 2. Perform Login via UI mimicking
    console.log('Entering credentials...');
    // We assume standard input fields exist, target them generically or via specific input types
    await page.type('input[type="email"]', 'ncgexpress@magiya.lk');
    await page.type('input[type="password"]', '0770455981');
    await page.click('button[type="submit"]');

    console.log('Waiting for authentication to complete...');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    // 3. Navigate to Reports 
    console.log('Navigating to Reports Section...');
    await page.goto('https://magiyaoperator.zuselab.dev/reports', { waitUntil: 'domcontentloaded' });

    // 4. Form Date Selection (Today's Date)
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Fill out Livewire date picker (Assuming standard input[type="date"] fields on the page)
    const dateInputs = await page.$$('input[type="date"]');
    if(dateInputs.length >= 2) {
      // Typically From and To
      await dateInputs[0].type(todayStr); // Wait for Livewire to sync
      await dateInputs[1].type(todayStr); 
    }

    console.log('Triggering Report Generation...');
    // Click Generate Button (Find by exact text)
    const [generateBtn] = await page.$x("//button[contains(., 'Generate')]");
    if (generateBtn) {
      await generateBtn.click();
    }

    // 5. Intercept the Response Data Table
    // We wait for the DOM network call to livewire/update to finish rendering the data
    await page.waitForResponse(response => 
      response.url().includes('/livewire/update') && response.status() === 200
    );

    // 6. Extract Table Data from DOM
    console.log('Analyzing DOM for Datatable Results...');
    const reportData = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        let extracted = [];
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if(cols.length > 3) {
               extracted.push({
                   bus_number: cols[0]?.innerText.trim(),
                   route_name: cols[1]?.innerText.trim(),
                   total_passengers: parseInt(cols[2]?.innerText.trim() || '0', 10),
                   total_revenue_lkr: parseFloat((cols[3]?.innerText.trim() || '0').replace(/,/g, '')),
               });
            }
        });
        return extracted;
    });

    console.log(`📊 Extracted ${reportData.length} booking records for today.`);

    // 7. Push to Supabase Database
    if (reportData.length > 0) {
      console.log('Uploading results directly to NCG Fleetflow Database...');
      
      const payload = reportData.map(r => ({
        ...r,
        report_date: todayStr,
        status: 'completed'
      }));

      // Upsert prevents duplicating records if the script runs twice in one day
      const { data, error } = await supabase
        .from('magiya_daily_reports')
        .upsert(payload, { onConflict: 'bus_number, report_date' });

      if (error) {
        console.error('Database Sync Failed:', error);
      } else {
        console.log('✅ Daily Scrape Synced Successfully to Supabase!');
      }
    }

  } catch (err) {
    console.error('❌ Scraper Failed:', err);
  } finally {
    // 8. Always Clean up the Chromium Instance
    await browser.close();
    console.log('Browser safely closed. Job Complete.');
  }
}

// Execute Script
runMagiyaScraper();
