import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateStripePriceIds() {
  console.log('Updating Stripe price IDs in database...\n');
  
  const updates = [
    {
      plan_id: 'growth', // X Basic
      name: 'X Basic',
      stripe_price_id_monthly: 'price_1RdeVL08qNQAUd0lXDjPoiLc',
      stripe_price_id_yearly: 'price_1RdeWf08qNQAUd0legzU7ors'
    },
    {
      plan_id: 'professional', // X Pro
      name: 'X Pro',
      stripe_price_id_monthly: 'price_1RdeXj08qNQAUd0lEFRP81ys',
      stripe_price_id_yearly: 'price_1RdeYb08qNQAUd0lYnOVQsa3'
    },
    {
      plan_id: 'enterprise', // X Business
      name: 'X Business',
      stripe_price_id_monthly: 'price_1RdeZg08qNQAUd0l5lxm7yE7',
      stripe_price_id_yearly: 'price_1Rdea108qNQAUd0lyuFEiqb6'
    }
  ];
  
  for (const update of updates) {
    console.log(`Updating ${update.name} (${update.plan_id})...`);
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .update({
        stripe_price_id_monthly: update.stripe_price_id_monthly,
        stripe_price_id_yearly: update.stripe_price_id_yearly
      })
      .eq('id', update.plan_id)
      .select()
      .single();
      
    if (error) {
      console.error(`✗ Failed to update ${update.name}:`, error.message);
    } else {
      console.log(`✓ Updated successfully`);
      console.log(`  Monthly: ${update.stripe_price_id_monthly}`);
      console.log(`  Yearly: ${update.stripe_price_id_yearly}`);
    }
  }
  
  console.log('\n✅ All Stripe price IDs updated!');
  
  // Verify the updates
  console.log('\nVerifying current prices:');
  console.log('======================\n');
  
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, monthly_price, yearly_price, stripe_price_id_monthly, stripe_price_id_yearly')
    .neq('id', 'free')
    .order('sort_order');
    
  if (plans) {
    plans.forEach(plan => {
      console.log(`${plan.name}:`);
      console.log(`  Monthly: $${plan.monthly_price} - ${plan.stripe_price_id_monthly}`);
      console.log(`  Yearly: $${plan.yearly_price} - ${plan.stripe_price_id_yearly}`);
      console.log('');
    });
  }
}

updateStripePriceIds().catch(console.error);