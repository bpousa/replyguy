#!/bin/bash
# Update Imgflip password in Vercel (without special characters)

echo "🔧 Updating Imgflip password in Vercel production environment..."
echo ""

# Update password to Fun4Life (no exclamation mark)
echo "Setting IMGFLIP_PASSWORD to: Fun4Life (no special characters)"
echo "Fun4Life" | vercel env add IMGFLIP_PASSWORD production --force

echo ""
echo "✅ Password updated!"
echo ""
echo "🚀 Triggering new deployment..."
vercel --prod

echo ""
echo "Once deployed, test at:"
echo "1. https://replyguy.vercel.app/api/test-meme"
echo "2. Try generating a reply with a meme"