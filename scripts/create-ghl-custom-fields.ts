import fetch from 'node-fetch';

// GHL API configuration
const GHL_API_KEY = process.env.GHL_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6Ik5HdzNwalhxejFERkJhdENubHcwIiwidmVyc2lvbiI6MSwiaWF0IjoxNzUyMzQzMzM4NDc4LCJzdWIiOiJ6N3VWNTYzaFlvV2taUUVIZjVYQSJ9.JFiExNqdR0Eg10Jr93SEzZH2PyAcCd_Zeg6hwNx7dW0';
const LOCATION_ID = process.env.GHL_LOCATION_ID || 'jy3RGNtorEtco9zyM7dp';

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

// Define the custom fields we need to create
const customFields = [
  {
    name: 'ReplyGuy User ID',
    fieldKey: 'replyguy_user_id',
    dataType: 'TEXT',
    description: 'Unique identifier from ReplyGuy system'
  },
  {
    name: 'Member Level',
    fieldKey: 'member_level',
    dataType: 'TEXT',
    description: 'Subscription tier: free, x_basic, x_pro, x_business'
  },
  {
    name: 'Product Purchased',
    fieldKey: 'product_purchased',
    dataType: 'TEXT',
    description: 'Name of the product/plan purchased'
  },
  {
    name: 'Subscription Status',
    fieldKey: 'subscription_status',
    dataType: 'TEXT',
    description: 'Current subscription status'
  },
  {
    name: 'Daily Goal',
    fieldKey: 'daily_goal',
    dataType: 'NUMERICAL',
    description: 'Daily reply goal set by user'
  },
  {
    name: 'Total Replies',
    fieldKey: 'total_replies',
    dataType: 'NUMERICAL',
    description: 'Total number of replies generated'
  },
  {
    name: 'Signup Date',
    fieldKey: 'signup_date',
    dataType: 'DATE',
    description: 'Date when user signed up'
  },
  {
    name: 'Last Active',
    fieldKey: 'last_active',
    dataType: 'DATE',
    description: 'Date of last activity'
  },
  {
    name: 'Trial Ends',
    fieldKey: 'trial_ends',
    dataType: 'DATE',
    description: 'Trial end date (if applicable)'
  },
  {
    name: 'Billing Day',
    fieldKey: 'billing_day',
    dataType: 'NUMERICAL',
    description: 'Day of month for billing (1-31)'
  },
  {
    name: 'Payment Status',
    fieldKey: 'payment_status',
    dataType: 'TEXT',
    description: 'current, failed, canceled, trial'
  },
  {
    name: 'Payment Failed Date',
    fieldKey: 'payment_failed_date',
    dataType: 'DATE',
    description: 'Date when payment last failed'
  },
  {
    name: 'Payment Retry Count',
    fieldKey: 'payment_retry_count',
    dataType: 'NUMERICAL',
    description: 'Number of payment retry attempts'
  },
  {
    name: 'Referred By',
    fieldKey: 'referred_by',
    dataType: 'TEXT',
    description: 'Email of referrer'
  },
  {
    name: 'Referral Code',
    fieldKey: 'referral_code',
    dataType: 'TEXT',
    description: 'User referral code'
  },
  {
    name: 'Monthly Reply Limit',
    fieldKey: 'monthly_reply_limit',
    dataType: 'NUMERICAL',
    description: 'Monthly reply limit for plan'
  },
  {
    name: 'Monthly Meme Limit',
    fieldKey: 'monthly_meme_limit',
    dataType: 'NUMERICAL',
    description: 'Monthly meme generation limit'
  },
  {
    name: 'Features Enabled',
    fieldKey: 'features_enabled',
    dataType: 'TEXT',
    description: 'Comma-separated list of enabled features'
  }
];

async function createCustomField(field: any) {
  try {
    const response = await fetch(`${GHL_API_BASE}/custom-fields/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: field.name,
        dataType: field.dataType,
        position: 0,
        model: 'contact'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create field ${field.name}:`, response.status, error);
      return { field: field.name, success: false, error };
    }

    const result = await response.json();
    console.log(`✅ Created field: ${field.name}`);
    return { field: field.name, success: true, id: result.id };
  } catch (error) {
    console.error(`Error creating field ${field.name}:`, error);
    return { field: field.name, success: false, error: error.message };
  }
}

async function main() {
  console.log('Creating GHL custom fields for ReplyGuy integration...\n');
  
  const results = [];
  
  for (const field of customFields) {
    const result = await createCustomField(field);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total fields: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\nFailed fields:');
    failed.forEach(f => console.log(`- ${f.field}: ${f.error}`));
  }
  
  console.log('\n=== Member Level Values ===');
  console.log('The member_level field will contain one of these values:');
  console.log('- "free" - Free tier users');
  console.log('- "x_basic" - Growth/Basic plan ($19/mo)');
  console.log('- "x_pro" - Professional plan ($49/mo)');
  console.log('- "x_business" - Enterprise/Business plan ($99/mo)');
  
  console.log('\n=== Payment Status Values ===');
  console.log('The payment_status field will contain one of these values:');
  console.log('- "current" - Payment is up to date');
  console.log('- "failed" - Payment has failed');
  console.log('- "canceled" - Subscription was canceled');
  console.log('- "trial" - User is in trial period');
  
  console.log('\n=== Product Purchased Values ===');
  console.log('The product_purchased field will contain the plan name:');
  console.log('- "Free" - Free tier');
  console.log('- "Growth" - Basic plan');
  console.log('- "Professional" - Pro plan');
  console.log('- "Enterprise" - Business plan');
}

// Run the script
main().catch(console.error);