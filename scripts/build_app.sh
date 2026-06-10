#!/bin/bash

# Navigate to parent root directory
cd "$(dirname "$0")/.."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

echo "Building React static assets (npm run build)..."
npm run build

echo "Packaging Electron application (npm run pack)..."
npm run pack

echo "Deploying to user Applications folder..."
mkdir -p "$HOME/Applications"
rm -rf "$HOME/Applications/The Daily Tech-Prophet.app"
cp -R "dist_electron/mac-arm64/The Daily Tech-Prophet.app" "$HOME/Applications/"

echo ""
echo "🎉 Packaging and Deployment Complete!"
echo "Your macOS app bundle has been copied to:"
echo "📁 $HOME/Applications/The Daily Tech-Prophet.app"
echo "You can now trigger it from the macOS Shortcuts app or Spotlight!"
echo ""
