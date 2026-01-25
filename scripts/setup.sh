#!/bin/bash

# =============================================================================
# DENTSI - Setup Script
# AI Voice Agent for Dental Appointment Automation
# =============================================================================

set -e

echo "🦷 DENTSI Setup Script"
echo "======================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Navigate to nodejs_space
cd "$(dirname "$0")/../nodejs_space"
echo ""
echo "📦 Installing backend dependencies..."
npm install

# Check for .env file
echo ""
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Please edit nodejs_space/.env with your actual API keys:${NC}"
    echo "   - DATABASE_URL (PostgreSQL connection string)"
    echo "   - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER"
    echo "   - OPENAI_API_KEY"
    echo "   - DEEPGRAM_API_KEY"
    echo "   - ELEVENLABS_API_KEY"
    echo ""
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check if database is accessible
echo ""
echo "🗄️  Checking database connection..."
if npx prisma db pull --force 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    
    # Run migrations
    echo ""
    echo "📊 Running database migrations..."
    npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
    
    # Seed database
    echo ""
    echo "🌱 Seeding database with sample data..."
    npx prisma db seed
else
    echo -e "${YELLOW}⚠️  Could not connect to database. Please ensure:${NC}"
    echo "   1. PostgreSQL is running"
    echo "   2. DATABASE_URL in .env is correct"
    echo "   3. The database exists"
    echo ""
    echo "To create the database manually:"
    echo "   createdb dentsi_db"
    echo ""
    echo "Then run:"
    echo "   cd nodejs_space"
    echo "   npx prisma migrate dev --name init"
    echo "   npx prisma db seed"
fi

# Navigate to dashboard
echo ""
echo "📦 Installing dashboard dependencies..."
cd ../dashboard
npm install 2>/dev/null || echo -e "${YELLOW}⚠️  Dashboard install failed (might need yarn)${NC}"

echo ""
echo "============================================"
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo "============================================"
echo ""
echo "To start the backend:"
echo "   cd nodejs_space"
echo "   npm run start:dev"
echo ""
echo "To start the dashboard:"
echo "   cd dashboard"
echo "   npm run dev"
echo ""
echo "API Documentation:"
echo "   http://localhost:3000/api-docs"
echo ""
echo "Dashboard:"
echo "   http://localhost:3001"
echo ""
