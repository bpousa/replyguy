// Quick debug script to test the exact sync-user token query
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function debugTokenQuery() {
  const userId = '0b85a775-b9eb-41d9-ae5f-d5c1b0bd5dbc';
  
  console.log('Testing token query for user:', userId);
  
  try {
    const { data: existingToken, error: tokenError } = await supabase
      .from('trial_offer_tokens')
      .select('token, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    console.log('Query result:', { 
      hasToken: !!existingToken, 
      error: tokenError,
      data: existingToken 
    });
    
    // Also check if ANY tokens exist for this user
    const { data: allTokens, error: allError } = await supabase
      .from('trial_offer_tokens')
      .select('*')
      .eq('user_id', userId);
      
    console.log('All tokens for user:', { 
      count: allTokens?.length || 0,
      tokens: allTokens,
      error: allError 
    });
    
  } catch (error) {
    console.error('Query failed:', error);
  }
}

debugTokenQuery();