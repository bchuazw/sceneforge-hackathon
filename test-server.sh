#!/bin/bash
cd /root/OpenClaw/workspaces/gladys/sceneforge-hackathon

# Start server in background
PORT=3000 node .next/standalone/server.js &
PID=$!

# Wait for server to start
sleep 5

echo "========================================"
echo "Test 1: POST /api/build-scene"
echo "========================================"
curl -s -X POST http://localhost:3000/api/build-scene \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A peaceful forest with trees and rocks"}' | head -1000

echo ""
echo ""
echo "========================================"
echo "Test 2: GET /api/export-scene?id=scene-1775927762126"
echo "========================================"
curl -s -I "http://localhost:3000/api/export-scene?id=scene-1775927762126" | head -20

echo ""
echo "========================================"
echo "Test 3: GET /og-image.png"
echo "========================================"
curl -s -I http://localhost:3000/og-image.png | head -10

# Kill the server
kill $PID 2>/dev/null
echo ""
echo "========================================"
echo "Tests complete"
echo "========================================"
