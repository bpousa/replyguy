# Stripe Customer Portal Setup Guide

This guide explains how to set up a dedicated Stripe Customer Portal configuration for ReplyGuy.

## Why Use a Separate Portal Configuration?

If you have multiple applications using the same Stripe account, creating separate portal configurations allows you to:
- Show only ReplyGuy products when customers manage their subscription
- Customize branding and messaging for ReplyGuy
- Control which features are available to ReplyGuy customers
- Keep your other applications' products separate

## Setup Steps

### 1. Create the Portal Configuration

Run the provided script to create a ReplyGuy-specific portal configuration:

```bash
node scripts/create-replyguy-portal-config.js
```

This will:
- Create a new portal configuration
- Configure it to only show ReplyGuy products (X Basic, X Pro, X Business)
- Enable appropriate features (payment updates, cancellation, plan switching)
- Output a configuration ID like `bpc_1RfhoV08qNQAUd0lCw9iJPQq`

### 2. Add Configuration ID to Environment

Add the configuration ID to your environment variables:

```bash
# .env.local
STRIPE_PORTAL_CONFIG_ID=bpc_1RfhoV08qNQAUd0lCw9iJPQq
```

Also add it to Vercel:
```bash
vercel env add STRIPE_PORTAL_CONFIG_ID production
```

### 3. Customize in Stripe Dashboard (Optional)

Visit https://dashboard.stripe.com/settings/billing/portal to:
- Upload your logo
- Set brand colors
- Add privacy policy and terms URLs
- Customize cancellation reasons
- Adjust other settings

Note: Some settings can only be changed in the dashboard, not via API.

### 4. Test the Configuration

Run the test script to verify everything is working:

```bash
node scripts/test-portal-configuration.js
```

This will verify:
- Configuration exists and is active
- Correct products are included
- Features are properly enabled

## Portal Features

The ReplyGuy portal configuration enables:

✅ **Customer Updates**
- Email address changes
- Tax ID updates

✅ **Payment Management**
- Update credit card
- View payment methods

✅ **Invoice History**
- Download past invoices
- View payment history

✅ **Subscription Management**
- Cancel subscription (at period end)
- Switch between X Basic, X Pro, and X Business plans

❌ **Not Available**
- Subscription pausing (deprecated by Stripe)
- Immediate cancellation (always at period end)

## Free Plan Handling

When customers cancel their subscription:
1. Stripe cancels at the end of the billing period
2. Our webhook automatically moves them to the Free plan
3. They retain access until the period ends
4. After that, they're limited to Free plan features

To upgrade from Free plan:
- Users must go through the pricing page
- The portal only works for paying customers

## Troubleshooting

### Portal shows other products
- Make sure you're using the correct configuration ID
- Verify only ReplyGuy products are selected in the configuration

### Configuration not found
- Check the ID in your environment variables
- Ensure you're using the correct Stripe account

### Can't create configuration
- Verify your Stripe API key has the necessary permissions
- Check if you've hit the configuration limit (contact Stripe)

## Multiple Apps on Same Stripe Account

If you have multiple apps:
1. Create a separate portal configuration for each app
2. Use the appropriate configuration ID in each app
3. Each app's customers will only see relevant products

Example:
- App A: Uses `bpc_app_a_config_id`
- ReplyGuy: Uses `bpc_1RfhoV08qNQAUd0lCw9iJPQq`
- App C: Uses default portal (no configuration specified)

## Security Notes

- Never commit the configuration ID to public repos (though it's not sensitive)
- The configuration ID is safe to use in client-side code
- Only authenticated customers can access their portal session