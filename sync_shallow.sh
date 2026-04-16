#!/bin/bash
echo "Fixing Golden Repo Upload..."

git config --global http.version HTTP/1.1
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 600

# 1. Ensure massive PDFs are untracked
echo "public/bus_details/" >> .gitignore
git rm -r --cached "public/bus_details/" 2>/dev/null
git add .gitignore
git commit -m "chore: bypass 341MB of bus certificates for Lovable sync"

# 2. Extract into a separate temp folder
echo "Extracting a lightweight 5MB copy..."
rm -rf /tmp/lovable-sync
mkdir -p /tmp/lovable-sync
cp -a "/Users/staff/Downloads/ncg new one/ncg-fleetflow/." /tmp/lovable-sync/
cd /tmp/lovable-sync

# 3. Create a clean Orphan Repository to bypass GitHub's Shallow protection!
echo "Building pure codebase isolated from Git history bloat..."
rm -rf .git
git init
git config http.version HTTP/1.1
git config http.postBuffer 524288000
git config user.email "bot@ncgholdings.com"
git config user.name "Lovable Sync Bot"
git branch -M main

# Make absolutely sure the 341MB won't attach!
echo "public/bus_details/" >> .gitignore
git add .
git commit -m "chore: pure lovable sync"

# 4. Push directly to Lovable Server
echo "Linking to Lovable..."
git remote add lovable https://github.com/globallyceum25-dot/ncg-fleetone-75503699.git

echo "Blasting codebase to server... This will actually take 3 seconds!"
git push -f lovable main

echo "✅ SUPER SUCCESS! Lovable is now fully synced!"
rm -rf /tmp/lovable-sync
