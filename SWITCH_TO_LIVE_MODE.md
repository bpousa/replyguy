# Switching to Stripe Live Mode

## Steps to Enable Live Trial Purchases

### 1. Set Your Live Stripe Key
First, export your live Stripe secret key:
```bash
export STRIPE_LIVE_SECRET_KEY=sk_live_YOUR_ACTUAL_LIVE_KEY
```

### 2. Create Live Trial Products
Run the script to create trial products in live mode:
```bash
./scripts/create-live-trial-products.sh
```

This will output two LIVE price IDs:
- X Basic $1 Trial: price_XXXX (for $19 plan)
- X Pro $1 Trial: price_YYYY (for $49 plan)

### 3. Update Your Code
Update the trial price IDs in `/app/auth/trial-offer/page.tsx`:

```typescript
// Around line 46-48
const priceId = plan === 'pro' 
  ? 'price_YYYY' // Replace with X Pro live price ID
  : 'price_XXXX'; // Replace with X Basic live price ID
```

Also update `/app/api/stripe/create-trial-checkout/route.ts`:
```typescript
// Around line 13-16
const TRIAL_PRICES = {
  growth: 'price_XXXX',      // Replace with X Basic live price ID
  professional: 'price_YYYY', // Replace with X Pro live price ID
};
```

### 4. Update Database
Edit `/supabase/migrations/20250715_update_live_trial_prices.sql` and replace the placeholder IDs with your actual live price IDs, then run:
```bash
supabase db push supabase/migrations/20250715_update_live_trial_prices.sql
```

### 5. Update Environment Variables
In your `.env.local` file, ensure you're using LIVE keys:
```
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_LIVE_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_LIVE_KEY
```

### 6. Deploy
Deploy to Vercel with the updated environment variables.

## Important Notes

⚠️ **WARNING**: Once in live mode:
- Real credit cards will be charged
- The $1 trial is a REAL charge
- After 30 days, customers will be charged full price
- Make sure your Stripe webhook is properly configured

## Testing Live Mode

1. Create a new free account
2. Verify email
3. You should see the trial offer
4. Use a REAL credit card (you'll be charged $1)
5. Verify subscription is created in Stripe dashboard

## Switching Back to Test Mode

To switch back to test mode:
1. Change environment variables back to `sk_test_...` and `pk_test_...`
2. Update the price IDs back to the test ones
3. Restart your development server