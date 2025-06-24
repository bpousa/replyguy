# ReplyGuy Setup Status

## Last Updated: 2025-01-24

### ✅ Completed Tasks

1. **Stripe Products & Pricing**
   - ✅ X Basic ($19/month, $190/year) - Product ID: prod_SXz1Hs6oDpAnr7
   - ✅ X Pro ($49/month, $490/year) - Product ID: prod_SXz4baZTZQNU02
   - ✅ X Business ($99/month, $990/year) - Product ID: prod_SXzCrrge2JCHKl
   - ✅ All prices created with correct amounts
   - ✅ Old prices archived

2. **Database Updates**
   - ✅ Stripe price IDs updated in database (via update-stripe-price-ids.ts)
   - ✅ Subscription plans configured with X theme
   - ✅ Reply types seeded (8 types, 28 mappings)
   - ✅ User limits configured:
     - Free: 10 replies/month, 0 memes, 0 suggestions
     - X Basic: 300 replies, 10 memes, 50 suggestions
     - X Pro: 500 replies, 50 memes, 100 suggestions, Write Like Me™
     - X Business: 1000 replies, 100 memes, 200 suggestions, all features

3. **Test Accounts Created**
   - ✅ test-free@replyguy.com (Free tier)
   - ✅ test-basic@replyguy.com (X Basic/growth tier)
   - ✅ test-pro@replyguy.com (X Pro/professional tier)
   - ✅ test-business@replyguy.com (X Business/enterprise tier)

4. **Webhook Configuration**
   - ✅ Endpoint: https://replyguy.appendment.com/api/webhooks/stripe
   - ✅ Events: checkout.session.completed, customer.subscription.*, invoice.payment_*

5. **Feature Implementation**
   - ✅ Write Like Me™ feature (backend + frontend)
   - ✅ Meme generation with limits
   - ✅ AI suggestions with plan-based limits
   - ✅ Usage tracking and enforcement
   - ✅ Billing page integrated with Stripe

### 🔄 Current Configuration

#### Environment Variables Required
```env
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Imgflip (for memes)
IMGFLIP_USERNAME=...
IMGFLIP_PASSWORD=...
```

#### Database Schema Notes
- Subscriptions stored in `users` table (not separate table)
- Plan IDs: growth (X Basic), professional (X Pro), enterprise (X Business)
- Meme limits hardcoded in check-limits route
- RPC function: `get_current_usage` returns total_replies and total_memes

### 📝 Next Steps (Optional)

1. **Production Deployment**
   - Switch to live Stripe keys
   - Verify all environment variables in Vercel
   - Test end-to-end subscription flow

2. **Monitoring**
   - Set up usage tracking dashboard
   - Monitor Stripe webhook success rate
   - Track API costs per user

3. **Documentation**
   - Update user documentation with new pricing
   - Create support docs for common issues
   - Document API endpoints for business tier

### 🚨 Important Notes

- Plan IDs in database don't match display names:
  - `growth` = X Basic
  - `professional` = X Pro  
  - `enterprise` = X Business
- Meme limits are hardcoded in `/app/api/check-limits/route.ts`
- Write Like Me™ requires Pro tier or higher
- All prices are in USD cents (multiply by 100)