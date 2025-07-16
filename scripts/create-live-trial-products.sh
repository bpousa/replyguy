#!/bin/bash

# Script to create trial products in Stripe live mode
# Make sure to set STRIPE_LIVE_SECRET_KEY environment variable first

echo "Creating trial products in Stripe LIVE mode..."
echo "WARNING: This will create real products that can accept real payments!"
echo ""

# Check if live key is set
if [ -z "$STRIPE_LIVE_SECRET_KEY" ]; then
    echo "ERROR: STRIPE_LIVE_SECRET_KEY environment variable is not set"
    echo "Please set it first: export STRIPE_LIVE_SECRET_KEY=sk_live_..."
    exit 1
fi

# Create X Basic trial product
echo "Creating X Basic $1 Trial product..."
BASIC_PRODUCT=$(stripe products create \
  --name "X Basic - Dollar Trial" \
  --description "30-day trial of X Basic plan for \$1, then \$19/month" \
  -d "metadata[plan_id]=growth" \
  -d "metadata[is_trial]=true" \
  --api-key $STRIPE_LIVE_SECRET_KEY \
  | grep '"id"' | head -1 | cut -d'"' -f4)

echo "Created product: $BASIC_PRODUCT"

# Create X Basic trial price
echo "Creating X Basic trial price..."
BASIC_PRICE=$(stripe prices create \
  --product $BASIC_PRODUCT \
  --currency usd \
  --unit-amount 100 \
  -d "recurring[interval]=month" \
  -d "recurring[trial_period_days]=30" \
  --nickname "X Basic \$1 Trial - 30 days" \
  -d "metadata[plan_id]=growth" \
  -d "metadata[is_trial]=true" \
  --api-key $STRIPE_LIVE_SECRET_KEY \
  | grep '"id"' | head -1 | cut -d'"' -f4)

echo "Created X Basic trial price: $BASIC_PRICE"

# Create X Pro trial product
echo "Creating X Pro $1 Trial product..."
PRO_PRODUCT=$(stripe products create \
  --name "X Pro - Dollar Trial" \
  --description "30-day trial of X Pro plan for \$1, then \$49/month" \
  -d "metadata[plan_id]=professional" \
  -d "metadata[is_trial]=true" \
  --api-key $STRIPE_LIVE_SECRET_KEY \
  | grep '"id"' | head -1 | cut -d'"' -f4)

echo "Created product: $PRO_PRODUCT"

# Create X Pro trial price
echo "Creating X Pro trial price..."
PRO_PRICE=$(stripe prices create \
  --product $PRO_PRODUCT \
  --currency usd \
  --unit-amount 100 \
  -d "recurring[interval]=month" \
  -d "recurring[trial_period_days]=30" \
  --nickname "X Pro \$1 Trial - 30 days" \
  -d "metadata[plan_id]=professional" \
  -d "metadata[is_trial]=true" \
  --api-key $STRIPE_LIVE_SECRET_KEY \
  | grep '"id"' | head -1 | cut -d'"' -f4)

echo "Created X Pro trial price: $PRO_PRICE"

echo ""
echo "✅ Trial products created successfully!"
echo ""
echo "LIVE Price IDs:"
echo "X Basic $1 Trial: $BASIC_PRICE"
echo "X Pro $1 Trial: $PRO_PRICE"
echo ""
echo "Next steps:"
echo "1. Update your code with these LIVE price IDs"
echo "2. Update database with new price IDs"
echo "3. Ensure STRIPE_SECRET_KEY is set to your live key"