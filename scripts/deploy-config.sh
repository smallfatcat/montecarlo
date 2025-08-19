#!/bin/bash

# Deployment configuration script for Montecarlo
# This script sets up the environment for production builds

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up deployment configuration for Montecarlo...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: This script must be run from the project root directory${NC}"
    exit 1
fi

# Set production Convex URL
export VITE_CONVEX_URL="https://convex.smallfatcat-dev.org"

echo -e "${YELLOW}Production Convex URL set to: ${VITE_CONVEX_URL}${NC}"

# Build the frontend for production
echo -e "${GREEN}Building frontend for production...${NC}"
cd vite-app
npm run build:prod

echo -e "${GREEN}Production build completed!${NC}"
echo -e "${YELLOW}The built files are in: vite-app/dist/${NC}"
echo -e "${YELLOW}You can now deploy these files to your hosting provider${NC}"

# Ask if user wants to deploy to GitHub Pages
echo -e "${YELLOW}Do you want to deploy to GitHub Pages? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${GREEN}Deploying to GitHub Pages...${NC}"
    npm run deploy
    echo -e "${GREEN}Deployment to GitHub Pages completed!${NC}"
    echo -e "${YELLOW}Your app should be available at: https://smallfatcat.github.io/montecarlo/${NC}"
else
    echo -e "${YELLOW}Skipping GitHub Pages deployment.${NC}"
    echo -e "${YELLOW}You can manually deploy later with: npm run deploy:gh-pages${NC}"
fi
