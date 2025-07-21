# Stripe Setup Instructions for ReplyGuy

## Products and Pricing Structure

### 1. X Basic Plan
- **Monthly**: $19/month
- **Yearly**: $190/year (save $38)
- **Product ID**: Create product named "X Basic"
- **Features**:
  - 300 replies per month
  - 10 memes per month
  - 100 AI suggestions
  - All reply types
  - Email support

### 2. X Pro Plan
- **Monthly**: $49/month
- **Yearly**: $490/year (save $98)
- **Product ID**: Create product named "X Pro"
- **Features**:
  - 500 replies per month
  - 50 memes per month
  - 200 AI suggestions
  - Write Like Me™ AI training
  - Style matching
  - Medium-length replies
  - Priority support

### 3. X Business Plan
- **Monthly**: $99/month
- **Yearly**: $990/year (save $198)
- **Product ID**: Create product named "X Business"
- **Features**:
  - 1000 replies per month
  - 100 memes per month
  - 400 AI suggestions
  - Write Like Me™ AI training
  - Real-time fact checking
  - Long-form replies (1000 chars)
  - API access
  - Dedicated support

## Setup Steps

### 1. Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/products
2. Create three products with the names above
3. For each product, create two prices:
   - Monthly recurring price
   - Yearly recurring price

### 2. Update Database with Price IDs

After creating the products, update the database with the Stripe price IDs:

```sql
-- Update X Basic (growth plan)
UPDATE subscription_plans SET 
  stripe_price_id_monthly = 'price_xxx', -- Replace with actual monthly price ID
  stripe_price_id_yearly = 'price_yyy'   -- Replace with actual yearly price ID
WHERE id = 'growth';

-- Update X Pro (professional plan)
UPDATE subscription_plans SET 
  stripe_price_id_monthly = 'price_xxx', -- Replace with actual monthly price ID
  stripe_price_id_yearly = 'price_yyy'   -- Replace with actual yearly price ID
WHERE id = 'professional';

-- Update X Business (enterprise plan)
UPDATE subscription_plans SET 
  stripe_price_id_monthly = 'price_xxx', -- Replace with actual monthly price ID
  stripe_price_id_yearly = 'price_yyy'   -- Replace with actual yearly price ID
WHERE id = 'enterprise';
```

### 3. Configure Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint URL: `https://replyguy.appendment.com/api/stripe/webhook`
3. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
4. Copy the webhook signing secret
5. Add to environment variables: `STRIPE_WEBHOOK_SECRET=whsec_xxx`

### 4. Test the Integration

1. Use Stripe test mode first
2. Create test subscriptions for each plan
3. Verify webhooks are received
4. Check database updates correctly

## Environment Variables Required

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxx  # Use sk_live_xxx for production
STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # Use pk_live_xxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Already configured in code:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
```

## Testing Checklist

- [ ] All three products created in Stripe
- [ ] Monthly and yearly prices configured
- [ ] Database updated with correct price IDs
- [ ] Webhook endpoint configured
- [ ] Test subscription created successfully
- [ ] User limits update after subscription
- [ ] Billing portal accessible
- [ ] Upgrade/downgrade flows work
- [ ] Cancellation handled properly

## Support Contact

For any issues with Stripe setup, contact:
- Stripe Support: https://support.stripe.com
- Check webhook logs: https://dashboard.stripe.com/webhooks/events