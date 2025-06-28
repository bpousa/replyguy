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
    return process.env.IMGFLIP_USERNAME;
  }
  
  private getPassword(): string | undefined {
    return process.env.IMGFLIP_PASSWORD;
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
      const requestBody = new URLSearchParams({
        username: this.getUsername() || '',
        password: this.getPassword() || '',
        text: text,
        no_watermark: removeWatermark ? '1' : '0',
      });
      
      console.log('[ImgflipService] 📤 Request URL:', `${this.baseUrl}/automeme`);
      console.log('[ImgflipService] 📤 Request body params:', {
        username: this.getUsername() ? '***' : '(empty)',
        password: this.getPassword() ? '***' : '(empty)',
        text: text,
        no_watermark: removeWatermark ? '1' : '0'
      });
      
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
    removeWatermark: boolean = true
  ): Promise<{
    url: string;
    pageUrl: string;
  }> {
    try {
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