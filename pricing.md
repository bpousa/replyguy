# ReplyGuy Pricing & Plan Configuration

## Plan Overview

ReplyGuy offers three subscription tiers with different features and limits:

### 🆓 Free Plan
- **Price**: $0/month
- **Reply Limit**: 10 replies/month
- **Character Limits**:
  - Tweet input: 280 characters
  - Response idea: 200 characters
  - Generated reply: 280 characters (short only)
- **Features**:
  - ❌ No AI suggestions
  - ❌ No long replies
  - ❌ No style matching
  - ❌ No Perplexity guidance
  - ✅ Basic reply generation
  - ✅ All tones and reply types

### 🚀 Pro Plan
- **Price**: $9/month or $90/year (17% discount)
- **Reply Limit**: 100 replies/month
- **Character Limits**:
  - Tweet input: 1000 characters
  - Response idea: 500 characters
  - Generated reply: 560 characters (short/medium)
- **Features**:
  - ✅ AI suggestions (50/month)
  - ✅ Medium-length replies
  - ✅ Style matching (50% influence)
  - ❌ No Perplexity guidance
  - ✅ Priority support

### 💎 Business Plan
- **Price**: $29/month or $290/year (17% discount)
- **Reply Limit**: 500 replies/month
- **Character Limits**:
  - Tweet input: 2000 characters
  - Response idea: 2000 characters
  - Generated reply: 2000 characters (short/medium/long)
- **Features**:
  - ✅ AI suggestions (unlimited)
  - ✅ Long replies (up to 2000 chars)
  - ✅ Style matching (50% influence)
  - ✅ Perplexity guidance
  - ✅ API access
  - ✅ Priority support
  - ✅ Usage analytics

## Database Configuration

The pricing is stored in the `subscription_plans` table with these columns:

```sql
-- Core pricing
id: 'free' | 'pro' | 'business'
name: string
description: string
price_monthly: number (in dollars)
price_yearly: number (in dollars)
reply_limit: number

-- Character limits
max_tweet_length: number
max_response_idea_length: number
max_reply_length: number

-- Features
suggestion_limit: number (0 = disabled, -1 = unlimited)
enable_long_replies: boolean
enable_style_matching: boolean
enable_perplexity_guidance: boolean

-- Stripe integration
stripe_price_id_monthly: string
stripe_price_id_yearly: string

-- Display
sort_order: number
active: boolean
```

## Stripe Configuration

### Required Environment Variables
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Stripe Products Setup
1. Create products in Stripe Dashboard for each plan
2. Create monthly and yearly prices for each product
3. Update the database with Stripe price IDs:
   ```sql
   UPDATE subscription_plans 
   SET stripe_price_id_monthly = 'price_...',
       stripe_price_id_yearly = 'price_...'
   WHERE id = 'pro';
   ```

## How to Change Pricing

### 1. Update Prices
To change plan prices, update the database:
```sql
-- Example: Change Pro plan to $12/month
UPDATE subscription_plans 
SET price_monthly = 12,
    price_yearly = 120
WHERE id = 'pro';
```

### 2. Update Limits
To change character or reply limits:
```sql
-- Example: Increase Pro plan tweet limit
UPDATE subscription_plans 
SET max_tweet_length = 1500,
    reply_limit = 150
WHERE id = 'pro';
```

### 3. Enable/Disable Features
To toggle features for a plan:
```sql
-- Example: Enable Perplexity guidance for Pro
UPDATE subscription_plans 
SET enable_perplexity_guidance = true
WHERE id = 'pro';
```

### 4. Add New Plan
To add a new subscription tier:
```sql
INSERT INTO subscription_plans (
  id, name, description, price_monthly, price_yearly,
  reply_limit, max_tweet_length, max_response_idea_length,
  max_reply_length, suggestion_limit, enable_long_replies,
  enable_style_matching, enable_perplexity_guidance,
  sort_order, active
) VALUES (
  'enterprise', 'Enterprise', 'For teams and agencies',
  99, 990, 2000, 5000, 5000, 5000, -1, true, true, true,
  4, true
);
```

## Cost Considerations

### API Costs per Reply
- **GPT-3.5-turbo**: ~$0.002 (classification + suggestions)
- **Perplexity**: ~$0.0002 per search
- **Claude Sonnet**: ~$0.003 (reasoning)
- **Claude Opus**: ~$0.015 (generation)
- **Style Analysis**: ~$0.001 (optional)

**Total per reply**: ~$0.02-0.025

### Profit Margins
- **Free**: Loss leader (limited to 10 replies = ~$0.25 cost)
- **Pro**: $9 - (100 × $0.025) = ~$6.50 profit
- **Business**: $29 - (500 × $0.025) = ~$16.50 profit

## Implementation Checklist

### Initial Setup
- [ ] Run database migration to add plan columns
- [ ] Create Stripe products and prices
- [ ] Update database with Stripe price IDs
- [ ] Set environment variables

### Code Updates Needed
1. **Update Plan Context** (`app/contexts/PlanContext.tsx`):
   ```typescript
   // Create a context to provide user's plan throughout the app
   export const PlanContext = createContext<SubscriptionPlan | null>(null);
   ```

2. **Update ReplyForm** to use actual plan data:
   ```typescript
   // Replace hardcoded plan with context
   const userPlan = useContext(PlanContext);
   ```

3. **Add Usage Tracking**:
   - Track replies per user per month
   - Enforce limits before generation
   - Reset counters monthly

### Testing
1. Test each plan's limits and features
2. Verify Stripe checkout flow
3. Test plan upgrades/downgrades
4. Verify feature gates work correctly

## Monitoring

Track these metrics:
- Replies per user per plan
- API costs per plan
- Conversion rates (free → paid)
- Feature usage by plan
- Churn rate by plan

## Support

For plan-related issues:
- Free users: Community support only
- Pro/Business: Priority email support
- Enterprise: Dedicated Slack channel