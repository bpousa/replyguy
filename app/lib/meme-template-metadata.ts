interface TemplateMetadata {
  id: string;
  name: string;
  category: string;
  boxCount: number;
  constraints: {
    maxCharsPerBox: number;
    minCharsPerBox: number;
    maxWordsPerBox: number;
    minWordsPerBox: number;
    totalMaxChars: number;
  };
  layout: {
    type: 'top-bottom' | 'multi-panel' | 'overlay' | 'comparison' | 'progression';
    distribution: 'equal' | 'weighted' | 'custom';
    textPositions: string[];
  };
  usage: {
    complexity: 1 | 2 | 3 | 4 | 5; // 1 = simple, 5 = complex
    successRate: number; // Historical success rate 0-100
    popularityScore: number; // How popular this template is
    recommendedContexts: string[];
  };
  specialRules?: {
    requiresContrast?: boolean;
    requiresProgression?: boolean;
    requiresChoice?: boolean;
    requiresLabels?: boolean;
    textFormat?: 'statement' | 'question' | 'exclamation' | 'negative';
  };
  examples: {
    good: Array<{
      context: string;
      texts: string[];
      score: number;
    }>;
    bad: Array<{
      context: string;
      texts: string[];
      issues: string[];
    }>;
  };
}

export class MemeTemplateMetadataService {
  private static readonly TEMPLATE_DATABASE: Record<string, TemplateMetadata> = {
    // Drake Pointing (181913649) - Very popular 2-box comparison
    '181913649': {
      id: '181913649',
      name: 'Drake Pointing',
      category: 'comparison',
      boxCount: 2,
      constraints: {
        maxCharsPerBox: 50,
        minCharsPerBox: 3,
        maxWordsPerBox: 7,
        minWordsPerBox: 1,
        totalMaxChars: 100
      },
      layout: {
        type: 'comparison',
        distribution: 'equal',
        textPositions: ['top-reject', 'bottom-prefer']
      },
      usage: {
        complexity: 2,
        successRate: 85,
        popularityScore: 95,
        recommendedContexts: ['choice', 'preference', 'comparison', 'upgrade', 'learning']
      },
      specialRules: {
        requiresContrast: true,
        textFormat: 'statement'
      },
      examples: {
        good: [
          {
            context: 'Learning programming',
            texts: ['copying code from stackoverflow', 'understanding the code'],
            score: 90
          },
          {
            context: 'AI tools',
            texts: ['basic prompts', 'advanced prompt engineering'],
            score: 88
          }
        ],
        bad: [
          {
            context: 'Generic agreement',
            texts: ['yes this is good', 'i agree with this'],
            issues: ['no contrast', 'too similar', 'not funny']
          }
        ]
      }
    },

    // Distracted Boyfriend (188390779) - 3-box story template
    '188390779': {
      id: '188390779',
      name: 'Distracted Boyfriend',
      category: 'story',
      boxCount: 3,
      constraints: {
        maxCharsPerBox: 25,
        minCharsPerBox: 2,
        maxWordsPerBox: 4,
        minWordsPerBox: 1,
        totalMaxChars: 75
      },
      layout: {
        type: 'multi-panel',
        distribution: 'custom',
        textPositions: ['boyfriend-label', 'girlfriend-label', 'other-woman-label']
      },
      usage: {
        complexity: 4,
        successRate: 65, // Lower success rate due to complexity
        popularityScore: 80,
        recommendedContexts: ['temptation', 'choice', 'distraction', 'upgrade', 'tech-shift']
      },
      specialRules: {
        requiresLabels: true,
        textFormat: 'statement'
      },
      examples: {
        good: [
          {
            context: 'Technology adoption',
            texts: ['me', 'old tech', 'new AI'],
            score: 85
          }
        ],
        bad: [
          {
            context: 'Too complex',
            texts: ['complicated explanation', 'another complex thing', 'yet more complexity'],
            issues: ['text too long', 'not clear', 'hard to read']
          }
        ]
      }
    },

    // Expanding Brain (170200137) - 4-box progression
    '170200137': {
      id: '170200137',
      name: 'Expanding Brain',
      category: 'progression',
      boxCount: 4,
      constraints: {
        maxCharsPerBox: 30,
        minCharsPerBox: 3,
        maxWordsPerBox: 5,
        minWordsPerBox: 1,
        totalMaxChars: 120
      },
      layout: {
        type: 'progression',
        distribution: 'equal',
        textPositions: ['level1-basic', 'level2-better', 'level3-advanced', 'level4-transcendent']
      },
      usage: {
        complexity: 5,
        successRate: 60, // Lower due to high complexity
        popularityScore: 75,
        recommendedContexts: ['learning', 'evolution', 'improvement', 'levels', 'mastery']
      },
      specialRules: {
        requiresProgression: true,
        textFormat: 'statement'
      },
      examples: {
        good: [
          {
            context: 'Programming skills',
            texts: ['hello world', 'simple app', 'complex system', 'AI architect'],
            score: 90
          }
        ],
        bad: [
          {
            context: 'No progression',
            texts: ['random thing', 'another random', 'still random', 'more random'],
            issues: ['no logical progression', 'not building up', 'confusing']
          }
        ]
      }
    },

    // One Does Not Simply (61579) - Single box with specific format
    '61579': {
      id: '61579',
      name: 'One Does Not Simply',
      category: 'statement',
      boxCount: 1,
      constraints: {
        maxCharsPerBox: 70,
        minCharsPerBox: 10,
        maxWordsPerBox: 10,
        minWordsPerBox: 3,
        totalMaxChars: 70
      },
      layout: {
        type: 'overlay',
        distribution: 'equal',
        textPositions: ['center-bottom']
      },
      usage: {
        complexity: 2,
        successRate: 80,
        popularityScore: 85,
        recommendedContexts: ['difficulty', 'challenge', 'impossibility', 'wisdom', 'advice']
      },
      specialRules: {
        textFormat: 'negative'
      },
      examples: {
        good: [
          {
            context: 'Programming advice',
            texts: ['debug production without logging'],
            score: 88
          }
        ],
        bad: [
          {
            context: 'Wrong format',
            texts: ['yes you can do this easily'],
            issues: ['wrong format', 'should be negative', 'not fitting template']
          }
        ]
      }
    },

    // This Is Fine (55311130) - Single box ironic statement
    '55311130': {
      id: '55311130',
      name: 'This Is Fine',
      category: 'irony',
      boxCount: 1,
      constraints: {
        maxCharsPerBox: 40,
        minCharsPerBox: 5,
        maxWordsPerBox: 6,
        minWordsPerBox: 2,
        totalMaxChars: 40
      },
      layout: {
        type: 'overlay',
        distribution: 'equal',
        textPositions: ['center']
      },
      usage: {
        complexity: 2,
        successRate: 85,
        popularityScore: 90,
        recommendedContexts: ['chaos', 'problems', 'irony', 'acceptance', 'bugs']
      },
      specialRules: {
        textFormat: 'statement'
      },
      examples: {
        good: [
          {
            context: 'System failures',
            texts: ['everything is broken'],
            score: 92
          }
        ],
        bad: [
          {
            context: 'Too positive',
            texts: ['everything works perfectly'],
            issues: ['wrong tone', 'not ironic', 'misses template meaning']
          }
        ]
      }
    },

    // Success Kid (61544) - Single box achievement
    '61544': {
      id: '61544',
      name: 'Success Kid',
      category: 'success',
      boxCount: 1,
      constraints: {
        maxCharsPerBox: 60,
        minCharsPerBox: 5,
        maxWordsPerBox: 8,
        minWordsPerBox: 2,
        totalMaxChars: 60
      },
      layout: {
        type: 'overlay',
        distribution: 'equal',
        textPositions: ['top-center']
      },
      usage: {
        complexity: 1,
        successRate: 90,
        popularityScore: 85,
        recommendedContexts: ['achievement', 'success', 'victory', 'completion', 'breakthrough']
      },
      examples: {
        good: [
          {
            context: 'Coding success',
            texts: ['code works on first try'],
            score: 95
          }
        ],
        bad: [
          {
            context: 'Failure story',
            texts: ['everything crashed and burned'],
            issues: ['wrong emotion', 'negative when should be positive']
          }
        ]
      }
    },

    // Woman Yelling at Cat (188390030) - 2-box confrontation
    '188390030': {
      id: '188390030',
      name: 'Woman Yelling at Cat',
      category: 'confrontation',
      boxCount: 2,
      constraints: {
        maxCharsPerBox: 45,
        minCharsPerBox: 3,
        maxWordsPerBox: 6,
        minWordsPerBox: 1,
        totalMaxChars: 90
      },
      layout: {
        type: 'comparison',
        distribution: 'equal',
        textPositions: ['left-accusation', 'right-response']
      },
      usage: {
        complexity: 3,
        successRate: 75,
        popularityScore: 80,
        recommendedContexts: ['argument', 'disagreement', 'confrontation', 'accusation', 'defense']
      },
      specialRules: {
        requiresContrast: true
      },
      examples: {
        good: [
          {
            context: 'Code review',
            texts: ['your code has bugs', 'works on my machine'],
            score: 88
          }
        ],
        bad: [
          {
            context: 'Agreement',
            texts: ['yes i agree', 'me too'],
            issues: ['no conflict', 'not confrontational', 'misses template purpose']
          }
        ]
      }
    }
  };

  /**
   * Get metadata for a specific template
   */
  static getTemplateMetadata(templateId: string): TemplateMetadata | null {
    return this.TEMPLATE_DATABASE[templateId] || null;
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): TemplateMetadata[] {
    return Object.values(this.TEMPLATE_DATABASE).filter(t => t.category === category);
  }

  /**
   * Get templates by complexity level
   */
  static getTemplatesByComplexity(maxComplexity: number): TemplateMetadata[] {
    return Object.values(this.TEMPLATE_DATABASE).filter(t => t.usage.complexity <= maxComplexity);
  }

  /**
   * Get templates with high success rates
   */
  static getReliableTemplates(minSuccessRate: number = 80): TemplateMetadata[] {
    return Object.values(this.TEMPLATE_DATABASE)
      .filter(t => t.usage.successRate >= minSuccessRate)
      .sort((a, b) => b.usage.successRate - a.usage.successRate);
  }

  /**
   * Get template recommendations based on context
   */
  static getTemplateRecommendations(context: string, maxComplexity: number = 3): TemplateMetadata[] {
    const contextLower = context.toLowerCase();
    return Object.values(this.TEMPLATE_DATABASE)
      .filter(t => {
        // Check if template is suitable for complexity
        if (t.usage.complexity > maxComplexity) return false;
        
        // Check if context matches recommended contexts
        return t.usage.recommendedContexts.some(rc => 
          contextLower.includes(rc.toLowerCase()) || 
          rc.toLowerCase().includes(contextLower)
        );
      })
      .sort((a, b) => {
        // Sort by success rate and popularity
        const scoreA = a.usage.successRate * 0.7 + a.usage.popularityScore * 0.3;
        const scoreB = b.usage.successRate * 0.7 + b.usage.popularityScore * 0.3;
        return scoreB - scoreA;
      });
  }

  /**
   * Validate text against template-specific constraints
   */
  static validateAgainstTemplate(templateId: string, texts: string[]): {
    isValid: boolean;
    score: number;
    errors: string[];
    suggestions: string[];
  } {
    const metadata = this.getTemplateMetadata(templateId);
    if (!metadata) {
      return {
        isValid: false,
        score: 0,
        errors: ['Template metadata not found'],
        suggestions: ['Use a supported template']
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check box count
    if (texts.length !== metadata.boxCount) {
      errors.push(`Expected ${metadata.boxCount} text boxes, got ${texts.length}`);
      score -= 30;
    }

    // Validate each text box
    for (let i = 0; i < texts.length && i < metadata.boxCount; i++) {
      const text = texts[i];
      const charCount = text.length;
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

      // Character validation
      if (charCount > metadata.constraints.maxCharsPerBox) {
        errors.push(`Box ${i + 1}: Too long (${charCount}/${metadata.constraints.maxCharsPerBox} chars)`);
        score -= 20;
      } else if (charCount < metadata.constraints.minCharsPerBox) {
        errors.push(`Box ${i + 1}: Too short (${charCount}/${metadata.constraints.minCharsPerBox} chars)`);
        score -= 15;
      }

      // Word validation
      if (wordCount > metadata.constraints.maxWordsPerBox) {
        suggestions.push(`Box ${i + 1}: Consider fewer words (${wordCount}/${metadata.constraints.maxWordsPerBox} words)`);
        score -= 10;
      } else if (wordCount < metadata.constraints.minWordsPerBox) {
        suggestions.push(`Box ${i + 1}: Could use more words (${wordCount}/${metadata.constraints.minWordsPerBox} words)`);
        score -= 5;
      }
    }

    // Check special rules
    if (metadata.specialRules) {
      if (metadata.specialRules.requiresContrast && texts.length >= 2) {
        const similarity = this.calculateSimilarity(texts[0], texts[1]);
        if (similarity > 0.7) {
          suggestions.push('Texts should contrast more with each other');
          score -= 15;
        }
      }

      if (metadata.specialRules.requiresProgression && texts.length >= 2) {
        suggestions.push('Ensure texts show logical progression or improvement');
      }

      if (metadata.specialRules.textFormat === 'negative' && texts.length > 0) {
        if (!texts[0].toLowerCase().includes('not') && !texts[0].toLowerCase().includes('never')) {
          suggestions.push('Consider using negative format (e.g., "One does not simply...")');
          score -= 10;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      score: Math.max(0, score),
      errors,
      suggestions
    };
  }

  /**
   * Calculate text similarity
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Get enhanced constraints for retries
   */
  static getRetryConstraints(templateId: string, attempt: number): {
    maxCharsPerBox: number;
    maxWordsPerBox: number;
    suggestions: string[];
  } {
    const metadata = this.getTemplateMetadata(templateId);
    if (!metadata) {
      return {
        maxCharsPerBox: 30,
        maxWordsPerBox: 4,
        suggestions: ['Use simpler language']
      };
    }

    // Reduce constraints for retries
    const reductionFactor = 0.8 - (attempt * 0.1); // 80%, 70%, 60% of original
    
    return {
      maxCharsPerBox: Math.floor(metadata.constraints.maxCharsPerBox * reductionFactor),
      maxWordsPerBox: Math.floor(metadata.constraints.maxWordsPerBox * reductionFactor),
      suggestions: [
        'Use shorter, simpler phrases',
        'Avoid complex punctuation',
        'Focus on key message only',
        ...(metadata.examples.good.length > 0 ? [`Good example: "${metadata.examples.good[0].texts.join(' / ')}"`] : [])
      ]
    };
  }

  /**
   * Get all template metadata
   */
  static getAllTemplates(): TemplateMetadata[] {
    return Object.values(this.TEMPLATE_DATABASE);
  }

  /**
   * Update template success rate based on usage results
   */
  static updateSuccessRate(templateId: string, wasSuccessful: boolean): void {
    const metadata = this.TEMPLATE_DATABASE[templateId];
    if (metadata) {
      // Simple exponential moving average
      const weight = 0.1; // 10% weight for new data
      metadata.usage.successRate = metadata.usage.successRate * (1 - weight) + 
                                   (wasSuccessful ? 100 : 0) * weight;
    }
  }
}