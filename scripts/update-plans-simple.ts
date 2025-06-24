import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePlans() {
  console.log('Updating subscription plans to X theme...\n');
  
  // Update each plan with the fields that exist
  const updates = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for trying out ReplyGuy',
      monthly_price: 0,
      yearly_price: 0,
      monthly_limit: 10,  // 10 replies
      suggestion_limit: 0,  // No AI suggestions
      max_reply_length: 280,
      enable_style_matching: false,
      enable_perplexity_guidance: false,
      features: [
        '10 replies per month',
        'Basic reply types',
        'Standard support',
        'Daily goal tracking'
      ]
    },
    {
      id: 'growth',
      name: 'X Basic',
      description: 'For active X users',
      monthly_price: 19,
      yearly_price: 190,
      monthly_limit: 300,  // 300 replies
      suggestion_limit: 50,  // 50 AI suggestions
      max_reply_length: 280,
      enable_style_matching: false,
      enable_perplexity_guidance: false,
      features: [
        '300 replies per month',
        '10 memes per month',
        '50 AI suggestions',
        'All reply types',
        'Email support'
      ]
    },
    {
      id: 'professional',
      name: 'X Pro',
      description: 'For power users and content creators',
      monthly_price: 49,
      yearly_price: 490,
      monthly_limit: 500,  // 500 replies
      suggestion_limit: 100,  // 100 AI suggestions
      max_reply_length: 560,  // Medium-length replies
      enable_style_matching: true,
      enable_perplexity_guidance: false,
      features: [
        '500 replies per month',
        '50 memes per month',
        '100 AI suggestions',
        'Write Like Me™ AI training',
        'Style matching',
        'Medium-length replies',
        'Priority support'
      ],
      is_popular: true
    },
    {
      id: 'enterprise',
      name: 'X Business',
      description: 'For agencies and high-volume users',
      monthly_price: 99,
      yearly_price: 990,
      monthly_limit: 1000,  // 1000 replies
      suggestion_limit: 200,  // 200 AI suggestions
      max_reply_length: 1000,  // Long-form replies
      enable_style_matching: true,
      enable_perplexity_guidance: true,  // Real-time fact checking
      features: [
        '1000 replies per month',
        '100 memes per month',
        '200 AI suggestions',
        'Write Like Me™ AI training',
        'Real-time fact checking',
        'Long-form replies (1000 chars)',
        'API access',
        'Dedicated support'
      ],
      is_popular: false
    }
  ];
  
  for (const update of updates) {
    console.log(`Updating ${update.id} → ${update.name}...`);
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .update({
        name: update.name,
        description: update.description,
        monthly_price: update.monthly_price,
        yearly_price: update.yearly_price,
        monthly_limit: update.monthly_limit,
        suggestion_limit: update.suggestion_limit,
        max_reply_length: update.max_reply_length,
        enable_style_matching: update.enable_style_matching,
        enable_perplexity_guidance: update.enable_perplexity_guidance,
        features: update.features,
        is_popular: update.is_popular || false
      })
      .eq('id', update.id)
      .select()
      .single();
      
    if (error) {
      console.error(`✗ Failed:`, error.message);
    } else {
      console.log(`✓ Updated successfully`);
      console.log(`  - ${data.monthly_limit} replies/month`);
      console.log(`  - $${data.monthly_price}/month`);
    }
  }
  
  // Verify the final state
  console.log('\n\nFinal plan configuration:');
  console.log('========================\n');
  
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order');
    
  if (plans) {
    plans.forEach(plan => {
      console.log(`${plan.name}:`);
      console.log(`  ID: ${plan.id}`);
      console.log(`  Price: $${plan.monthly_price}/mo, $${plan.yearly_price}/yr`);
      console.log(`  Limits: ${plan.monthly_limit} replies, ${plan.suggestion_limit} suggestions`);
      console.log(`  Reply length: ${plan.max_reply_length} chars`);
      console.log(`  Features: ${plan.features?.slice(0, 3).join(', ')}...`);
      console.log('');
    });
  }
  
  console.log('Meme limits by plan:');
  console.log('- Free: 0 memes');
  console.log('- X Basic: 10 memes');
  console.log('- X Pro: 50 memes');
  console.log('- X Business: 100 memes');
  console.log('\nWrite Like Me™ available on: X Pro, X Business');
  
  console.log('\n✅ Plan update complete!');
}

updatePlans().catch(console.error);