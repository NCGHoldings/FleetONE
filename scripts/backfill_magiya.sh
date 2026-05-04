#!/bin/bash
echo "🚀 Launching 3 parallel scrapers to backfill data 3x faster!"

TARGET_DATE="2026-04-30" node scripts/magiya_scraper.js > /tmp/magiya_4_30.log 2>&1 &
TARGET_DATE="2026-05-01" node scripts/magiya_scraper.js > /tmp/magiya_5_01.log 2>&1 &
TARGET_DATE="2026-05-02" node scripts/magiya_scraper.js > /tmp/magiya_5_02.log 2>&1 &

echo "⏳ All 3 days are running concurrently in the background. It will take about 20-30 minutes total."
echo "You can check the dashboard as the records stream in. Logs are saved to /tmp/magiya_*.log"
wait
echo "✅ All backfill processes completed!"
