import { createHash } from 'crypto';

interface CacheEntry {
  searchResults: string;
  searchQuery: string;
  cost: number;
  timestamp: number;
  expiresAt: number;
}

class ResearchCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Generate a cache key based on the research parameters
   */
  private generateCacheKey(params: {
    originalTweet: string;
    responseIdea: string; 
    responseType: string;
    guidance?: string;
  }): string {
    const content = JSON.stringify({
      tweet: params.originalTweet.toLowerCase().trim(),
      idea: params.responseIdea.toLowerCase().trim(),
      type: params.responseType,
      guidance: params.guidance?.toLowerCase().trim() || ''
    });
    
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get cached research results if available and not expired
   */
  get(params: {
    originalTweet: string;
    responseIdea: string;
    responseType: string;
    guidance?: string;
  }): CacheEntry | null {
    const key = this.generateCacheKey(params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      console.log('🗑️ Cache entry expired and removed:', key);
      return null;
    }
    
    console.log('✅ Cache hit for research query:', key);
    return entry;
  }

  /**
   * Store research results in cache
   */
  set(
    params: {
      originalTweet: string;
      responseIdea: string;
      responseType: string;
      guidance?: string;
    },
    results: {
      searchResults: string;
      searchQuery: string;
      cost: number;
    }
  ): void {
    const key = this.generateCacheKey(params);
    const now = Date.now();
    
    const entry: CacheEntry = {
      ...results,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    };
    
    this.cache.set(key, entry);
    console.log('💾 Cached research results:', key, 'expires in', this.CACHE_DURATION / 1000 / 60, 'minutes');
    
    // Clean up expired entries periodically
    this.cleanup();
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log('🧹 Cleaned up', removedCount, 'expired cache entries');
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (now <= entry.expiresAt) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Research cache cleared');
  }
}

// Export singleton instance
export const researchCache = new ResearchCacheService();