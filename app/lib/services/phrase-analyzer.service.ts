import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Automated Phrase Analysis Service
 * Analyzes reported phrases to identify patterns and improve AI detection
 */
export class PhraseAnalyzer {
  private anthropic: Anthropic;
  private supabase: any;

  constructor(anthropicApiKey: string, supabaseClient: any) {
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    this.supabase = supabaseClient;
  }

  /**
   * Analyze reported phrases and identify patterns
   */
  async analyzeReportedPhrases(minReports: number = 5): Promise<void> {
    try {
      // Get frequently reported phrases
      const { data: reportedPhrases, error } = await this.supabase
        .rpc('analyze_reported_phrases', { min_reports: minReports });
      
      if (error) {
        console.error('Failed to fetch reported phrases:', error);
        return;
      }
      
      if (!reportedPhrases || reportedPhrases.length === 0) {
        console.log('No phrases meet the minimum report threshold');
        return;
      }
      
      // Batch analyze phrases with Claude
      for (const phrase of reportedPhrases) {
        await this.analyzePhrase(phrase);
      }
    } catch (error) {
      console.error('Phrase analysis error:', error);
    }
  }

  /**
   * Analyze a single phrase to determine if it's genuinely AI-sounding
   */
  private async analyzePhrase(phraseData: {
    phrase: string;
    total_reports: number;
    unique_users: number;
    sample_contexts: string[];
  }): Promise<void> {
    try {
      const prompt = `Analyze if this phrase sounds artificial or AI-generated:

Phrase: "${phraseData.phrase}"
Reports: ${phraseData.total_reports} times by ${phraseData.unique_users} users

Sample contexts where it appeared:
${phraseData.sample_contexts.map((ctx, i) => `${i + 1}. "${ctx}"`).join('\n')}

Determine:
1. Does this phrase genuinely sound artificial/AI-generated? (YES/NO)
2. Why does it sound artificial? (brief explanation)
3. What category does it fall into? (transition/opening/cliche/word/pattern)
4. Suggest a more natural replacement (or "remove" if it should be deleted)

Respond in JSON format:
{
  "is_ai_sounding": boolean,
  "reason": "string",
  "category": "string",
  "replacement": "string or null"
}`;

      const message = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      });

      const response = message.content[0].type === 'text' ? message.content[0].text : '';
      
      try {
        const analysis = JSON.parse(response);
        
        // Update the reported phrase with validation results
        await this.supabase
          .from('reported_ai_phrases')
          .update({
            validated: analysis.is_ai_sounding,
            validation_reason: analysis.reason,
            validated_at: new Date().toISOString(),
          })
          .eq('reported_phrase', phraseData.phrase)
          .is('validated', null);
        
        // If validated as AI-sounding, add to patterns table
        if (analysis.is_ai_sounding) {
          await this.addToPatterns(
            phraseData.phrase,
            analysis.category,
            analysis.replacement,
            phraseData.total_reports
          );
        }
        
        console.log(`Analyzed phrase "${phraseData.phrase}":`, analysis);
      } catch (parseError) {
        console.error('Failed to parse analysis response:', parseError);
      }
    } catch (error) {
      console.error(`Failed to analyze phrase "${phraseData.phrase}":`, error);
    }
  }

  /**
   * Add validated phrase to AI patterns table
   */
  private async addToPatterns(
    phrase: string,
    category: string,
    replacement: string | null,
    reportCount: number
  ): Promise<void> {
    try {
      // Determine pattern type based on the phrase
      let patternType: 'exact' | 'regex' | 'partial' = 'exact';
      let pattern = phrase;
      
      // Simple heuristic: if phrase has variations, create a regex pattern
      if (phrase.includes(' ')) {
        // For multi-word phrases, create a word boundary regex
        pattern = `\\b${phrase}\\b`;
        patternType = 'regex';
      }
      
      // Calculate severity based on report count
      const severity = Math.min(5, Math.ceil(reportCount / 10));
      
      // Insert or update the pattern
      const { error } = await this.supabase
        .from('ai_phrase_patterns')
        .upsert({
          pattern,
          pattern_type: patternType,
          category: category as any,
          replacement: replacement === 'remove' ? '' : replacement,
          severity,
          report_count: reportCount,
          active: true,
        }, {
          onConflict: 'pattern'
        });
      
      if (error) {
        console.error('Failed to add pattern:', error);
      } else {
        console.log(`Added pattern "${pattern}" to blocklist`);
      }
    } catch (error) {
      console.error('Failed to add to patterns:', error);
    }
  }

  /**
   * Get active AI patterns for use in detection
   */
  async getActivePatterns(): Promise<Array<{
    pattern: string;
    pattern_type: string;
    category: string;
    replacement: string | null;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_phrase_patterns')
        .select('pattern, pattern_type, category, replacement')
        .eq('active', true)
        .order('severity', { ascending: false })
        .limit(100); // Limit to top 100 patterns for performance
      
      if (error) {
        console.error('Failed to fetch active patterns:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to get active patterns:', error);
      return [];
    }
  }

  /**
   * Create a dynamic anti-AI prompt based on reported patterns
   */
  async generateDynamicAntiAIPrompt(): Promise<string> {
    const patterns = await this.getActivePatterns();
    
    if (patterns.length === 0) {
      return ''; // No dynamic patterns yet
    }
    
    // Group patterns by category
    const grouped = patterns.reduce((acc, pattern) => {
      if (!acc[pattern.category]) {
        acc[pattern.category] = [];
      }
      acc[pattern.category].push(pattern);
      return acc;
    }, {} as Record<string, typeof patterns>);
    
    // Build prompt sections
    let prompt = '\n\nADDITIONAL PATTERNS TO AVOID (from user feedback):\n';
    
    for (const [category, categoryPatterns] of Object.entries(grouped)) {
      prompt += `\n${category.toUpperCase()}S TO AVOID:\n`;
      
      categoryPatterns.slice(0, 10).forEach(p => {
        if (p.replacement) {
          prompt += `- "${p.pattern}" → use "${p.replacement}" instead\n`;
        } else {
          prompt += `- Avoid: "${p.pattern}"\n`;
        }
      });
    }
    
    return prompt;
  }
}

/**
 * Scheduled function to run phrase analysis
 * This should be called periodically (e.g., daily) to analyze new reports
 */
export async function runScheduledPhraseAnalysis() {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing required environment variables for phrase analysis');
    return;
  }
  
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const analyzer = new PhraseAnalyzer(
    process.env.ANTHROPIC_API_KEY,
    supabase as any
  );
  
  console.log('Starting scheduled phrase analysis...');
  await analyzer.analyzeReportedPhrases(5);
  console.log('Phrase analysis completed');
}