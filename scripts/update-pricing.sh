#!/bin/bash

# Script to update pricing plans in Supabase database
# Must be run as the 'mike' user

echo "Updating pricing plans with X theme..."

# Switch to mike user and run migration
sudo -u mike supabase db push --db-url "$DATABASE_URL"

echo "✅ Pricing plans updated successfully!"
echo ""
echo "New pricing structure:"
echo "- Free: $0/month - 10 replies"
echo "- X Basic: $19/month - 300 replies"
echo "- X Pro: $49/month - 500 replies (includes Write Like Me)"
echo "- X Business: $99/month - 1000 replies (all features)"