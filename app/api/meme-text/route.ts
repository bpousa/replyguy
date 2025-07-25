import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openAIMemeService } from '@/app/lib/services/openai-meme.service';
import { imgflipService } from '@/app/lib/services/imgflip.service';
import { memeTemplateTracker } from '@/app/lib/services/meme-template-tracker';
import { MemeTextValidator } from '@/app/lib/meme-validator';
import { MemeQualityScorer } from '@/app/lib/meme-quality-scorer';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

// Request validation schema
const requestSchema = z.object({
  userText: z.string().max(100).optional(),
  reply: z.string().min(0).max(1000).default(''), // Allow empty for pre-processing
  originalTweet: z.string().min(1).max(1000).optional(),
  tone: z.string(),
  enhance: z.boolean().default(false),
  userId: z.string().optional(),
  isPreprocess: z.boolean().optional(),
  templateData: z.any().optional()
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
      // Generate a basic context-aware fallback
      const contextFallback = validated.tone === 'humorous' ? 'funny story' :
                             validated.tone === 'sarcastic' ? 'oh really' :
                             validated.tone === 'professional' ? 'lets work' :
                             'interesting';
      return NextResponse.json({
        text: validated.userText || contextFallback,
        enhanced: false,
        method: 'service-not-configured',
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
    
    // Handle pre-processing request
    if (validated.isPreprocess) {
      console.log('[meme-text] Pre-processing meme template selection');
      
      // For pre-processing, select template based on tone/context without final reply
      try {
        const templates = await imgflipService.getPopularMemes();
        const recentTemplateIds = memeTemplateTracker.getRecentTemplateIds(userId);
        const scoredTemplates = memeTemplateTracker.scoreTemplatesByDiversity(templates, userId);
        
        const candidateTemplateIds = scoredTemplates
          .filter(st => st.score > 20)
          .sort((a, b) => b.score - a.score)
          .slice(0, 15) // Fewer candidates for pre-processing
          .map(st => st.template.id);
        
        const candidateTemplates = templates.filter(t => candidateTemplateIds.includes(t.id));
        
        // For pre-processing, just return the top candidates
        return NextResponse.json({
          preProcessed: true,
          candidateTemplates: candidateTemplates.slice(0, 5),
          needsReplyUpdate: true,
          method: 'pre-processed'
        });
      } catch (error) {
        console.error('[meme-text] Pre-processing failed:', error);
        return NextResponse.json({
          preProcessed: false,
          error: 'Pre-processing failed'
        });
      }
    }
    
    // Handle template data update (when we have the final reply)
    if (validated.templateData && validated.templateData.preProcessed) {
      console.log('[meme-text] Updating pre-processed template with final reply');
      
      // Use the pre-selected templates with the actual reply
      const candidateTemplates = validated.templateData.candidateTemplates;
      
      // Now select the best one with the actual reply context
      const selection = await openAIMemeService.selectMemeTemplate({
        templates: candidateTemplates,
        reply: validated.reply,
        originalTweet: validated.originalTweet || '',
        tone: validated.tone
      });
      
      if (selection) {
        memeTemplateTracker.recordUsage(userId, selection.templateId, selection.templateName);
        return NextResponse.json({
          ...selection,
          method: 'template-updated'
        });
      }
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
      
      // Step 5: Use GPT-4o to select best template based on context with retry logic
      let selection;
      let retryCount = 0;
      const maxRetries = 3;
      let lastValidationError;
      let workingTemplates = [...candidateTemplates]; // Create a copy for retries

      while (retryCount < maxRetries) {
        try {
          selection = await openAIMemeService.selectMemeTemplate({
            originalTweet: validated.originalTweet || validated.reply,
            reply: validated.reply,
            tone: validated.tone,
            templates: workingTemplates
          });

          // Validate the selection if validation results are available
          let shouldRetry = false;
          let retryReason = '';

          if (selection.validation && !selection.validation.isValid && selection.validation.score < 60) {
            shouldRetry = true;
            retryReason = 'validation';
            lastValidationError = selection.validation;
            console.warn(`[meme-text] Attempt ${retryCount + 1} validation failed:`, {
              errors: selection.validation.errors,
              score: selection.validation.score,
              suggestions: selection.validation.suggestions
            });
          } else {
            // Additional quality scoring check
            const memeTexts = [];
            if (selection.text) memeTexts.push(selection.text);
            if (selection.topText) memeTexts.push(selection.topText);
            if (selection.bottomText) memeTexts.push(selection.bottomText);

            const qualityContent = {
              originalTweet: validated.originalTweet || validated.reply,
              reply: validated.reply,
              tone: validated.tone,
              templateName: selection.templateName,
              memeTexts
            };

            const qualityScore = MemeQualityScorer.assessQuality(qualityContent);
            
            console.log(`[meme-text] Attempt ${retryCount + 1} quality assessment:`, {
              overall: qualityScore.overall,
              breakdown: qualityScore.breakdown,
              issues: qualityScore.issues,
              strengths: qualityScore.strengths
            });

            // Check if quality meets minimum standards
            if (qualityScore.overall < 50 || qualityScore.breakdown.contextualFit < 40) {
              shouldRetry = true;
              retryReason = 'quality';
              console.warn(`[meme-text] Attempt ${retryCount + 1} quality too low:`, {
                overall: qualityScore.overall,
                contextualFit: qualityScore.breakdown.contextualFit,
                issues: qualityScore.issues
              });
            }
          }

          if (shouldRetry) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`[meme-text] Retrying with attempt ${retryCount + 1}/${maxRetries} (reason: ${retryReason})`);
              
              // For retry, filter to simpler templates (fewer boxes, higher success rate)
              if (retryCount === 2) {
                // Second retry: prefer 2-box templates
                workingTemplates = candidateTemplates.filter(t => t.box_count <= 2);
                console.log(`[meme-text] Retry ${retryCount}: Using ${workingTemplates.length} simpler templates`);
              } else if (retryCount === 3) {
                // Third retry: only single-box templates
                workingTemplates = candidateTemplates.filter(t => t.box_count === 1);
                console.log(`[meme-text] Retry ${retryCount}: Using ${workingTemplates.length} single-box templates`);
              }
              
              // If no templates left after filtering, break and use what we have
              if (workingTemplates.length === 0) {
                console.warn('[meme-text] No templates left after filtering, accepting last result');
                break;
              }
              continue;
            }
          }

          // If we get here, validation passed or we're accepting the result
          break;

        } catch (selectionError) {
          console.error(`[meme-text] Template selection attempt ${retryCount + 1} failed:`, selectionError);
          retryCount++;
          if (retryCount >= maxRetries) {
            throw selectionError;
          }
        }
      }

      if (!selection) {
        throw new Error('Failed to select template after all retries');
      }
      
      console.log('[meme-text] Template selected (after retries):', {
        id: selection.templateId,
        name: selection.templateName,
        hasTopText: !!selection.topText,
        hasBottomText: !!selection.bottomText,
        hasSingleText: !!selection.text,
        attempts: retryCount + 1,
        validationPassed: !selection.validation || selection.validation.isValid,
        finalScore: selection.validation?.score || 'N/A'
      });
      
      // Step 6: Record template usage for diversity tracking
      memeTemplateTracker.recordUsage(userId, selection.templateId, selection.templateName);
      
      // Step 7: Get box count for the selected template
      const selectedTemplate = templates.find(t => t.id === selection.templateId);
      const boxCount = selectedTemplate?.box_count || 2;
      
      console.log('[meme-text] Template box count:', boxCount);
      
      // Step 8: Handle multi-box text distribution if needed
      let textDistribution;
      if (boxCount > 1 && selection.text && !selection.topText && !selection.bottomText) {
        // Template needs multiple boxes but only single text was provided
        textDistribution = openAIMemeService.distributeTextForTemplate(
          selection.templateName,
          selection.text,
          boxCount
        );
        console.log('[meme-text] Distributed text for multi-box template:', textDistribution);
      } else {
        // Use the provided multi-box text
        textDistribution = {
          topText: selection.topText,
          bottomText: selection.bottomText,
          text: selection.text
        };
      }
      
      // Step 9: Return template-specific response
      return NextResponse.json({
        templateId: selection.templateId,
        templateName: selection.templateName,
        ...textDistribution, // Spread the distributed text
        boxCount: boxCount, // Include box count for proper handling
        enhanced: true,
        method: 'template-selection',
        useAutomeme: false // We'll use captionImage instead
      });
      
    } catch (templateError) {
      console.error('[meme-text] Template selection failed after all retries:', templateError);
      
      // Enhanced fallback to automeme approach with validation
      console.log('[meme-text] Falling back to automeme approach with enhanced constraints');
      
      try {
        // Generate meme text with stricter constraints for automeme
        const memeText = await openAIMemeService.generateMemeText({
          userText: validated.userText,
          reply: validated.reply,
          originalTweet: validated.originalTweet,
          tone: validated.tone,
          enhance: validated.enhance
        });

        // Validate the automeme text as well
        const automemeValidation = MemeTextValidator.validate({
          templateName: 'Automeme',
          templateId: 'automeme',
          boxCount: 1,
          text: memeText
        });

        console.log('[meme-text] Automeme fallback generated:', {
          text: memeText,
          validation: {
            isValid: automemeValidation.isValid,
            score: automemeValidation.score,
            errors: automemeValidation.errors,
            warnings: automemeValidation.warnings
          }
        });

        return NextResponse.json({
          text: memeText,
          enhanced: validated.enhance || !validated.userText,
          method: 'automeme-fallback',
          useAutomeme: true,
          validation: automemeValidation
        });

      } catch (automemeError) {
        console.error('[meme-text] Automeme fallback also failed:', automemeError);
        
        // Final context-aware fallback
        const contextFallback = validated.tone === 'humorous' ? 'plot twist incoming' :
                               validated.tone === 'sarcastic' ? 'this is fine' :
                               validated.tone === 'professional' ? 'lets optimize this' :
                               validated.tone === 'supportive' ? 'you got this' :
                               'interesting development';

        return NextResponse.json({
          text: contextFallback,
          enhanced: false,
          method: 'final-fallback',
          useAutomeme: true,
          fallbackReason: 'All generation methods failed'
        });
      }
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('[meme-text] Error:', error);
    
    // Final fallback - try to generate something context-aware
    const errorFallback = body?.tone === 'humorous' ? 'plot twist' :
                         body?.tone === 'sarcastic' ? 'shocking' :
                         body?.tone === 'professional' ? 'noted' :
                         'unexpected';
    
    return NextResponse.json({
      text: body?.userText || errorFallback,
      enhanced: false,
      method: 'error-fallback',
      useAutomeme: true
    });
  }
}