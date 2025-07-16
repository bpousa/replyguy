# Update Trial Prices to Live Mode

Since you already have live mode set up, you need to:

## 1. Create the Live Trial Products

Run this command with your live key:
```bash
STRIPE_SECRET_KEY=sk_live_YOUR_KEY node scripts/create-live-trial-products.js
```

This will output two LIVE price IDs like:
- X Basic $1 Trial: price_1XXXXXX
- X Pro $1 Trial: price_1YYYYYY

## 2. Update the Code

Once you have the live price IDs, update these files:

### `/app/auth/trial-offer/page.tsx` (around line 46-48)
```typescript
const priceId = plan === 'pro' 
  ? 'price_1YYYYYY' // Replace with your X Pro live price ID
  : 'price_1XXXXXX'; // Replace with your X Basic live price ID
```

### `/app/api/stripe/create-trial-checkout/route.ts` (around line 13-16)
```typescript
const TRIAL_PRICES = {
  growth: 'price_1XXXXXX',      // Replace with your X Basic live price ID
  professional: 'price_1YYYYYY', // Replace with your X Pro live price ID
};
```

### Update Database

Create a new migration file or run this SQL directly:
```sql
UPDATE subscription_plans SET 
  stripe_trial_price_id_monthly = 'price_1XXXXXX'
WHERE id = 'growth';

UPDATE subscription_plans SET 
  stripe_trial_price_id_monthly = 'price_1YYYYYY'
WHERE id = 'professional';
```

## 3. Test

1. Create a new free account
2. Should see trial offer after email verification
3. Use a real credit card (will charge $1)
4. Verify in Stripe dashboard

## Current Test Mode Price IDs (for reference)
- X Basic: price_1RlGUQ08qNQAUd0lhSz7IEvB
- X Pro: price_1RlGV108qNQAUd0l4uxeX34V