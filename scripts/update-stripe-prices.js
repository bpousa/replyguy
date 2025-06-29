#!/usr/bin/env node

// Script to update Stripe price IDs via Supabase REST API
const SUPABASE_URL = 'https://aaplsgskmoeyvvedjzxp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcGxzZ3NrbW9leXZ2ZWRqenhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwMjA2NCwiZXhwIjoyMDY2MTc4MDY0fQ.Hrcjmx_HWBey-tW5N0_tL1heRoFirKKsOkU1U8i9iXE';

async function updateStripePrices() {
  console.log('Updating Stripe price IDs...\n');

  const updates = [
    {
      id: 'growth',
      stripe_price_id_monthly: 'price_1RdeVL08qNQAUd0lXDjPoiLc',
      stripe_price_id_yearly: 'price_1RdeWf08qNQAUd0legzU7ors'
    },
    {
      id: 'professional',
      stripe_price_id_monthly: 'price_1RdeXj08qNQAUd0lEFRP81ys',
      stripe_price_id_yearly: 'price_1RdeYb08qNQAUd0lYnOVQsa3'
    },
    {
      id: 'enterprise',
      stripe_price_id_monthly: 'price_1RdeZg08qNQAUd0l5lxm7yE7',
      stripe_price_id_yearly: 'price_1Rdea108qNQAUd0lyuFEiqb6'
    }
  ];

  for (const update of updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/subscription_plans?id=eq.${update.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            stripe_price_id_monthly: update.stripe_price_id_monthly,
            stripe_price_id_yearly: update.stripe_price_id_yearly
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const result = await response.json();
      console.log(`✅ Updated ${update.id} plan:`, result[0].name);
    } catch (error) {
      console.error(`❌ Failed to update ${update.id}:`, error.message);
    }
  }

  // Verify the updates
  console.log('\nVerifying updates...');
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/subscription_plans?id=in.(growth,professional,enterprise)&select=id,name,stripe_price_id_monthly,stripe_price_id_yearly`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    const plans = await response.json();
    console.log('\nCurrent Stripe price IDs:');
    plans.forEach(plan => {
      console.log(`\n${plan.name} (${plan.id}):`);
      console.log(`  Monthly: ${plan.stripe_price_id_monthly}`);
      console.log(`  Yearly: ${plan.stripe_price_id_yearly}`);
    });
  } catch (error) {
    console.error('Failed to verify:', error.message);
  }
}

updateStripePrices().catch(console.error);