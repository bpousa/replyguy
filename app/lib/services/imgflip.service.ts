interface ImgflipMeme {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  box_count: number;
}

interface AutomemeResponse {
  success: boolean;
  data?: {
    url: string;
    page_url: string;
  };
  error_message?: string;
}

interface CaptionImageResponse {
  success: boolean;
  data?: {
    url: string;
    page_url: string;
  };
  error_message?: string;
}

interface GetMemesResponse {
  success: boolean;
  data?: {
    memes: ImgflipMeme[];
  };
  error_message?: string;
}

export class ImgflipService {
  private readonly baseUrl = 'https://api.imgflip.com';
  
  // Lazy load environment variables to ensure they're available at runtime
  private getUsername(): string | undefined {
    // Trim any whitespace that might have been added in env vars
    return process.env.IMGFLIP_USERNAME?.trim();
  }
  
  private getPassword(): string | undefined {
    // Trim any whitespace that might have been added in env vars
    return process.env.IMGFLIP_PASSWORD?.trim();
  }

  /**
   * Generate a meme using Imgflip's automeme feature
   * Automatically selects the best meme template based on the text
   */
  async generateAutomeme(text: string, removeWatermark: boolean = true): Promise<{
    url: string;
    pageUrl: string;
  }> {
    const startTime = Date.now();
    console.log('[ImgflipService] 🎨 generateAutomeme called');
    console.log('[ImgflipService] 📝 Text:', text);
    console.log('[ImgflipService] 📏 Text length:', text.length);
    console.log('[ImgflipService] 🚫 Remove watermark:', removeWatermark);
    
    try {
      const username = this.getUsername();
      const password = this.getPassword();
      
      // Debug credential issues
      console.log('[ImgflipService] 🔐 Credential check:');
      console.log('  Username:', username ? `"${username}" (${username.length} chars)` : 'NOT SET');
      console.log('  Password:', password ? `SET (${password.length} chars)` : 'NOT SET');
      
      if (username === 'mikeappendment' && password === 'Fun4Life') {
        console.log('[ImgflipService] ✅ Credentials match expected values');
      } else {
        console.log('[ImgflipService] ⚠️ Credentials may be incorrect');
        if (username !== 'mikeappendment') {
          console.log('  Username issue - expected: mikeappendment (14 chars)');
          console.log('  Username actual:', username ? `${username} (${username.length} chars)` : 'undefined');
        }
        if (password !== 'Fun4Life') {
          console.log('  Password issue - expected: Fun4Life (8 chars)');
          console.log('  Password actual length:', password?.length || 0);
        }
      }
      
      const requestBody = new URLSearchParams({
        username: username || '',
        password: password || '',
        text: text,
        no_watermark: removeWatermark ? '1' : '0',
      });
      
      console.log('[ImgflipService] 📤 Request URL:', `${this.baseUrl}/automeme`);
      console.log('[ImgflipService] 📤 URLSearchParams string:', requestBody.toString());
      
      const response = await fetch(`${this.baseUrl}/automeme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
      });

      console.log('[ImgflipService] 📡 Response status:', response.status);
      console.log('[ImgflipService] 📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      let data: AutomemeResponse;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[ImgflipService] ❌ Failed to parse response as JSON:', responseText);
        throw new Error(`Invalid response from Imgflip API: ${responseText}`);
      }
      
      console.log('[ImgflipService] 📥 Response data:', JSON.stringify(data, null, 2));

      if (!data.success) {
        console.error('[ImgflipService] ❌ Imgflip API returned error:', data.error_message);
        console.error('[ImgflipService] Full error response:', JSON.stringify(data, null, 2));
        
        // If no meme was predicted, provide a more helpful error
        if (data.error_message?.includes('No meme was predicted')) {
          console.error('[ImgflipService] ❌ No meme template matched the text');
          throw new Error('Could not find a suitable meme template for this text. Try a more meme-worthy phrase!');
        }
        throw new Error(data.error_message || 'Failed to generate meme');
      }

      const responseTime = Date.now() - startTime;
      console.log(`[ImgflipService] ✅ Meme generated successfully in ${responseTime}ms`);
      console.log('[ImgflipService] 🖼️ Meme URL:', data.data!.url);
      console.log('[ImgflipService] 🔗 Page URL:', data.data!.page_url);

      return {
        url: data.data!.url,
        pageUrl: data.data!.page_url,
      };
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`[ImgflipService] ❌ Error after ${errorTime}ms:`, {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        text: text
      });
      throw error;
    }
  }

  /**
   * Get popular meme templates
   * Returns ~100 most popular meme templates
   */
  async getPopularMemes(): Promise<ImgflipMeme[]> {
    try {
      const response = await fetch(`${this.baseUrl}/get_memes`);
      const data: GetMemesResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error_message || 'Failed to fetch memes');
      }

      return data.data!.memes;
    } catch (error) {
      console.error('Failed to fetch popular memes:', error);
      return [];
    }
  }

  /**
   * Caption a specific meme template
   * For when you want to use a specific template
   */
  async captionImage(
    templateId: string,
    topText: string,
    bottomText: string = '',
    removeWatermark: boolean = true,
    boxCount?: number
  ): Promise<{
    url: string;
    pageUrl: string;
  }> {
    try {
      // If we know the box count and it's more than 2, we need to use the boxes array format
      if (boxCount && boxCount > 2) {
        // For multi-box memes, split the text appropriately
        const texts = this.splitTextForBoxes(topText, bottomText, boxCount);
        return this.captionImageWithBoxes(templateId, texts, removeWatermark);
      }
      
      // For 2-box memes, use the simple format
      const response = await fetch(`${this.baseUrl}/caption_image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: this.getUsername() || '',
          password: this.getPassword() || '',
          template_id: templateId,
          text0: topText,
          text1: bottomText,
          no_watermark: removeWatermark ? '1' : '0',
        }),
      });

      const data: CaptionImageResponse = await response.json();

      if (!data.success) {
        console.error('Imgflip caption error:', data.error_message);
        throw new Error(data.error_message || 'Failed to caption image');
      }

      return {
        url: data.data!.url,
        pageUrl: data.data!.page_url,
      };
    } catch (error) {
      console.error('Imgflip caption error:', error);
      throw error;
    }
  }

  /**
   * Caption a meme template with multiple text boxes
   * Uses the boxes[] array format for templates with more than 2 boxes
   */
  async captionImageWithBoxes(
    templateId: string,
    texts: string[],
    removeWatermark: boolean = true
  ): Promise<{
    url: string;
    pageUrl: string;
  }> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', this.getUsername() || '');
      formData.append('password', this.getPassword() || '');
      formData.append('template_id', templateId);
      formData.append('no_watermark', removeWatermark ? '1' : '0');
      
      // Add each text box
      texts.forEach((text, index) => {
        formData.append(`boxes[${index}][text]`, text);
      });
      
      console.log('[ImgflipService] Creating multi-box meme with', texts.length, 'text boxes');
      
      const response = await fetch(`${this.baseUrl}/caption_image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data: CaptionImageResponse = await response.json();

      if (!data.success) {
        console.error('Imgflip multi-box caption error:', data.error_message);
        throw new Error(data.error_message || 'Failed to caption image with boxes');
      }

      return {
        url: data.data!.url,
        pageUrl: data.data!.page_url,
      };
    } catch (error) {
      console.error('Imgflip multi-box caption error:', error);
      throw error;
    }
  }

  /**
   * Split text appropriately for multi-box memes
   * Handles different box counts intelligently
   */
  private splitTextForBoxes(topText: string, bottomText: string, boxCount: number): string[] {
    // Common patterns for different box counts
    if (boxCount === 3) {
      // For 3-box memes, often it's: setup, middle, punchline
      const combined = topText + (bottomText ? ' ' + bottomText : '');
      const words = combined.split(' ');
      const third = Math.ceil(words.length / 3);
      
      return [
        words.slice(0, third).join(' '),
        words.slice(third, third * 2).join(' '),
        words.slice(third * 2).join(' ')
      ].filter(text => text.length > 0);
    } else if (boxCount === 4) {
      // For 4-box memes (like expanding brain), progressive thoughts
      const combined = topText + (bottomText ? ' ' + bottomText : '');
      const parts = combined.split(/[,;.]/).map(p => p.trim()).filter(p => p.length > 0);
      
      if (parts.length >= 4) {
        return parts.slice(0, 4);
      } else if (parts.length === 3) {
        return [...parts, parts[parts.length - 1] + '!!!'];
      } else if (parts.length === 2) {
        return [parts[0], parts[0] + '?', parts[1], parts[1] + '!!!'];
      } else {
        // Split single text into 4 progressive parts
        const words = combined.split(' ');
        const quarter = Math.ceil(words.length / 4);
        return [
          words.slice(0, quarter).join(' '),
          words.slice(quarter, quarter * 2).join(' '),
          words.slice(quarter * 2, quarter * 3).join(' '),
          words.slice(quarter * 3).join(' ')
        ].filter(text => text.length > 0);
      }
    } else {
      // For other box counts, distribute evenly
      const combined = topText + (bottomText ? ' ' + bottomText : '');
      const words = combined.split(' ');
      const wordsPerBox = Math.ceil(words.length / boxCount);
      
      const texts: string[] = [];
      for (let i = 0; i < boxCount; i++) {
        const start = i * wordsPerBox;
        const end = Math.min(start + wordsPerBox, words.length);
        const text = words.slice(start, end).join(' ');
        if (text) texts.push(text);
      }
      
      // Pad with empty strings if needed
      while (texts.length < boxCount) {
        texts.push('');
      }
      
      return texts;
    }
  }

  /**
   * Check if meme generation is available (API credentials configured)
   */
  isConfigured(): boolean {
    const username = this.getUsername();
    const password = this.getPassword();
    const configured = !!(username && password);
    
    // Debug logging to help diagnose issues
    if (!configured) {
      console.log('[ImgflipService] Not configured - missing credentials');
      console.log('[ImgflipService] Username available:', !!username);
      console.log('[ImgflipService] Password available:', !!password);
    }
    
    return configured;
  }
}

// Export singleton instance
export const imgflipService = new ImgflipService();