#!/bin/bash

# ReplyGuy Setup Script
# This script helps set up the project for first-time users

echo "🚀 ReplyGuy Setup"
echo "=================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm $(npm --version) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from example..."
    cp .env.example .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  Please edit .env.local and add your API keys:"
    echo "   - OpenAI API Key"
    echo "   - Anthropic API Key"
    echo "   - Perplexity API Key (optional)"
    echo "   - Supabase credentials"
    echo ""
else
    echo "✅ .env.local already exists"
fi

# Provide next steps
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your API keys"
echo "2. Set up Supabase:"
echo "   - Create a new project at https://supabase.com"
echo "   - Run the migration SQL from supabase/migrations/001_initial_schema.sql"
echo "   - Run: npm run db:seed"
echo "3. Start the development server: npm run dev"
echo ""
echo "For more information, see the README.md file."
echo ""
echo "Happy coding! 🚀"