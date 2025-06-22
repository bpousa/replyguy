import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import replyTypesData from '../data/reply-types.json';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

// Mapping of categories to tones and response types
const categoryMappings: Record<string, Array<{ responseType: string; tone: string; priority: number }>> = {
  'Humor & Wit': [
    { responseType: 'agree', tone: 'humorous', priority: 90 },
    { responseType: 'agree', tone: 'witty', priority: 85 },
    { responseType: 'neutral', tone: 'casual', priority: 70 },
    { responseType: 'other', tone: 'sarcastic', priority: 80 },
  ],
  'Agreement & Relatability': [
    { responseType: 'agree', tone: 'casual', priority: 95 },
    { responseType: 'agree', tone: 'supportive', priority: 90 },
    { responseType: 'agree', tone: 'empathetic', priority: 85 },
    { responseType: 'agree', tone: 'friendly', priority: 80 },
  ],
  'Praise & Support': [
    { responseType: 'agree', tone: 'supportive', priority: 95 },
    { responseType: 'agree', tone: 'professional', priority: 75 },
    { responseType: 'neutral', tone: 'friendly', priority: 70 },
  ],
  'Value & Information': [
    { responseType: 'neutral', tone: 'informative', priority: 90 },
    { responseType: 'neutral', tone: 'professional', priority: 85 },
    { responseType: 'agree', tone: 'helpful', priority: 80 },
  ],
  'Conversation Starter': [
    { responseType: 'neutral', tone: 'casual', priority: 85 },
    { responseType: 'neutral', tone: 'friendly', priority: 90 },
    { responseType: 'other', tone: 'curious', priority: 75 },
  ],
  'Opinion & Challenge': [
    { responseType: 'disagree', tone: 'professional', priority: 90 },
    { responseType: 'disagree', tone: 'casual', priority: 75 },
    { responseType: 'neutral', tone: 'informative', priority: 70 },
  ],
};

async function seedReplyTypes() {
  console.log('Seeding reply types...');
  
  try {
    // Clear existing data (optional)
    console.log('Clearing existing data...');
    await supabase.from('reply_type_mappings').delete().neq('id', 0);
    await supabase.from('reply_types').delete().neq('id', '');
    
    // Insert reply types
    for (const type of replyTypesData) {
      const id = type.reply_name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      
      console.log(`Inserting reply type: ${type.reply_name}`);
      
      const { error: insertError } = await supabase
        .from('reply_types')
        .insert({
          id,
          name: type.reply_name,
          category: type.category,
          pattern: type.description,
          style_rules: `Match the style and tone of: "${type.example_reply}"`,
          examples: [type.example_reply],
          tags: extractTags(type),
          complexity: calculateComplexity(type),
        });
      
      if (insertError) {
        console.error(`Error inserting ${type.reply_name}:`, insertError);
        continue;
      }
      
      // Create mappings
      const mappings = categoryMappings[type.category] || [];
      for (const mapping of mappings) {
        const { error: mappingError } = await supabase
          .from('reply_type_mappings')
          .insert({
            response_type: mapping.responseType,
            tone: mapping.tone,
            reply_type_id: id,
            priority: mapping.priority,
          });
        
        if (mappingError) {
          console.error(`Error creating mapping for ${id}:`, mappingError);
        }
      }
    }
    
    // Verify the seed
    const { data: replyTypes, error: countError } = await supabase
      .from('reply_types')
      .select('id', { count: 'exact' });
    
    if (!countError) {
      console.log(`\n✨ Successfully seeded ${replyTypes?.length || 0} reply types!`);
    }
    
    const { data: mappings, error: mappingCountError } = await supabase
      .from('reply_type_mappings')
      .select('id', { count: 'exact' });
    
    if (!mappingCountError) {
      console.log(`✨ Created ${mappings?.length || 0} reply type mappings!`);
    }
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

function extractTags(type: any): string[] {
  const tags: string[] = [];
  
  // Add category as tag
  tags.push(type.category.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  
  // Extract tags from description
  const description = type.description.toLowerCase();
  
  if (description.includes('question')) tags.push('question');
  if (description.includes('humor') || description.includes('funny')) tags.push('humor');
  if (description.includes('support') || description.includes('encourage')) tags.push('supportive');
  if (description.includes('sarcas')) tags.push('sarcastic');
  if (description.includes('help')) tags.push('helpful');
  if (description.includes('conversation') || description.includes('discuss')) tags.push('conversational');
  if (description.includes('fact') || description.includes('information')) tags.push('informative');
  
  return [...new Set(tags)]; // Remove duplicates
}

function calculateComplexity(type: any): number {
  // Simple complexity calculation based on description length and category
  const description = type.description;
  
  if (type.category === 'Opinion & Challenge') return 3;
  if (type.category === 'Value & Information') return 2;
  if (description.length > 150) return 2;
  
  return 1;
}

// Run the seed
seedReplyTypes()
  .then(() => {
    console.log('\nSeeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nSeeding failed:', error);
    process.exit(1);
  });