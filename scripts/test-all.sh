#!/bin/bash
set -e

API_URL="${API_URL:-https://api-production-9382.up.railway.app}"
WEB_URL="${WEB_URL:-https://web-production-4c0410.up.railway.app}"

echo "========================================"
echo "🧪 Apocalypse Radio - Full Test Suite"
echo "========================================"
echo ""
echo "API: $API_URL"
echo "Web: $WEB_URL"
echo ""

# Run API tests
echo "📡 Running API Tests..."
cd "$(dirname "$0")/../apps/api"
API_URL="$API_URL" npx tsx tests/api.test.ts

echo ""
echo "🔍 Running Schema Tests..."
API_URL="$API_URL" npx tsx tests/schema.test.ts

# Run Web tests
echo ""
echo "🌐 Running Web Tests..."
cd "$(dirname "$0")/../apps/web"
WEB_URL="$WEB_URL" npx tsx tests/pages.test.ts

echo ""
echo "========================================"
echo "✨ All tests completed successfully!"
echo "========================================"
