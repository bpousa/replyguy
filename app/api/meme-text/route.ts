import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openAIMemeService } from '@/app/lib/services/openai-meme.service';
import { imgflipService } from '@/app/lib/services/imgflip.service';
import { memeTemplateTracker } from '@/app/lib/services/meme-template-tracker';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

// Request validation schema
const requestSchema = z.object({
  userText: z.string().max(100).optional(),
  reply: z.string().min(1).max(1000),
  originalTweet: z.string().min(1).max(1000).optional(),
  tone: z.string(),
  enhance: z.boolean().default(false),
  userId: z.string().optional()
});

export async function POST(req: NextRequest) {
  let body: any;
  try {
    // Validate request
    body = await req.json();
    const validated = requestSchema.parse(body);
    
    console.log('[meme-text] Request:', {
      hasUserText: !!validated.userText,
      userText: validated.userText || 'none',
      hasOriginalTweet: !!validated.originalTweet,
      enhance: validated.enhance,
      tone: validated.tone,
      replyLength: validated.reply.length,
      userId: validated.userId || 'anonymous'
    });
    
    // Check if services are configured
    if (!openAIMemeService.isConfigured() || !imgflipService.isConfigured()) {
      console.error('[meme-text] Services not fully configured');
      return NextResponse.json({
        text: validated.userText || 'this is fine',
        enhanced: false,
        method: 'fallback',
        useAutomeme: true
      });
    }
    
    const userId = validated.userId || 'anonymous';
    
    // If user provided exact text and doesn't want enhancement, use it
    if (validated.userText && !validated.enhance) {
      console.log('[meme-text] Using exact user text');
      return NextResponse.json({
        text: validated.userText,
        enhanced: false,
        method: 'user-provided',
        useAutomeme: true
      });
    }
    
    // New approach: Template-based selection
    try {
      console.log('[meme-text] Starting template-based meme generation');
      
      // Step 1: Fetch popular meme templates
      const templates = await imgflipService.getPopularMemes();
      console.log(`[meme-text] Fetched ${templates.length} templates`);
      
      if (templates.length === 0) {
        throw new Error('No templates available');
      }
      
      // Step 2: Get recently used templates to avoid
      const recentTemplateIds = memeTemplateTracker.getRecentTemplateIds(userId);
      console.log(`[meme-text] User has ${recentTemplateIds.size} recent templates to avoid`);
      
      // Step 3: Score templates by diversity
      const scoredTemplates = memeTemplateTracker.scoreTemplatesByDiversity(templates, userId);
      
      // Step 4: Filter and sort by score
      const candidateTemplateIds = scoredTemplates
        .filter(st => st.score > 20) // Minimum score threshold
        .sort((a, b) => b.score - a.score)
        .slice(0, 30) // Top 30 for GPT-4o to choose from
        .map(st => st.template.id);
      
      // Get the full template data for the selected candidates
      const candidateTemplates = templates.filter(t => candidateTemplateIds.includes(t.id));
      
      console.log(`[meme-text] ${candidateTemplates.length} diverse templates for selection`);
      
      // Step 5: Use GPT-4o to select best template based on context
      const selection = await openAIMemeService.selectMemeTemplate({
        originalTweet: validated.originalTweet || validated.reply,
        reply: validated.reply,
        tone: validated.tone,
        templates: candidateTemplates
      });
      
      console.log('[meme-text] Template selected:', {
        id: selection.templateId,
        name: selection.templateName,
        hasTopText: !!selection.topText,
        hasBottomText: !!selection.bottomText,
        hasSingleText: !!selection.text
      });
      
      // Step 6: Record template usage for diversity tracking
      memeTemplateTracker.recordUsage(userId, selection.templateId, selection.templateName);
      
      // Step 7: Get box count for the selected template
      const selectedTemplate = templates.find(t => t.id === selection.templateId);
      const boxCount = selectedTemplate?.box_count || 2;
      
      console.log('[meme-text] Template box count:', boxCount);
      
      // Step 8: Return template-specific response
      return NextResponse.json({
        templateId: selection.templateId,
        templateName: selection.templateName,
        topText: selection.topText,
        bottomText: selection.bottomText,
        text: selection.text,
        boxCount: boxCount, // Include box count for proper handling
        enhanced: true,
        method: 'template-selection',
        useAutomeme: false // We'll use captionImage instead
      });
      
    } catch (templateError) {
      console.error('[meme-text] Template selection failed:', templateError);
      
      // Fallback to original automeme approach
      console.log('[meme-text] Falling back to automeme approach');
      
      const memeText = await openAIMemeService.generateMemeText({
        userText: validated.userText,
        reply: validated.reply,
        originalTweet: validated.originalTweet,
        tone: validated.tone,
        enhance: validated.enhance
      });
      
      return NextResponse.json({
        text: memeText,
        enhanced: validated.enhance || !validated.userText,
        method: 'automeme-fallback',
        useAutomeme: true
      });
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('[meme-text] Error:', error);
    
    // Final fallback
    return NextResponse.json({
      text: body?.userText || 'this is fine',
      enhanced: false,
      method: 'error-fallback',
      useAutomeme: true
    });
  }
}