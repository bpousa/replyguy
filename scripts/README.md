# ReplyGuy Scripts

This directory contains utility scripts for managing the ReplyGuy application.

## Available Scripts

### Database Management

- `seed-reply-types.ts` - Seeds the database with reply type definitions
- `update-stripe-prices.js` - Updates Stripe price IDs in the database (requires environment variables)

### Stripe Management

Scripts for managing Stripe products and prices have been created but require environment variables to be set:

1. Create products in Stripe
2. List live mode prices
3. Test Stripe connection

To use these scripts:
1. Ensure `.env.local` is properly configured with your Stripe API keys
2. Run scripts using Node.js: `node scripts/script-name.js`

## Environment Variables Required

- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key

## Security Note

Never commit scripts with hardcoded API keys or secrets. Always use environment variables.