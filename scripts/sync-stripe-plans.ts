#!/usr/bin/env node
/**
 * Stripe to Database Plan Sync Script
 * 
 * This script syncs product and price information from Stripe to the database,
 * ensuring that plan details are always up-to-date.
 * 
 * Usage:
 * npm run sync-stripe-plans
 * npm run sync-stripe-plans -- --dry-run
 * npm run sync-stripe-plans -- --force
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface PlanMapping {
  planId: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  name: string;
  description?: string;
  replyLimit: number;
  memeLimit: number;
  suggestionLimit: number;
  features: string[];
}

async function fetchStripeProducts() {
  console.log('🔍 Fetching products and prices from Stripe...');
  
  // Fetch all active products
  const products = await stripe.products.list({
    active: true,
    limit: 100,
  });

  // Fetch all active prices
  const prices = await stripe.prices.list({
    active: true,
    limit: 100,
  });

  // Group prices by product
  const productPrices = new Map<string, Stripe.Price[]>();
  
  for (const price of prices.data) {
    const productId = price.product as string;
    if (!productPrices.has(productId)) {
      productPrices.set(productId, []);
    }
    productPrices.get(productId)!.push(price);
  }

  return { products: products.data, productPrices };
}

async function mapStripeToPlan(product: Stripe.Product, prices: Stripe.Price[]): Promise<PlanMapping | null> {
  // Extract plan ID from product metadata or name
  let planId = product.metadata.plan_id;
  
  if (!planId) {
    // Try to infer from product name
    const name = product.name.toLowerCase();
    if (name.includes('basic') || name.includes('growth')) {
      planId = 'growth';
    } else if (name.includes('pro') || name.includes('professional')) {
      planId = 'professional';
    } else if (name.includes('business') || name.includes('enterprise')) {
      planId = 'enterprise';
    } else if (name.includes('free')) {
      planId = 'free';
    }
  }

  if (!planId) {
    console.warn(`⚠️  Could not determine plan ID for product: ${product.name} (${product.id})`);
    return null;
  }

  // Find monthly and yearly prices
  let monthlyPrice: Stripe.Price | undefined;
  let yearlyPrice: Stripe.Price | undefined;

  for (const price of prices) {
    if (price.recurring?.interval === 'month') {
      monthlyPrice = price;
    } else if (price.recurring?.interval === 'year') {
      yearlyPrice = price;
    }
  }

  // Extract limits from metadata or use defaults
  const replyLimit = parseInt(product.metadata.reply_limit || '0');
  const memeLimit = parseInt(product.metadata.meme_limit || '0');
  const suggestionLimit = parseInt(product.metadata.suggestion_limit || '0');

  // Extract features from metadata or description
  const features = product.metadata.features 
    ? product.metadata.features.split(',').map(f => f.trim())
    : [];

  return {
    planId,
    stripePriceIdMonthly: monthlyPrice?.id,
    stripePriceIdYearly: yearlyPrice?.id,
    name: product.name,
    description: product.description || undefined,
    replyLimit,
    memeLimit,
    suggestionLimit,
    features,
  };
}

async function syncPlansToDatabase(plans: PlanMapping[], dryRun: boolean = false) {
  console.log(`\n📊 Syncing ${plans.length} plans to database...`);

  for (const plan of plans) {
    console.log(`\n🔄 Processing plan: ${plan.name} (${plan.planId})`);
    
    // Fetch existing plan from database
    const { data: existingPlan, error: fetchError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan.planId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error(`❌ Error fetching plan ${plan.planId}:`, fetchError);
      continue;
    }

    if (!existingPlan) {
      console.log(`❌ Plan ${plan.planId} not found in database. Please create it first.`);
      continue;
    }

    // Compare and update if needed
    const updates: any = {};
    let hasChanges = false;

    // Check monthly price
    if (plan.stripePriceIdMonthly && existingPlan.stripe_price_id_monthly !== plan.stripePriceIdMonthly) {
      updates.stripe_price_id_monthly = plan.stripePriceIdMonthly;
      hasChanges = true;
      console.log(`  📝 Monthly price: ${existingPlan.stripe_price_id_monthly} → ${plan.stripePriceIdMonthly}`);
    }

    // Check yearly price
    if (plan.stripePriceIdYearly && existingPlan.stripe_price_id_yearly !== plan.stripePriceIdYearly) {
      updates.stripe_price_id_yearly = plan.stripePriceIdYearly;
      hasChanges = true;
      console.log(`  📝 Yearly price: ${existingPlan.stripe_price_id_yearly} → ${plan.stripePriceIdYearly}`);
    }

    // Check limits if they're set in Stripe
    if (plan.replyLimit > 0 && existingPlan.reply_limit !== plan.replyLimit) {
      updates.reply_limit = plan.replyLimit;
      hasChanges = true;
      console.log(`  📝 Reply limit: ${existingPlan.reply_limit} → ${plan.replyLimit}`);
    }

    if (plan.memeLimit > 0 && existingPlan.meme_limit !== plan.memeLimit) {
      updates.meme_limit = plan.memeLimit;
      hasChanges = true;
      console.log(`  📝 Meme limit: ${existingPlan.meme_limit} → ${plan.memeLimit}`);
    }

    if (plan.suggestionLimit > 0 && existingPlan.suggestion_limit !== plan.suggestionLimit) {
      updates.suggestion_limit = plan.suggestionLimit;
      hasChanges = true;
      console.log(`  📝 Suggestion limit: ${existingPlan.suggestion_limit} → ${plan.suggestionLimit}`);
    }

    // Update database if changes detected
    if (hasChanges) {
      if (dryRun) {
        console.log(`  🔸 [DRY RUN] Would update plan ${plan.planId} with:`, updates);
      } else {
        const { error: updateError } = await supabase
          .from('subscription_plans')
          .update(updates)
          .eq('id', plan.planId);

        if (updateError) {
          console.error(`  ❌ Failed to update plan ${plan.planId}:`, updateError);
        } else {
          console.log(`  ✅ Successfully updated plan ${plan.planId}`);
        }
      }
    } else {
      console.log(`  ✅ Plan ${plan.planId} is up to date`);
    }
  }
}

async function main() {
  console.log('🚀 Stripe to Database Plan Sync Tool\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  if (dryRun) {
    console.log('🔸 Running in DRY RUN mode - no changes will be made\n');
  }

  // Validate environment
  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  try {
    // Fetch products and prices from Stripe
    const { products, productPrices } = await fetchStripeProducts();
    
    console.log(`📦 Found ${products.length} products in Stripe`);

    // Map Stripe products to plan structure
    const plans: PlanMapping[] = [];
    
    for (const product of products) {
      const prices = productPrices.get(product.id) || [];
      if (prices.length === 0) {
        console.warn(`⚠️  No prices found for product: ${product.name}`);
        continue;
      }

      const plan = await mapStripeToPlan(product, prices);
      if (plan) {
        plans.push(plan);
      }
    }

    // Sync to database
    await syncPlansToDatabase(plans, dryRun);

    // Summary
    console.log('\n✨ Sync complete!');
    
    // Check for orphaned plans in database
    const { data: dbPlans } = await supabase
      .from('subscription_plans')
      .select('id, name')
      .neq('id', 'free'); // Free plan won't be in Stripe

    const syncedPlanIds = new Set(plans.map(p => p.planId));
    const orphanedPlans = dbPlans?.filter(p => !syncedPlanIds.has(p.id)) || [];

    if (orphanedPlans.length > 0) {
      console.log('\n⚠️  Found plans in database not synced from Stripe:');
      for (const plan of orphanedPlans) {
        console.log(`   - ${plan.name} (${plan.id})`);
      }
      console.log('\n   These might need manual review or removal.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);