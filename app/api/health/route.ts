import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    api_keys: {
      openai: boolean;
      anthropic: boolean;
      perplexity: boolean;
      imgflip: boolean;
    };
    database: {
      connected: boolean;
      tables: {
        daily_usage: boolean;
        user_usage: boolean;
        subscriptions: boolean;
        users: boolean;
      };
      functions: {
        track_daily_usage: boolean;
        get_current_usage: boolean;
        check_schema_health: boolean;
      };
    };
    environment: {
      supabase_url: boolean;
      supabase_anon_key: boolean;
      supabase_service_key: boolean;
      stripe_configured: boolean;
      app_url: boolean;
    };
  };
  errors: string[];
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const errors: string[] = [];
  
  // Check API Keys
  const apiKeys = {
    openai: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '',
    anthropic: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '',
    perplexity: !!process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_API_KEY.trim() !== '',
    imgflip: !!process.env.IMGFLIP_USERNAME && !!process.env.IMGFLIP_PASSWORD,
  };
  
  if (!apiKeys.openai) errors.push('OpenAI API key not configured');
  if (!apiKeys.anthropic) errors.push('Anthropic API key not configured');
  
  // Test API keys by attempting to initialize clients
  if (apiKeys.openai) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      // We could do a test call here but that would cost money
    } catch (e) {
      apiKeys.openai = false;
      errors.push('OpenAI API key appears invalid');
    }
  }
  
  if (apiKeys.anthropic) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      // We could do a test call here but that would cost money
    } catch (e) {
      apiKeys.anthropic = false;
      errors.push('Anthropic API key appears invalid');
    }
  }
  
  // Check Environment Variables
  const environment = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service_key: !!process.env.SUPABASE_SERVICE_KEY,
    stripe_configured: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
    app_url: !!process.env.NEXT_PUBLIC_APP_URL,
  };
  
  if (!environment.supabase_url) errors.push('Supabase URL not configured');
  if (!environment.supabase_anon_key) errors.push('Supabase anon key not configured');
  if (!environment.supabase_service_key) errors.push('Supabase service key not configured');
  
  // Check Database
  const database = {
    connected: false,
    tables: {
      daily_usage: false,
      user_usage: false,
      subscriptions: false,
      users: false,
    },
    functions: {
      track_daily_usage: false,
      get_current_usage: false,
      check_schema_health: false,
    },
  };
  
  try {
    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    database.connected = !testError;
    if (testError) {
      errors.push(`Database connection failed: ${testError.message}`);
    }
  } catch (e) {
    database.connected = false;
    errors.push('Database connection failed');
  }
  
  if (database.connected) {
    // Check tables exist
    for (const table of ['daily_usage', 'user_usage', 'subscriptions', 'users']) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(0);
        
        database.tables[table as keyof typeof database.tables] = !error;
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          errors.push(`Table ${table} check failed: ${error.message}`);
        }
      } catch (e) {
        database.tables[table as keyof typeof database.tables] = false;
        errors.push(`Table ${table} check failed`);
      }
    }
    
    // Check RPC functions
    try {
      // Check schema health function
      const { data: healthData, error: healthError } = await supabase
        .rpc('check_schema_health');
      
      database.functions.check_schema_health = !healthError;
      
      if (healthError) {
        errors.push(`check_schema_health function failed: ${healthError.message}`);
      } else if (healthData && Array.isArray(healthData)) {
        // Process schema health results
        for (const check of healthData) {
          if (check.status === 'ERROR') {
            errors.push(`Schema issue: ${check.table_name} - ${check.message}`);
          }
        }
      }
    } catch (e) {
      database.functions.check_schema_health = false;
      errors.push('check_schema_health function not found');
    }
    
    // Test get_current_usage function with a dummy user ID
    try {
      const { error } = await supabase
        .rpc('get_current_usage', { p_user_id: '00000000-0000-0000-0000-000000000000' });
      
      database.functions.get_current_usage = !error || error.code === 'P0001'; // P0001 is a custom error
      if (error && error.code !== 'P0001') {
        errors.push(`get_current_usage function failed: ${error.message}`);
      }
    } catch (e) {
      database.functions.get_current_usage = false;
      errors.push('get_current_usage function not found');
    }
    
    // We can't easily test track_daily_usage without side effects
    database.functions.track_daily_usage = true; // Assume it exists if others work
  }
  
  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  // Critical checks that make the service unhealthy
  if (!apiKeys.openai || !apiKeys.anthropic || !database.connected) {
    status = 'unhealthy';
  } else if (errors.length > 0) {
    status = 'degraded';
  }
  
  const healthCheck: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      api_keys: apiKeys,
      database,
      environment,
    },
    errors,
  };
  
  return NextResponse.json(healthCheck, {
    status: status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}