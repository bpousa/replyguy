/**
 * Meme Template Tracker Service
 * Ensures diversity in meme template selection by tracking recent usage
 */

interface TemplateUsage {
  templateId: string;
  templateName: string;
  lastUsed: Date;
  useCount: number;
}

class MemeTemplateTracker {
  private userTemplateHistory = new Map<string, TemplateUsage[]>();
  private globalTemplateUsage = new Map<string, number>();
  private readonly MAX_HISTORY_PER_USER = 20;
  private readonly TEMPLATE_COOLDOWN_USES = 5; // Don't reuse same template for at least 5 memes
  
  /**
   * Record template usage
   */
  recordUsage(userId: string, templateId: string, templateName: string): void {
    const userKey = userId || 'anonymous';
    
    // Update user history
    let userHistory = this.userTemplateHistory.get(userKey) || [];
    const existingIndex = userHistory.findIndex(t => t.templateId === templateId);
    
    if (existingIndex >= 0) {
      // Update existing entry
      userHistory[existingIndex].lastUsed = new Date();
      userHistory[existingIndex].useCount++;
    } else {
      // Add new entry
      userHistory.push({
        templateId,
        templateName,
        lastUsed: new Date(),
        useCount: 1
      });
    }
    
    // Keep only recent history
    userHistory = userHistory
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, this.MAX_HISTORY_PER_USER);
    
    this.userTemplateHistory.set(userKey, userHistory);
    
    // Update global usage
    this.globalTemplateUsage.set(
      templateId, 
      (this.globalTemplateUsage.get(templateId) || 0) + 1
    );
  }
  
  /**
   * Get recently used template IDs to avoid
   */
  getRecentTemplateIds(userId: string): Set<string> {
    const userKey = userId || 'anonymous';
    const userHistory = this.userTemplateHistory.get(userKey) || [];
    
    // Get templates used in last N memes
    const recentTemplates = userHistory
      .slice(0, this.TEMPLATE_COOLDOWN_USES)
      .map(t => t.templateId);
    
    return new Set(recentTemplates);
  }
  
  /**
   * Score templates by diversity (higher score = more diverse choice)
   */
  scoreTemplatesByDiversity(
    templates: Array<{ id: string; name: string }>,
    userId: string
  ): Array<{ template: { id: string; name: string }; score: number }> {
    const userKey = userId || 'anonymous';
    const userHistory = this.userTemplateHistory.get(userKey) || [];
    const recentIds = this.getRecentTemplateIds(userId);
    
    return templates.map(template => {
      let score = 100; // Base score
      
      // Heavily penalize recently used templates
      if (recentIds.has(template.id)) {
        score -= 80;
      }
      
      // Penalize based on user's total usage
      const userUsage = userHistory.find(t => t.templateId === template.id);
      if (userUsage) {
        score -= Math.min(userUsage.useCount * 5, 30);
      }
      
      // Slightly penalize globally overused templates
      const globalUsage = this.globalTemplateUsage.get(template.id) || 0;
      score -= Math.min(globalUsage * 0.5, 10);
      
      // Add randomness for variety
      score += Math.random() * 20;
      
      return { template, score };
    });
  }
  
  /**
   * Get template usage statistics
   */
  getUsageStats(userId?: string): {
    userStats?: TemplateUsage[];
    globalStats: Array<{ templateId: string; useCount: number }>;
  } {
    const userStats = userId ? this.userTemplateHistory.get(userId) : undefined;
    
    const globalStats = Array.from(this.globalTemplateUsage.entries())
      .map(([templateId, useCount]) => ({ templateId, useCount }))
      .sort((a, b) => b.useCount - a.useCount);
    
    return { userStats, globalStats };
  }
  
  /**
   * Clear old history (cleanup)
   */
  cleanup(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Clean user histories
    for (const [userId, history] of this.userTemplateHistory.entries()) {
      const recentHistory = history.filter(
        t => t.lastUsed > oneDayAgo
      );
      
      if (recentHistory.length === 0) {
        this.userTemplateHistory.delete(userId);
      } else {
        this.userTemplateHistory.set(userId, recentHistory);
      }
    }
  }
}

// Export singleton instance
export const memeTemplateTracker = new MemeTemplateTracker();