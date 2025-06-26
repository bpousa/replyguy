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
  private readonly username = process.env.IMGFLIP_USERNAME!;
  private readonly password = process.env.IMGFLIP_PASSWORD!;

  /**
   * Generate a meme using Imgflip's automeme feature
   * Automatically selects the best meme template based on the text
   */
  async generateAutomeme(text: string, removeWatermark: boolean = true): Promise<{
    url: string;
    pageUrl: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/automeme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: this.username,
          password: this.password,
          text: text,
          no_watermark: removeWatermark ? '1' : '0',
        }),
      });

      const data: AutomemeResponse = await response.json();

      if (!data.success) {
        console.error('Imgflip automeme error:', data.error_message);
        // If no meme was predicted, provide a more helpful error
        if (data.error_message?.includes('No meme was predicted')) {
          throw new Error('Could not find a suitable meme template for this text. Try a more meme-worthy phrase!');
        }
        throw new Error(data.error_message || 'Failed to generate meme');
      }

      return {
        url: data.data!.url,
        pageUrl: data.data!.page_url,
      };
    } catch (error) {
      console.error('Imgflip service error:', error);
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
          username: this.username,
          password: this.password,
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
    return !!(this.username && this.password);
  }
}

// Export singleton instance
export const imgflipService = new ImgflipService();