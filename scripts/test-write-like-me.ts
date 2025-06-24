import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

async function testWriteLikeMe() {
  console.log('Testing Write Like Me feature...\n');
  
  // Get the enterprise test user
  const testEmail = 'test-business@replyguy.com';
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .single();
    
  if (userError || !user) {
    console.error('Error finding test user:', userError);
    return;
  }
  
  console.log(`Found user: ${user.email} (${user.subscription_tier})`);
  console.log(`User ID: ${user.id}\n`);
  
  // Check if user already has styles
  const { data: existingStyles, error: stylesError } = await supabase
    .from('user_styles')
    .select('*')
    .eq('user_id', user.id);
    
  if (stylesError) {
    console.error('Error checking existing styles:', stylesError);
  } else {
    console.log(`User has ${existingStyles?.length || 0} existing styles\n`);
  }
  
  // Create a test style
  const testStyle = {
    user_id: user.id,
    name: 'Tech Enthusiast Style',
    is_active: true,
    sample_tweets: [
      "Just discovered this amazing AI tool that's completely changed my workflow! 🚀 The future is here, folks.",
      "Hot take: The best code is the code you don't have to write. Simplicity wins every time.",
      "Working on a side project this weekend... Who else can't stop building things? 😅 #DevLife",
      "TIL about WebAssembly and my mind is blown 🤯 The web platform keeps getting more powerful!",
      "Friendly reminder to take breaks and stretch. Your future self will thank you! 💪"
    ],
    tone: 'enthusiastic',
    formality: 'casual',
    vocabulary: 'moderate',
    sentence_length: 'short',
    has_emojis: true,
    has_hashtags: true,
    uses_punctuation: {
      exclamations: true,
      questions: true,
      ellipsis: true,
      allCaps: false
    },
    characteristics: ['tech-focused', 'positive', 'community-oriented', 'emoji-heavy', 'conversational'],
    style_instructions: `Write in an enthusiastic, tech-savvy voice. Use emojis naturally (especially 🚀, 😅, 🤯, 💪). 
Keep sentences short and punchy. Ask questions to engage. Use exclamation points for excitement.
Include relevant hashtags occasionally. Be positive and supportive of the tech community.`,
    analyzed_at: new Date().toISOString()
  };
  
  console.log('Creating test style...');
  
  const { data: newStyle, error: createError } = await supabase
    .from('user_styles')
    .insert(testStyle)
    .select()
    .single();
    
  if (createError) {
    console.error('Error creating style:', createError);
    return;
  }
  
  console.log('✅ Successfully created style:', newStyle);
  console.log('\nStyle details:');
  console.log(`- ID: ${newStyle.id}`);
  console.log(`- Name: ${newStyle.name}`);
  console.log(`- Active: ${newStyle.is_active}`);
  console.log(`- Sample tweets: ${newStyle.sample_tweets.length}`);
  console.log(`- Tone: ${newStyle.tone}`);
  console.log(`- Has emojis: ${newStyle.has_emojis}`);
}

testWriteLikeMe().catch(console.error);