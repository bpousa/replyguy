interface QualityScore {
  overall: number; // 0-100
  breakdown: {
    humorRelevance: number;
    contextualFit: number;
    readability: number;
    memeFormat: number;
    engagement: number;
  };
  issues: string[];
  strengths: string[];
  suggestions: string[];
}

interface MemeContent {
  originalTweet: string;
  reply: string;
  tone: string;
  templateName: string;
  memeTexts: string[];
}

export class MemeQualityScorer {
  
  /**
   * Comprehensive quality assessment for memes
   */
  static assessQuality(content: MemeContent): QualityScore {
    const breakdown = {
      humorRelevance: this.scoreHumorRelevance(content),
      contextualFit: this.scoreContextualFit(content),
      readability: this.scoreReadability(content.memeTexts),
      memeFormat: this.scoreMemeFormat(content),
      engagement: this.scoreEngagementPotential(content)
    };

    // Calculate weighted overall score
    const weights = {
      humorRelevance: 0.25,
      contextualFit: 0.3,
      readability: 0.2,
      memeFormat: 0.15,
      engagement: 0.1
    };

    const overall = Math.round(
      breakdown.humorRelevance * weights.humorRelevance +
      breakdown.contextualFit * weights.contextualFit +
      breakdown.readability * weights.readability +
      breakdown.memeFormat * weights.memeFormat +
      breakdown.engagement * weights.engagement
    );

    const { issues, strengths, suggestions } = this.generateFeedback(content, breakdown);

    return {
      overall,
      breakdown,
      issues,
      strengths,
      suggestions
    };
  }

  /**
   * Score how funny/relevant the meme is to the context
   */
  private static scoreHumorRelevance(content: MemeContent): number {
    let score = 50; // Start with neutral

    const combinedText = content.memeTexts.join(' ').toLowerCase();
    const replyLower = content.reply.toLowerCase();
    const tweetLower = content.originalTweet.toLowerCase();

    // Check for humor indicators
    const humorPatterns = [
      /but wait there's more/i,
      /plot twist/i,
      /uno reverse/i,
      /surprise/i,
      /meanwhile/i,
      /suddenly/i,
      /not sure if/i,
      /such .* much .*/i,
      /y u no/i,
      /i see what you did there/i,
      /that escalated quickly/i
    ];

    const hasHumorPattern = humorPatterns.some(pattern => pattern.test(combinedText));
    if (hasHumorPattern) score += 15;

    // Check for irony/sarcasm alignment with tone
    if (content.tone === 'sarcastic') {
      const sarcasmIndicators = ['oh really', 'sure', 'totally', 'definitely', 'obviously'];
      const hasSarcasm = sarcasmIndicators.some(indicator => 
        combinedText.includes(indicator)
      );
      if (hasSarcasm) score += 15;
      else score -= 10; // Sarcastic tone but no sarcastic content
    }

    // Context relevance - does meme relate to the conversation?
    const contextWords = this.extractKeyWords(tweetLower + ' ' + replyLower);
    const memeWords = this.extractKeyWords(combinedText);
    const relevanceScore = this.calculateWordOverlap(contextWords, memeWords);
    score += relevanceScore * 20; // Up to 20 points for relevance

    // Check for overused/generic phrases
    const genericPhrases = [
      'this is good', 'i agree', 'makes sense', 'interesting', 'cool',
      'nice', 'awesome', 'great', 'ok', 'yes', 'no'
    ];
    const hasGeneric = genericPhrases.some(phrase => combinedText.includes(phrase));
    if (hasGeneric) score -= 15;

    // Technical humor bonus for tech contexts
    if (this.isTechContext(tweetLower + ' ' + replyLower)) {
      const techHumor = [
        'works on my machine', 'have you tried turning it off',
        'its not a bug its a feature', '404', 'null pointer',
        'stack overflow', 'merge conflict', 'production'
      ];
      const hasTechHumor = techHumor.some(tech => combinedText.includes(tech));
      if (hasTechHumor) score += 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score how well the meme fits the conversation context
   */
  private static scoreContextualFit(content: MemeContent): number {
    let score = 60; // Start above neutral

    const tweetLower = content.originalTweet.toLowerCase();
    const replyLower = content.reply.toLowerCase();
    const combinedText = content.memeTexts.join(' ').toLowerCase();

    // Topic alignment
    const topicScore = this.scoreTopicAlignment(
      tweetLower + ' ' + replyLower,
      combinedText
    );
    score += topicScore * 25; // Up to 25 points

    // Emotional alignment with tone
    const emotionScore = this.scoreEmotionalAlignment(content.tone, combinedText);
    score += emotionScore * 15; // Up to 15 points

    // Template appropriateness for context
    const templateScore = this.scoreTemplateAppropriatenesss(
      content.templateName,
      content.tone,
      tweetLower + ' ' + replyLower
    );
    score += templateScore * 10; // Up to 10 points

    // Check if meme adds value or just restates
    if (this.isJustRestatement(replyLower, combinedText)) {
      score -= 20;
    }

    // Check for context-specific keywords
    const contextKeywords = this.extractKeyWords(tweetLower + ' ' + replyLower);
    const memeKeywords = this.extractKeyWords(combinedText);
    const keywordOverlap = this.calculateWordOverlap(contextKeywords, memeKeywords);
    
    if (keywordOverlap > 0.3) score += 10; // Good keyword overlap
    if (keywordOverlap < 0.1) score -= 15; // Poor keyword overlap

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score readability and visual appeal
   */
  private static scoreReadability(memeTexts: string[]): number {
    let score = 80; // Start high

    for (const text of memeTexts) {
      // Text length
      if (text.length > 60) score -= 10;
      if (text.length < 5) score -= 10;

      // Word count
      const wordCount = text.split(/\s+/).length;
      if (wordCount > 8) score -= 8;
      if (wordCount < 2) score -= 5;

      // Complexity indicators
      if (text.includes('"') || text.includes("'")) score -= 3;
      if (text.includes('...')) score -= 5;
      if (/[!?]{2,}/.test(text)) score -= 5;
      if (text.includes(',') && text.split(',').length > 2) score -= 5;

      // Readability bonuses
      if (/^[a-zA-Z0-9\s!?,.]+$/.test(text)) score += 5; // Simple characters
      if (text.split(' ').every(word => word.length <= 10)) score += 5; // Short words
    }

    // Multi-text consistency
    if (memeTexts.length > 1) {
      const lengths = memeTexts.map(t => t.length);
      const maxLength = Math.max(...lengths);
      const minLength = Math.min(...lengths);
      
      // Penalize very uneven text lengths
      if (maxLength > minLength * 3) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score adherence to meme format conventions
   */
  private static scoreMemeFormat(content: MemeContent): number {
    let score = 70; // Start above neutral

    const templateName = content.templateName.toLowerCase();
    const memeTexts = content.memeTexts;
    const combinedText = memeTexts.join(' ').toLowerCase();

    // Template-specific format checks
    if (templateName.includes('drake')) {
      if (memeTexts.length === 2) {
        score += 15;
        // Check for contrast
        const similarity = this.calculateTextSimilarity(memeTexts[0], memeTexts[1]);
        if (similarity < 0.3) score += 10; // Good contrast
        else score -= 10; // Poor contrast
      } else {
        score -= 20;
      }
    }

    if (templateName.includes('expanding brain')) {
      if (memeTexts.length === 4) {
        score += 15;
        // Check for progression
        const hasProgression = this.hasLogicalProgression(memeTexts);
        if (hasProgression) score += 15;
        else score -= 10;
      } else {
        score -= 20;
      }
    }

    if (templateName.includes('one does not simply')) {
      if (combinedText.includes('not') || combinedText.includes('never')) {
        score += 20; // Correct negative format
      } else {
        score -= 15; // Wrong format
      }
    }

    // General meme language bonuses
    const memeWords = [
      'such', 'much', 'very', 'wow', 'doge', 'sus', 'based',
      'cringe', 'cap', 'bet', 'facts', 'mood', 'vibe', 'energy'
    ];
    const hasMemeLanguage = memeWords.some(word => combinedText.includes(word));
    if (hasMemeLanguage) score += 10;

    // Common meme phrases
    const memePhases = [
      'this is fine', 'plot twist', 'task failed successfully',
      'big brain time', 'galaxy brain', 'confused stonks'
    ];
    const hasMemePhrases = memePhases.some(phrase => combinedText.includes(phrase));
    if (hasMemePhrases) score += 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score potential for engagement
   */
  private static scoreEngagementPotential(content: MemeContent): number {
    let score = 60;

    const combinedText = content.memeTexts.join(' ').toLowerCase();
    const conversationText = (content.originalTweet + ' ' + content.reply).toLowerCase();

    // Relatability factors
    const relatableTopics = [
      'work', 'coding', 'programming', 'bug', 'deadline', 'meeting',
      'monday', 'friday', 'coffee', 'food', 'sleep', 'procrastination'
    ];
    const hasRelatableTopic = relatableTopics.some(topic => 
      conversationText.includes(topic) || combinedText.includes(topic)
    );
    if (hasRelatableTopic) score += 15;

    // Trending/current topics bonus
    const trendingTerms = [
      'ai', 'chatgpt', 'machine learning', 'crypto', 'nft',
      'remote work', 'wfh', 'zoom', 'covid', 'inflation'
    ];
    const hasTrending = trendingTerms.some(term => 
      conversationText.includes(term) || combinedText.includes(term)
    );
    if (hasTrending) score += 10;

    // Shareability factors
    if (combinedText.length < 50 && combinedText.split(' ').length <= 6) {
      score += 10; // Short and punchy = more shareable
    }

    // Universal vs niche appeal
    const nicheTerms = [
      'kubernetes', 'blockchain', 'serverless', 'microservices',
      'tensor', 'neural network', 'gradient descent'
    ];
    const hasNiche = nicheTerms.some(term => 
      conversationText.includes(term) || combinedText.includes(term)
    );
    if (hasNiche) score -= 5; // Slightly less universal appeal

    // Emotional engagement
    const emotionalWords = [
      'love', 'hate', 'amazing', 'terrible', 'excited', 'frustrated',
      'happy', 'sad', 'angry', 'confused', 'surprised'
    ];
    const hasEmotion = emotionalWords.some(word => 
      combinedText.includes(word)
    );
    if (hasEmotion) score += 8;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate feedback based on scores
   */
  private static generateFeedback(content: MemeContent, breakdown: any): {
    issues: string[];
    strengths: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const strengths: string[] = [];
    const suggestions: string[] = [];

    // Humor relevance feedback
    if (breakdown.humorRelevance < 40) {
      issues.push('Low humor relevance to context');
      suggestions.push('Try using humor patterns that relate more to the conversation topic');
    } else if (breakdown.humorRelevance > 70) {
      strengths.push('Good humor relevance');
    }

    // Contextual fit feedback
    if (breakdown.contextualFit < 50) {
      issues.push('Meme doesn\'t fit the conversation context well');
      suggestions.push('Ensure meme text references the actual topic being discussed');
    } else if (breakdown.contextualFit > 75) {
      strengths.push('Excellent contextual fit');
    }

    // Readability feedback
    if (breakdown.readability < 60) {
      issues.push('Poor readability');
      suggestions.push('Use shorter, simpler text that\'s easy to read at a glance');
    } else if (breakdown.readability > 80) {
      strengths.push('Great readability');
    }

    // Format feedback
    if (breakdown.memeFormat < 50) {
      issues.push('Doesn\'t follow meme format conventions');
      suggestions.push(`Ensure text fits the ${content.templateName} template format`);
    } else if (breakdown.memeFormat > 75) {
      strengths.push('Follows meme format well');
    }

    // Engagement feedback
    if (breakdown.engagement < 50) {
      suggestions.push('Consider more relatable or trending topics for better engagement');
    } else if (breakdown.engagement > 70) {
      strengths.push('High engagement potential');
    }

    // Overall suggestions
    if (content.memeTexts.some(text => text.length > 50)) {
      suggestions.push('Shorten text for better visual impact');
    }

    if (content.tone === 'professional' && breakdown.humorRelevance > 80) {
      suggestions.push('Consider toning down humor for professional context');
    }

    return { issues, strengths, suggestions };
  }

  // Helper methods
  private static extractKeyWords(text: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'];
    
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 10); // Top 10 keywords
  }

  private static calculateWordOverlap(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  private static isTechContext(text: string): boolean {
    const techKeywords = [
      'code', 'programming', 'developer', 'software', 'app', 'website',
      'api', 'database', 'server', 'cloud', 'ai', 'machine learning',
      'algorithm', 'debug', 'git', 'javascript', 'python', 'react'
    ];
    return techKeywords.some(keyword => text.includes(keyword));
  }

  private static scoreTopicAlignment(contextText: string, memeText: string): number {
    const contextKeywords = this.extractKeyWords(contextText);
    const memeKeywords = this.extractKeyWords(memeText);
    return this.calculateWordOverlap(contextKeywords, memeKeywords);
  }

  private static scoreEmotionalAlignment(tone: string, memeText: string): number {
    const emotionalMappings: Record<string, string[]> = {
      sarcastic: ['sure', 'totally', 'obviously', 'definitely', 'fine', 'great'],
      humorous: ['funny', 'lol', 'haha', 'joke', 'laugh', 'hilarious'],
      professional: ['efficient', 'optimize', 'best practice', 'solution', 'strategy'],
      supportive: ['help', 'support', 'encourage', 'positive', 'good', 'great'],
      empathetic: ['understand', 'feel', 'difficult', 'challenging', 'tough']
    };

    const expectedWords = emotionalMappings[tone] || [];
    const hasExpectedEmotion = expectedWords.some(word => memeText.includes(word));
    
    return hasExpectedEmotion ? 1 : 0.3;
  }

  private static scoreTemplateAppropriatenesss(templateName: string, tone: string, contextText: string): number {
    // Simple heuristic for template appropriateness
    const templateLower = templateName.toLowerCase();
    
    if (templateLower.includes('drake') && (tone === 'professional' || contextText.includes('vs') || contextText.includes('better'))) {
      return 1;
    }
    
    if (templateLower.includes('this is fine') && (tone === 'sarcastic' || contextText.includes('problem') || contextText.includes('bug'))) {
      return 1;
    }
    
    if (templateLower.includes('success') && (tone === 'supportive' || contextText.includes('work') || contextText.includes('achieve'))) {
      return 1;
    }
    
    return 0.5; // Neutral if no specific match
  }

  private static isJustRestatement(replyText: string, memeText: string): boolean {
    const replyWords = this.extractKeyWords(replyText);
    const memeWords = this.extractKeyWords(memeText);
    const overlap = this.calculateWordOverlap(replyWords, memeWords);
    
    return overlap > 0.8; // High overlap suggests restatement
  }

  private static hasLogicalProgression(texts: string[]): boolean {
    // Simple heuristic: check if texts seem to build on each other
    // Look for progression indicators
    const progressionIndicators = [
      ['basic', 'simple', 'normal', 'regular'],
      ['better', 'good', 'advanced', 'improved'],
      ['best', 'expert', 'master', 'pro'],
      ['ultimate', 'god', 'transcendent', 'galaxy']
    ];
    
    let progressionScore = 0;
    for (let i = 0; i < texts.length - 1; i++) {
      const currentText = texts[i].toLowerCase();
      const nextText = texts[i + 1].toLowerCase();
      
      // Check if progression from simple to complex
      for (let level = 0; level < progressionIndicators.length - 1; level++) {
        const currentLevelWords = progressionIndicators[level];
        const nextLevelWords = progressionIndicators[level + 1];
        
        const hasCurrentLevel = currentLevelWords.some(word => currentText.includes(word));
        const hasNextLevel = nextLevelWords.some(word => nextText.includes(word));
        
        if (hasCurrentLevel && hasNextLevel) {
          progressionScore++;
        }
      }
    }
    
    return progressionScore > 0;
  }

  /**
   * Quick quality check - returns true if meme meets minimum standards
   */
  static meetsMinimumQuality(content: MemeContent): boolean {
    const score = this.assessQuality(content);
    return score.overall >= 60 && score.breakdown.contextualFit >= 50;
  }

  /**
   * Get improvement suggestions for low-scoring memes
   */
  static getImprovementSuggestions(content: MemeContent): string[] {
    const assessment = this.assessQuality(content);
    
    if (assessment.overall >= 70) {
      return ['Meme quality is good!'];
    }
    
    return assessment.suggestions;
  }
}