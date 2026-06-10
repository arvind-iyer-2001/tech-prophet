#!/bin/bash

# Navigate to script directory
cd "$(dirname "$0")"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing wizardry dependencies (npm install)..."
    npm install
fi

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "⚠️  WARNING: Local Ollama server does not seem to be running on port 11434."
    echo "The app will open, but fetching new issues will fail until Ollama is running."
    echo "To set it up, start Ollama and ensure you have downloaded gemma4:"
    echo "  ollama run gemma4"
    echo ""
fi

echo "🪄  Booting up The Daily Tech-Prophet..."

# Start Vite dev server in the background
npm run dev &
VITE_PID=$!

# Wait for Vite to bind to the port
sleep 2

# Start Electron in development mode
NODE_ENV=development npm start

# Clean up Vite server on exit
kill $VITE_PID
