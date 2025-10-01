#!/bin/bash

echo "🚀 Building Taekwondo Analytics Platform for Deployment"
echo "=============================================="

# Build with enhanced deployment configuration
echo "📦 Running enhanced build process..."
node deploy-build.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "📁 Deployment files are ready in the dist/ directory:"
    echo "   - dist/index.js (ESM-compatible server bundle)"
    echo "   - dist/package.json (deployment configuration)"
    echo "   - dist/.replit (Replit deployment config)"
    echo "   - dist/public/ (frontend assets)"
    echo ""
    echo "🎯 Deployment Fixes Applied:"
    echo "   ✓ ESBuild format changed to ESM"
    echo "   ✓ External packages properly configured"
    echo "   ✓ import.meta and top-level await support added"
    echo "   ✓ ESM compatibility polyfills included"
    echo ""
    echo "🚀 Ready for Replit Deployment!"
    echo "   Use the Deploy button in Replit to deploy from the dist/ directory"
else
    echo "❌ Build failed! Check the error messages above."
    exit 1
fi