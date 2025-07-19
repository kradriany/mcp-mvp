#!/bin/bash

echo "Starting OPC UA Perlin Noise Demo..."
echo "==========================================="

# Function to cleanup background processes
cleanup() {
    echo "\nShutting down services..."
    jobs -p | xargs -r kill
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start OPC UA Server in background
echo "Starting OPC UA Server on port 4840..."
node server/index.js &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 3

# Start OPC UA Bridge in background
echo "Starting OPC UA Bridge on port 4001..."
node bridge/index.js &
BRIDGE_PID=$!

# Wait a moment for the bridge to start
sleep 3

# Start React Frontend
echo "Starting React Frontend on port 3001..."
echo "==========================================="
echo "Access the application at: http://localhost:3001"
echo "OPC UA Server endpoint: opc.tcp://localhost:4840"
echo "OPC UA Bridge API: http://localhost:4001"
echo "==========================================="
echo "Press Ctrl+C to stop all services"
echo ""

cd frontend && npm start

# Wait for all background jobs
wait