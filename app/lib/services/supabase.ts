import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Types for our database tables
export interface ReplyTypeRow {
  id: string;
  name: string;
  category: string;
  pattern: string;
  style_rules: string;
  examples: string[];
  tags: string[];
  complexity: number;
  created_at: string;
  updated_at: string;
}

export interface ReplyTypeMappingRow {
  id: number;
  response_type: 'agree' | 'disagree' | 'neutral' | 'other';
  tone: string;
  reply_type_id: string;
  priority: number;
  usage_count: number;
  success_rate: number;
  created_at: string;
}

export interface UsageAnalyticsRow {
  id: number;
  reply_type_id: string;
  original_tweet: string;
  generated_reply: string;
  response_type: string;
  tone: string;
  cost: number;
  processing_time: number;
  user_rating: number | null;
  has_perplexity_data: boolean;
  created_at: string;
}

export interface DailyCostTrackingRow {
  date: string;
  total_requests: number;
  total_cost: number;
  classification_cost: number;
  reasoning_cost: number;
  generation_cost: number;
  perplexity_cost: number;
  created_at: string;
  updated_at: string;
}

// Helper functions for database operations
export async function getReplyTypesForContext(
  responseType: string,
  tone: string,
  limit: number = 10
) {
  const { data, error } = await supabase
    .from('reply_type_mappings')
    .select(`
      priority,
      usage_count,
      success_rate,
      reply_types!inner(
        id,
        name,
        category,
        pattern,
        style_rules,
        examples,
        tags,
        complexity
      )
    `)
    .eq('response_type', responseType)
    .eq('tone', tone)
    .order('priority', { ascending: false })
    .order('success_rate', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching reply types:', error);
    return [];
  }

  return data?.map(item => item.reply_types) || [];
}

export async function trackUsage(
  replyTypeId: string,
  originalTweet: string,
  generatedReply: string,
  responseType: string,
  tone: string,
  cost: number,
  processingTime: number,
  hasPerplexityData: boolean
) {
  const { error } = await supabase
    .from('usage_analytics')
    .insert({
      reply_type_id: replyTypeId,
      original_tweet: originalTweet,
      generated_reply: generatedReply,
      response_type: responseType,
      tone,
      cost,
      processing_time: processingTime,
      has_perplexity_data: hasPerplexityData,
    });

  if (error) {
    console.error('Error tracking usage:', error);
  }

  // Update the success rate
  await supabase.rpc('track_usage', {
    p_reply_type_id: replyTypeId,
    p_success: true,
  });
}

export async function updateDailyCosts(
  classificationCost: number,
  reasoningCost: number,
  generationCost: number,
  perplexityCost: number = 0
) {
  const { error } = await supabase.rpc('update_daily_costs', {
    p_classification_cost: classificationCost,
    p_reasoning_cost: reasoningCost,
    p_generation_cost: generationCost,
    p_perplexity_cost: perplexityCost,
  });

  if (error) {
    console.error('Error updating daily costs:', error);
  }
}

export async function getDailyStats() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_cost_tracking')
    .select('*')
    .eq('date', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error fetching daily stats:', error);
  }

  return data || {
    total_requests: 0,
    total_cost: 0,
    classification_cost: 0,
    reasoning_cost: 0,
    generation_cost: 0,
    perplexity_cost: 0,
  };
}