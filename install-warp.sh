#!/usr/bin/env bash
set -euo pipefail

curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list

sudo apt-get update -qq && sudo apt-get install -y cloudflare-warp || { echo "Failed to update apt or install cloudflare-warp"; exit 1; }

warp-cli --accept-tos register || { echo "Failed to register warp-cli"; exit 1; }
warp-cli --accept-tos connect || { echo "Failed to connect warp-cli"; exit 1; }

TIMEOUT=30
ELAPSED=0
while true; do
  STATUS=$(warp-cli --accept-tos status)
  if echo "$STATUS" | grep -q "Connected"; then
    echo "Warp is connected"
    break
  fi
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "Timeout waiting for Warp connection"
    exit 1
  fi
  sleep 1
  ELAPSED=$((ELAPSED+1))
done

warp-cli --accept-tos status
curl -6 https://google.com || { echo "Failed connectivity check"; exit 1; }
