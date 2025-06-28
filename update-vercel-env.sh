#\!/bin/bash
# Script to update Imgflip credentials in Vercel

echo "🔧 Updating Imgflip credentials in Vercel production environment..."
echo ""

# Update username
echo "Setting IMGFLIP_USERNAME to: mikeappendment"
echo "mikeappendment"  < /dev/null |  vercel env add IMGFLIP_USERNAME production --force

echo ""

# Update password
echo "Setting IMGFLIP_PASSWORD to: Fun4Life!"
echo "Fun4Life!" | vercel env add IMGFLIP_PASSWORD production --force

echo ""
echo "✅ Credentials updated!"
echo ""
echo "🚀 Triggering new deployment..."
vercel --prod

echo ""
echo "Once deployed, test at: https://replyguy.vercel.app/api/test-meme"
