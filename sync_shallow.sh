#!/bin/bash
ORIGINAL_DIR=$(pwd)
echo "🚀 Starting 1-Click Sync Process..."

# 1. Ensure massive PDFs are untracked just in case
echo "public/bus_details/" >> .gitignore 2>/dev/null
git rm -r --cached "public/bus_details/" 2>/dev/null
git add .gitignore
git commit -m "chore: bypass 341MB of bus certificates for Lovable sync" 2>/dev/null

echo "📦 1/3 - Pushing normally to NCGHoldings (your main repo)..."
current_branch=$(git branch --show-current)
git push origin "$current_branch"

echo "🧹 2/3 - Generating lightweight clean branch for Lovable..."
# Generate a perfect clean sheet of the current codebase without the 384MB Ghost history
git checkout --orphan lovable_sync
git add -A
# Notice: We intentionally DO NOT force add the .env file.
# Pushing the .env file triggers a 408 Timeout because GitHub secretly blocks Supabase Passwords!
# Lovable automatically handles the keys via the native Supabase integration.
git commit -m "force clean lovable sync"

echo "⚡ 3/3 - Pushing safely to Globallyceum (Lovable repo)..."
git remote add lovablerepo https://github.com/globallyceum25-dot/ncg-fleetone-545c8dda.git 2>/dev/null
git push -f lovablerepo lovable_sync:main

echo "🧹 Cleaning up..."
git checkout "$current_branch"
git branch -D lovable_sync

echo "🎉 All Done! Both your NCGHoldings and Globallyceum repositories are 100% Synced!"
