#!/bin/bash
echo "🚀 Running the scraper for ONLY 1 route for yesterday to test if it works..."

TEST_SINGLE_ROUTE=true node scripts/magiya_scraper.js

echo "✅ Single route test completed! Check the dashboard."
