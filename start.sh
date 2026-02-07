#!/bin/sh
# Start API in background
cd /app/api && node dist/index.js &

# Start Next.js
cd /app/web && node apps/web/server.js
