# Fix Meme Generation - Update Vercel Credentials

## The Problem
Your Imgflip credentials in Vercel are incorrect. The API is returning:
```
"error_message": "Invalid username/password combination"
```

## The Solution

### Option 1: Update via Vercel CLI (Recommended)
```bash
# Set the correct username
vercel env add IMGFLIP_USERNAME production
# When prompted, enter: mikeappendment

# Set the correct password  
vercel env add IMGFLIP_PASSWORD production
# When prompted, enter: Fun4Life!

# Redeploy to apply the changes
vercel --prod
```

### Option 2: Update via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your `replyguy` project
3. Go to Settings → Environment Variables
4. Find and edit these variables:
   - `IMGFLIP_USERNAME` → Set to: `mikeappendment`
   - `IMGFLIP_PASSWORD` → Set to: `Fun4Life!`
5. Make sure they're set for "Production" environment
6. Click "Save"
7. Redeploy your project

### Option 3: Quick CLI Update (One Command)
```bash
# This will prompt for both values
echo "mikeappendment" | vercel env add IMGFLIP_USERNAME production
echo "Fun4Life!" | vercel env add IMGFLIP_PASSWORD production
vercel --prod
```

## Test After Fixing

Once deployed, test the meme generation:
1. Go to https://replyguy.vercel.app/api/test-meme
2. You should see "PASS" for all tests
3. Try generating a reply with a meme - it should work!

## Why This Happened
- Your local `.env.local` has the correct credentials
- But Vercel's production environment has different (incorrect) values
- This is why it works locally but fails in production

## Additional Notes
- The middleware is working correctly
- The code is working correctly  
- It's just the credentials that need to be fixed