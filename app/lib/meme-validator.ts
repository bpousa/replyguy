import { MemeTemplateMetadataService } from './meme-template-metadata';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100, where 100 is perfect
  suggestions?: string[];
}

interface TemplateConstraints {
  maxCharsPerBox: number;
  minCharsPerBox: number;
  maxWordsPerBox: number;
  minWordsPerBox: number;
  totalBoxes: number;
  specialRules?: string[];
}

interface MemeValidationOptions {
  templateName: string;
  templateId: string;
  boxCount: number;
  topText?: string;
  bottomText?: string;
  text?: string;
  additionalTexts?: string[];
}

export class MemeTextValidator {
  // Template-specific constraints based on analysis of successful memes
  private static readonly TEMPLATE_CONSTRAINTS: Record<string, TemplateConstraints> = {
    // Popular 2-box templates
    'Drake Pointing': {
      maxCharsPerBox: 60,
      minCharsPerBox: 3,
      maxWordsPerBox: 8,
      minWordsPerBox: 1,
      totalBoxes: 2,
      specialRules: ['contrast_required'] // Top should contrast with bottom
    },
    'Two Buttons': {
      maxCharsPerBox: 40,
      minCharsPerBox: 3,
      maxWordsPerBox: 6,
      minWordsPerBox: 1,
      totalBoxes: 2,
      specialRules: ['choice_required'] // Should present two options
    },
    'Distracted Boyfriend': {
      maxCharsPerBox: 25,
      minCharsPerBox: 2,
      maxWordsPerBox: 4,
      minWordsPerBox: 1,
      totalBoxes: 3,
      specialRules: ['three_labels'] // Current, temptation, reaction
    },
    // Multi-box templates  
    'Expanding Brain': {
      maxCharsPerBox: 35,
      minCharsPerBox: 3,
      maxWordsPerBox: 5,
      minWordsPerBox: 1,
      totalBoxes: 4,
      specialRules: ['progressive'] // Each level should build on previous
    },
    // Single box templates
    'One Does Not Simply': {
      maxCharsPerBox: 80,
      minCharsPerBox: 5,
      maxWordsPerBox: 12,
      minWordsPerBox: 2,
      totalBoxes: 1,
      specialRules: ['negative_statement'] // Should express what one doesn't do
    }
  };

  // Default constraints for unknown templates based on box count
  private static readonly DEFAULT_CONSTRAINTS: Record<number, TemplateConstraints> = {
    1: {
      maxCharsPerBox: 80,
      minCharsPerBox: 5,
      maxWordsPerBox: 12,
      minWordsPerBox: 2,
      totalBoxes: 1
    },
    2: {
      maxCharsPerBox: 60,
      minCharsPerBox: 3,
      maxWordsPerBox: 8,
      minWordsPerBox: 1,
      totalBoxes: 2
    },
    3: {
      maxCharsPerBox: 30,
      minCharsPerBox: 2,
      maxWordsPerBox: 5,
      minWordsPerBox: 1,
      totalBoxes: 3
    },
    4: {
      maxCharsPerBox: 25,
      minCharsPerBox: 2,
      maxWordsPerBox: 4,
      minWordsPerBox: 1,
      totalBoxes: 4
    }
  };

  /**
   * Validate meme text against template constraints
   */
  static validate(options: MemeValidationOptions): ValidationResult {
    const { templateName, templateId, boxCount, topText, bottomText, text, additionalTexts } = options;
    
    // First try to use metadata service for enhanced validation
    const metadata = MemeTemplateMetadataService.getTemplateMetadata(templateId);
    if (metadata) {
      return this.validateWithMetadata(options, metadata);
    }

    // Fallback to original validation
    const constraints = this.getConstraints(templateName, boxCount);
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 100,
      suggestions: []
    };

    // Collect all texts to validate
    const textsToValidate: string[] = [];
    if (text) {
      textsToValidate.push(text);
    } else {
      if (topText) textsToValidate.push(topText);
      if (bottomText) textsToValidate.push(bottomText);
      if (additionalTexts) textsToValidate.push(...additionalTexts);
    }

    // Validate each text box
    let totalScore = 0;
    let scoredBoxes = 0;

    for (let i = 0; i < textsToValidate.length; i++) {
      const boxText = textsToValidate[i];
      if (!boxText || boxText.trim().length === 0) {
        if (i < constraints.totalBoxes) {
          result.errors.push(`Box ${i + 1} is empty but required for this template`);
          result.isValid = false;
        }
        continue;
      }

      const boxValidation = this.validateTextBox(boxText, constraints, i + 1);
      totalScore += boxValidation.score;
      scoredBoxes++;

      if (boxValidation.errors.length > 0) {
        result.errors.push(...boxValidation.errors);
        result.isValid = false;
      }
      
      result.warnings.push(...boxValidation.warnings);
      if (boxValidation.suggestions) {
        result.suggestions?.push(...boxValidation.suggestions);
      }
    }

    // Check template-specific rules
    const specialValidation = this.validateSpecialRules(templateName, textsToValidate, constraints);
    result.errors.push(...specialValidation.errors);
    result.warnings.push(...specialValidation.warnings);
    if (specialValidation.suggestions) {
      result.suggestions?.push(...specialValidation.suggestions);
    }
    if (specialValidation.errors.length > 0) {
      result.isValid = false;
    }

    // Calculate overall score
    result.score = scoredBoxes > 0 ? Math.round(totalScore / scoredBoxes) : 0;
    
    // Apply penalties for errors/warnings
    result.score -= result.errors.length * 20;
    result.score -= result.warnings.length * 5;
    result.score = Math.max(0, result.score);

    return result;
  }

  /**
   * Enhanced validation using metadata service
   */
  private static validateWithMetadata(options: MemeValidationOptions, metadata: any): ValidationResult {
    const { topText, bottomText, text, additionalTexts } = options;
    
    // Collect all texts
    const textsToValidate: string[] = [];
    if (text) {
      textsToValidate.push(text);
    } else {
      if (topText) textsToValidate.push(topText);
      if (bottomText) textsToValidate.push(bottomText);
      if (additionalTexts) textsToValidate.push(...additionalTexts);
    }

    // Use metadata service validation
    const metadataValidation = MemeTemplateMetadataService.validateAgainstTemplate(
      metadata.id, 
      textsToValidate
    );

    // Enhance with our quality checks
    const qualityResults = textsToValidate.map(t => this.assessTextQuality(t));
    const avgQualityScore = qualityResults.reduce((sum, q) => sum + q.score, 0) / qualityResults.length;
    
    const allWarnings = [
      ...metadataValidation.suggestions,
      ...qualityResults.flatMap(q => q.warnings)
    ];

    const allSuggestions = [
      ...metadataValidation.suggestions,
      ...qualityResults.flatMap(q => q.suggestions || [])
    ];

    // Combine scores (70% metadata validation, 30% quality)
    const combinedScore = Math.round(metadataValidation.score * 0.7 + avgQualityScore * 0.3);

    return {
      isValid: metadataValidation.isValid,
      errors: metadataValidation.errors,
      warnings: allWarnings,
      score: combinedScore,
      suggestions: allSuggestions
    };
  }

  /**
   * Get constraints for a template
   */
  private static getConstraints(templateName: string, boxCount: number): TemplateConstraints {
    // Try to find exact template match
    const exactMatch = this.TEMPLATE_CONSTRAINTS[templateName];
    if (exactMatch) {
      return exactMatch;
    }

    // Find partial match (template name contains key)
    for (const [key, constraints] of Object.entries(this.TEMPLATE_CONSTRAINTS)) {
      if (templateName.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(templateName.toLowerCase())) {
        return constraints;
      }
    }

    // Fall back to box count defaults
    return this.DEFAULT_CONSTRAINTS[boxCount] || this.DEFAULT_CONSTRAINTS[2];
  }

  /**
   * Validate individual text box
   */
  private static validateTextBox(text: string, constraints: TemplateConstraints, boxNumber: number): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 100,
      suggestions: []
    };

    const charCount = text.length;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    // Character count validation
    if (charCount > constraints.maxCharsPerBox) {
      result.errors.push(`Box ${boxNumber}: Text too long (${charCount} chars, max ${constraints.maxCharsPerBox})`);
      result.score -= 30;
    } else if (charCount < constraints.minCharsPerBox) {
      result.errors.push(`Box ${boxNumber}: Text too short (${charCount} chars, min ${constraints.minCharsPerBox})`);
      result.score -= 20;
    }

    // Word count validation
    if (wordCount > constraints.maxWordsPerBox) {
      result.warnings.push(`Box ${boxNumber}: Many words (${wordCount}, suggested max ${constraints.maxWordsPerBox})`);
      result.score -= 10;
    } else if (wordCount < constraints.minWordsPerBox) {
      result.warnings.push(`Box ${boxNumber}: Few words (${wordCount}, suggested min ${constraints.minWordsPerBox})`);
      result.score -= 5;
    }

    // Text quality checks
    const qualityScore = this.assessTextQuality(text);
    result.score = Math.min(result.score, qualityScore.score);
    result.warnings.push(...qualityScore.warnings);
    
    if (qualityScore.suggestions) {
      result.suggestions?.push(...qualityScore.suggestions);
    }

    return result;
  }

  /**
   * Assess text quality for meme appropriateness
   */
  private static assessTextQuality(text: string): { score: number; warnings: string[]; suggestions?: string[] } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for common issues
    if (text.includes('...')) {
      warnings.push('Ellipsis may not render well in memes');
      score -= 5;
    }

    if (text.includes('"') || text.includes("'")) {
      warnings.push('Quotes may interfere with text rendering');
      score -= 5;
    }

    if (/[!?]{2,}/.test(text)) {
      warnings.push('Multiple punctuation marks may look cluttered');
      score -= 5;
    }

    // Check for overly complex language
    const complexWords = text.split(/\s+/).filter(word => word.length > 12);
    if (complexWords.length > 0) {
      warnings.push('Long words may be hard to read in meme format');
      suggestions.push('Consider shorter, simpler words');
      score -= 10;
    }

    // Check for meme-friendliness
    const memeWords = ['lol', 'bruh', 'sus', 'based', 'cringe', 'vibe', 'mood', 'facts', 'cap', 'bet'];
    const hasMemeLanguage = memeWords.some(word => text.toLowerCase().includes(word));
    if (hasMemeLanguage) {
      score += 5; // Bonus for meme language
    }

    return { score, warnings, suggestions };
  }

  /**
   * Validate template-specific rules
   */
  private static validateSpecialRules(
    templateName: string,
    texts: string[],
    constraints: TemplateConstraints
  ): { errors: string[]; warnings: string[]; suggestions?: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!constraints.specialRules) {
      return { errors, warnings, suggestions };
    }

    for (const rule of constraints.specialRules) {
      switch (rule) {
        case 'contrast_required':
          if (texts.length >= 2) {
            const similarity = this.calculateTextSimilarity(texts[0], texts[1]);
            if (similarity > 0.7) {
              warnings.push('Top and bottom text are very similar - consider more contrast');
              suggestions.push('Make the top text oppose or contrast with the bottom text');
            }
          }
          break;

        case 'choice_required':
          if (texts.length >= 2) {
            const hasChoice = texts.some(text => 
              text.toLowerCase().includes('or') || 
              text.toLowerCase().includes('vs') ||
              text.includes('?')
            );
            if (!hasChoice) {
              suggestions.push('Consider framing as a choice or dilemma');
            }
          }
          break;

        case 'three_labels':
          if (texts.length !== 3) {
            errors.push('This template requires exactly 3 text labels');
          }
          break;

        case 'progressive':
          if (texts.length >= 2) {
            // Check if texts show progression (harder to validate automatically)
            suggestions.push('Ensure each level builds on or improves the previous one');
          }
          break;

        case 'negative_statement':
          if (texts.length > 0 && !texts[0].toLowerCase().includes('not')) {
            suggestions.push('Consider starting with "One does not simply..." format');
          }
          break;
      }
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Calculate text similarity (0-1, where 1 is identical)
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }

  /**
   * Get improvement suggestions for failed validation
   */
  static getSuggestions(options: MemeValidationOptions): string[] {
    const validation = this.validate(options);
    const suggestions: string[] = [...(validation.suggestions || [])];

    if (validation.errors.length > 0) {
      suggestions.push('Consider using automeme instead of template-specific generation');
      suggestions.push('Try breaking up long text into shorter phrases');
      suggestions.push('Use simpler, more direct language');
    }

    return suggestions;
  }

  /**
   * Check if text should be retried with different parameters
   */
  static shouldRetry(options: MemeValidationOptions): boolean {
    const validation = this.validate(options);
    return validation.score < 60; // Retry if score is below 60
  }

  /**
   * Generate retry parameters for improved generation
   */
  static getRetryParameters(options: MemeValidationOptions): {
    maxCharsPerBox: number;
    maxWordsPerBox: number;
    templateSuggestion?: string;
  } {
    const constraints = this.getConstraints(options.templateName, options.boxCount);
    
    return {
      maxCharsPerBox: Math.floor(constraints.maxCharsPerBox * 0.8), // 20% buffer
      maxWordsPerBox: Math.floor(constraints.maxWordsPerBox * 0.8),
      templateSuggestion: constraints.totalBoxes > 2 ? 'Consider simpler 2-box template' : undefined
    };
  }
}