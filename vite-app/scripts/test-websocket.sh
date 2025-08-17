#!/bin/bash

# WebSocket Integration Test Script
# This script runs WebSocket tests against a running game server

set -e

echo "🚀 Starting WebSocket Integration Tests..."

# Check if game server is running
if ! curl -s http://localhost:8080/healthz > /dev/null; then
    echo "❌ Game server is not running on localhost:8080"
    echo "Please start the game server first:"
    echo "  cd apps/game-server && npm run dev"
    echo ""
    echo "Or run the full development environment:"
    echo "  npm run dev:all"
    exit 1
fi

echo "✅ Game server is running on localhost:8080"

# Run WebSocket tests
echo "🧪 Running WebSocket integration tests..."
npm test -- --run src/test/websocket-integration.test.ts

echo "✅ WebSocket tests completed successfully!"
