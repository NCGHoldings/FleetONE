import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMagiyaScraper() {
  console.log('🚀 Starting Magiya Operator PDF Ingestion...');
  
  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)){
      fs.mkdirSync(downloadPath, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new", executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 60000 
  });

  try {
    const page = await browser.newPage();
    
    // Enable native stealth downloads locally in the browser context
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
    });
    
    console.log('🚪 Logging in...');
    await page.goto('https://magiyaoperator.zuselab.dev/login', { waitUntil: 'domcontentloaded' });
    await page.type('input[type="email"]', 'ncgexpress@magiya.lk');
    await page.type('input[type="password"]', '0770455981');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('button[type="submit"]')
    ]);

    console.log('📄 Navigating to Reports...');
    await page.goto('https://magiyaoperator.zuselab.dev/reports', { waitUntil: 'domcontentloaded' });

    console.log('🎛 Selecting "All Trips" in dropdown...');
    await page.evaluate(async () => {
      const selects = document.querySelectorAll('select');
      if (selects.length > 1) {
         selects[1].selectedIndex = 0; 
         selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 4000));

    console.log('⚙️ Clicking Generate Report...');
    await page.evaluate(async () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const genBtn = buttons.find(b => b.innerText.includes('Generate'));
      if (genBtn) genBtn.click();
    });

    console.log('⏳ Waiting for PDF to render on Magiya servers...');
    await page.waitForFunction(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      return links.some(l => l.innerText.includes('Download PDF'));
    }, { timeout: 120000 });

    console.log('📥 Found the Download Button! Triggering download...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const dlBtn = links.find(l => l.innerText.includes('Download PDF'));
      if (dlBtn) dlBtn.click();
    });

    console.log('💾 Waiting for PDF stream into Cloud Memory...');
    let downloadedPdf = null;
    let retries = 0;
    while (retries < 60) { 
      await new Promise(r => setTimeout(r, 1000));
      const files = fs.readdirSync(downloadPath);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));
      if (pdfFiles.length > 0) {
        await new Promise(r => setTimeout(r, 2000));
        downloadedPdf = path.join(downloadPath, pdfFiles[0]);
        break;
      }
      retries++;
    }

    if (!downloadedPdf) throw new Error("PDF never appeared in the downloads directory!");
    
    console.log(`✅ PDF Saved locally to Github Runner: ${downloadedPdf}`);
    console.log('🔍 Executing text ripping engine...');
    
    const dataBuffer = fs.readFileSync(downloadedPdf);
    const pdfData = await pdf(dataBuffer);

    console.log('\n\n================= RAW TEXT START =================');
    console.log(pdfData.text);
    console.log('================= RAW TEXT END   =================\n\n');
    console.log('⚠️ Stopping here. Please grab a screenshot of the text printed above and send it to your AI to map your Database Routes!');

  } catch (err) {
    console.error('❌ Scraper Failed:', err.message);
  } finally {
    await browser.close();
  }
}

runMagiyaScraper();
