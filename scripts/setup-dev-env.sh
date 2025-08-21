#!/bin/bash

# Setup development environment script
echo "🔧 Setting up development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file with secure defaults..."
    
    # Generate secure secrets
    CONVEX_SECRET=$(openssl rand -hex 32)
    INSTANCE_SECRET=$(openssl rand -hex 32)
    
    cat > .env << EOF
# Montecarlo Environment Configuration

# Node.js Environment
NODE_ENV=development

# Convex Configuration
VITE_CONVEX_URL=http://127.0.0.1:3210
CONVEX_INGEST_SECRET=${CONVEX_SECRET}
INSTANCE_SECRET=${INSTANCE_SECRET}

# WebSocket Configuration
VITE_WS_URL=ws://127.0.0.1:8080

# Server Configuration
HOST=127.0.0.1
PORT=8080

# CORS Configuration
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Development Only - DO NOT USE IN PRODUCTION
# ALLOW_ALL_ORIGINS=1
EOF

    echo "✅ .env file created with secure random secrets"
else
    echo "📄 .env file already exists"
fi

echo "🎉 Development environment setup complete!"
echo ""
echo "To start the development environment:"
echo "  npm run dev:all"
echo ""
echo "Make sure to:"
echo "  1. Start Convex: npm run dev:convex:up"
echo "  2. Run all services: npm run dev:all"
