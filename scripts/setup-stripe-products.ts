import Stripe from 'stripe';

// This script sets up Stripe products and prices for the X-themed plans
// Run with: npx tsx scripts/setup-stripe-products.ts

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

interface PlanConfig {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number; // in cents
  yearlyPrice: number; // in cents
  features: string[];
}

const plans: PlanConfig[] = [
  {
    id: 'x_basic',
    name: 'X Basic',
    description: 'For active X users',
    monthlyPrice: 1900, // $19
    yearlyPrice: 19000, // $190 (annual)
    features: [
      '300 replies per month',
      '10 memes per month', 
      '50 AI suggestions',
      'All reply types',
      'Email support'
    ]
  },
  {
    id: 'x_pro',
    name: 'X Pro',
    description: 'For power users and content creators',
    monthlyPrice: 4900, // $49
    yearlyPrice: 49000, // $490 (annual)
    features: [
      '500 replies per month',
      '50 memes per month',
      '100 AI suggestions',
      'Write Like Me™ AI training',
      'Style matching',
      'Medium-length replies',
      'Priority support'
    ]
  },
  {
    id: 'x_business',
    name: 'X Business',
    description: 'For agencies and high-volume users',
    monthlyPrice: 9900, // $99
    yearlyPrice: 99000, // $990 (annual)
    features: [
      '1000 replies per month',
      '100 memes per month',
      '200 AI suggestions',
      'Write Like Me™ AI training',
      'Real-time fact checking',
      'Long-form replies (1000 chars)',
      'API access',
      'Dedicated support'
    ]
  }
];

async function setupStripeProducts() {
  console.log('Setting up Stripe products and prices...\n');
  
  const priceIds: Record<string, { monthly: string; yearly: string }> = {};
  
  for (const plan of plans) {
    try {
      console.log(`Creating product: ${plan.name}`);
      
      // Create or update product
      let product: Stripe.Product;
      
      // Check if product already exists
      const existingProducts = await stripe.products.search({
        query: `name:"${plan.name}"`,
      });
      
      if (existingProducts.data.length > 0) {
        product = existingProducts.data[0];
        console.log(`  ✓ Product already exists: ${product.id}`);
        
        // Update product metadata
        product = await stripe.products.update(product.id, {
          description: plan.description,
          metadata: {
            plan_id: plan.id,
            features: JSON.stringify(plan.features),
          },
        });
      } else {
        // Create new product
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: {
            plan_id: plan.id,
            features: JSON.stringify(plan.features),
          },
        });
        console.log(`  ✓ Created product: ${product.id}`);
      }
      
      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyPrice,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          plan_id: plan.id,
          billing_period: 'monthly',
        },
      });
      console.log(`  ✓ Created monthly price: ${monthlyPrice.id} ($${plan.monthlyPrice / 100}/month)`);
      
      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.yearlyPrice,
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
        metadata: {
          plan_id: plan.id,
          billing_period: 'yearly',
        },
      });
      console.log(`  ✓ Created yearly price: ${yearlyPrice.id} ($${plan.yearlyPrice / 100}/year)`);
      
      priceIds[plan.id] = {
        monthly: monthlyPrice.id,
        yearly: yearlyPrice.id,
      };
      
      console.log('');
    } catch (error) {
      console.error(`  ✗ Error creating ${plan.name}:`, error);
    }
  }
  
  console.log('\n✅ Stripe setup complete!\n');
  console.log('Price IDs to update in database:');
  console.log('================================\n');
  
  console.log('-- Update subscription_plans with Stripe price IDs');
  console.log(`UPDATE subscription_plans SET 
  stripe_price_id_monthly = '${priceIds.x_basic?.monthly}',
  stripe_price_id_yearly = '${priceIds.x_basic?.yearly}'
WHERE id = 'growth';

UPDATE subscription_plans SET 
  stripe_price_id_monthly = '${priceIds.x_pro?.monthly}',
  stripe_price_id_yearly = '${priceIds.x_pro?.yearly}'
WHERE id = 'professional';

UPDATE subscription_plans SET 
  stripe_price_id_monthly = '${priceIds.x_business?.monthly}',
  stripe_price_id_yearly = '${priceIds.x_business?.yearly}'
WHERE id = 'enterprise';`);
  
  console.log('\n\nWebhook endpoint to configure in Stripe Dashboard:');
  console.log('=================================================');
  console.log('URL: https://replyguy.appendment.com/api/stripe/webhook');
  console.log('Events to listen for:');
  console.log('- customer.subscription.created');
  console.log('- customer.subscription.updated'); 
  console.log('- customer.subscription.deleted');
  console.log('- invoice.payment_succeeded');
  console.log('- invoice.payment_failed');
}

// Run the setup
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
  console.error('Please add it to your .env.local file');
  process.exit(1);
}

setupStripeProducts().catch(console.error);