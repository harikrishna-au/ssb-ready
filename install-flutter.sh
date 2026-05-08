#!/bin/bash

# SSBReady Flutter Installation Helper Script

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                                                                    ║"
echo "║           🚀 SSBReady - Flutter Auto-Install Script 🚀            ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check if Flutter already exists
if command -v flutter &> /dev/null; then
    echo "✅ Flutter is already installed!"
    flutter --version
    exit 0
fi

# Step 2: Download Flutter
echo "📥 Downloading Flutter (stable channel)..."
cd ~/Downloads
if [ -d "flutter" ]; then
    echo "⚠️  Flutter folder already exists in ~/Downloads"
    echo "Updating Flutter..."
    cd flutter
    git pull
else
    echo "Cloning Flutter repository..."
    git clone https://github.com/flutter/flutter.git -b stable
    cd flutter
fi

# Step 3: Reload shell
echo "🔄 Reloading shell configuration..."
source ~/.zshrc

# Step 4: Verify installation
echo ""
echo "✅ Flutter installation complete!"
echo ""
flutter --version
echo ""

# Step 5: Run Flutter doctor
echo "🔍 Running Flutter diagnostics..."
echo ""
flutter doctor
echo ""

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                                                                    ║"
echo "║              ✨ Flutter Setup Complete! ✨                         ║"
echo "║                                                                    ║"
echo "║            Next steps:                                             ║"
echo "║            cd /Users/nallanaharikrishna/PROJECTS/ssb/ssb_ready_app║"
echo "║            flutter pub get                                         ║"
echo "║            flutter run                                             ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
