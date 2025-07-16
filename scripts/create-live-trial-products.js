const Stripe = require('stripe');

// Check for API key
const apiKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY;

if (!apiKey) {
  console.error('ERROR: No Stripe API key found.');
  console.error('Please set either STRIPE_SECRET_KEY or STRIPE_LIVE_SECRET_KEY environment variable.');
  console.error('Example: STRIPE_SECRET_KEY=sk_live_... node scripts/create-live-trial-products.js');
  process.exit(1);
}

const stripe = new Stripe(apiKey);

async function createTrialProducts() {
  try {
    console.log('Creating trial products with key:', apiKey.substring(0, 10) + '...');
    
    // Create X Basic trial product
    console.log('\nCreating X Basic $1 Trial product...');
    const basicProduct = await stripe.products.create({
      name: 'X Basic - Dollar Trial',
      description: '30-day trial of X Basic plan for $1, then $19/month',
      metadata: {
        plan_id: 'growth',
        is_trial: 'true'
      }
    });
    console.log('Created product:', basicProduct.id, '(livemode:', basicProduct.livemode, ')');

    // Create X Basic trial price
    console.log('Creating X Basic trial price...');
    const basicPrice = await stripe.prices.create({
      product: basicProduct.id,
      currency: 'usd',
      unit_amount: 100, // $1.00
      recurring: {
        interval: 'month',
        trial_period_days: 30
      },
      nickname: 'X Basic $1 Trial - 30 days',
      metadata: {
        plan_id: 'growth',
        is_trial: 'true'
      }
    });
    console.log('Created X Basic trial price:', basicPrice.id);

    // Create X Pro trial product
    console.log('\nCreating X Pro $1 Trial product...');
    const proProduct = await stripe.products.create({
      name: 'X Pro - Dollar Trial',
      description: '30-day trial of X Pro plan for $1, then $49/month',
      metadata: {
        plan_id: 'professional',
        is_trial: 'true'
      }
    });
    console.log('Created product:', proProduct.id, '(livemode:', proProduct.livemode, ')');

    // Create X Pro trial price
    console.log('Creating X Pro trial price...');
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      currency: 'usd',
      unit_amount: 100, // $1.00
      recurring: {
        interval: 'month',
        trial_period_days: 30
      },
      nickname: 'X Pro $1 Trial - 30 days',
      metadata: {
        plan_id: 'professional',
        is_trial: 'true'
      }
    });
    console.log('Created X Pro trial price:', proPrice.id);

    console.log('\n✅ Trial products created successfully!\n');
    console.log('PRICE IDs TO UPDATE IN YOUR CODE:');
    console.log('X Basic $1 Trial:', basicPrice.id);
    console.log('X Pro $1 Trial:', proPrice.id);
    console.log('\nMode:', basicProduct.livemode ? 'LIVE' : 'TEST');

  } catch (error) {
    console.error('Error creating products:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('Authentication failed. Check your STRIPE_SECRET_KEY environment variable.');
    }
  }
}

createTrialProducts();