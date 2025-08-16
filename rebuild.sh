#!/usr/bin/env bash
set -euo pipefail

# Show help if requested
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [--help|-h]"
    echo ""
    echo "Builds the entire Monte Carlo monorepo using npm workspaces."
    echo "This script will build all packages and apps in the correct order."
    echo ""
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Build everything"
    echo "  $0 --help       # Show this help"
    exit 0
fi

echo "Building Monte Carlo project..."

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -f "package-lock.json" ]]; then
    echo "Error: Must run from project root directory"
    exit 1
fi

# Check if npm is available
if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is not installed or not in PATH"
    exit 1
fi

# Generate version information
echo "Generating version information..."
./scripts/version.sh generate

# Build everything using npm workspaces
echo "Building packages and apps using npm workspaces..."
npm run build:all

# Show build results
echo "Build complete! Checking dist directories..."
echo "Packages:"
for pkg in packages/*/dist/; do
    if [[ -d "$pkg" ]]; then
        echo "  $(basename $(dirname "$pkg"))/dist/ - $(ls -1 "$pkg" | wc -l) files"
    fi
done

echo "Apps:"
for app in apps/*/dist/; do
    if [[ -d "$app" ]]; then
        echo "  $(basename $(dirname "$app"))/dist/ - $(ls -1 "$app" | wc -l) files"
    fi
done

echo "✅ Build successful!"