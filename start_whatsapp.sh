#!/bin/bash
echo "Stopping any old WhatsApp servers..."
pkill -f "node server.js" || true

echo "Starting WhatsApp server..."
cd whatsapp-server
npm start
