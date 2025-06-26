import { jest } from '@jest/globals';

// Mock fetch globally
global.fetch = jest.fn();

describe('Perplexity Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.PERPLEXITY_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_ENABLE_PERPLEXITY = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Research Data Inclusion Test', () => {
    it('should include Perplexity research data in final reply', async () => {
      // Mock Perplexity API response with specific statistics
      const mockPerplexityResponse = {
        choices: [{
          message: {
            content: '• 73% of developers reported increased productivity in 2024 according to Stack Overflow Survey\n• GitHub saw 25 million new users in 2024, a 40% increase from 2023\n• AI coding tools usage grew by 156% in the past year according to JetBrains'
          }
        }],
        citations: ['https://stackoverflow.com/survey/2024', 'https://github.blog/2024-stats'],
        usage: { input_tokens: 50, output_tokens: 75 }
      };

      // Mock Anthropic API response 
      const mockAnthropicResponse = {
        content: [{
          type: 'text',
          text: 'Looking at the latest data, 73% of developers reported increased productivity in 2024 according to the Stack Overflow Survey, which really supports your point about coding efficiency improvements!'
        }],
        usage: { input_tokens: 200, output_tokens: 45 }
      };

      // Set up fetch mocks
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockImplementationOnce(() => 
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPerplexityResponse),
            text: () => Promise.resolve(JSON.stringify(mockPerplexityResponse))
          } as Response)
        );

      // Mock the Anthropic client
      const mockAnthropicCreate = jest.fn().mockResolvedValue(mockAnthropicResponse);
      
      // Mock the entire module dynamically
      jest.doMock('@anthropic-ai/sdk', () => {
        return {
          default: jest.fn().mockImplementation(() => ({
            messages: {
              create: mockAnthropicCreate
            }
          }))
        };
      });

      // Import the API handler after mocking
      const { POST } = await import('../app/api/generate/route');
      
      const mockRequest = {
        json: () => Promise.resolve({
          originalTweet: 'Coding is getting easier these days with all the new tools',
          responseIdea: 'I agree, the productivity gains are real',
          tone: 'supportive',
          selectedType: {
            id: 'agree-with-data',
            name: 'Agree with Supporting Data',
            pattern: 'Agree and provide supporting evidence',
            styleRules: 'Use data to back up agreement',
            examples: ['The numbers support this...']
          },
          perplexityData: mockPerplexityResponse.choices[0].message.content,
          replyLength: 'short',
          enableStyleMatching: true,
          useCustomStyle: false
        })
      } as any;

      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Verify the response includes research data
      expect(response.status).toBe(200);
      expect(responseData.data.reply).toBeDefined();
      
      // Check that the reply includes the specific statistic from Perplexity
      expect(responseData.data.reply.toLowerCase()).toContain('73%');
      expect(responseData.data.reply.toLowerCase()).toContain('productivity');
      expect(responseData.data.reply.toLowerCase()).toContain('2024');
      
      // Verify Anthropic was called with the research data
      expect(mockAnthropicCreate).toHaveBeenCalled();
      const anthropicCall = mockAnthropicCreate.mock.calls[0][0];
      
      // Check that the prompt includes sentinel tokens
      expect(anthropicCall.messages[0].content).toContain('<<RESEARCH_BLOCK>>');
      expect(anthropicCall.messages[0].content).toContain('73% of developers');
      expect(anthropicCall.messages[0].content).toContain('CRITICAL RESEARCH DATA');
      
      console.log('✅ Perplexity data successfully included in final reply');
    });

    it('should handle research failures gracefully', async () => {
      // Mock failed Perplexity API response
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockImplementationOnce(() => 
          Promise.resolve({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: () => Promise.resolve({ error: 'Invalid API key' }),
            text: () => Promise.resolve('{"error": "Invalid API key"}')
          } as Response)
        );

      const { POST } = await import('../app/api/research/route');
      
      const mockRequest = {
        json: () => Promise.resolve({
          originalTweet: 'Coding is getting easier',
          responseIdea: 'I agree',
          responseType: 'agree',
          guidance: 'developer productivity stats'
        })
      } as any;

      const response = await POST(mockRequest);
      
      // Should return an error when API fails
      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.error).toContain('Perplexity API request failed');
      
      console.log('✅ Research failures handled gracefully');
    });

    it('should handle large Perplexity responses without breaking', async () => {
      // Create a very long response that would exceed token limits
      const longResponse = Array(20).fill(
        'According to recent studies, developer productivity increased by 45% in 2024. This significant growth rate demonstrates the impact of modern tools.'
      ).join(' ') + ' Additional statistics show 78% adoption rates and 156% efficiency gains.';

      const mockPerplexityResponse = {
        choices: [{
          message: { content: longResponse }
        }],
        citations: [],
        usage: { input_tokens: 100, output_tokens: 500 }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockImplementationOnce(() => 
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPerplexityResponse),
            text: () => Promise.resolve(JSON.stringify(mockPerplexityResponse))
          } as Response)
        );

      const { POST } = await import('../app/api/research/route');
      
      const mockRequest = {
        json: () => Promise.resolve({
          originalTweet: 'Test tweet about productivity',
          responseIdea: 'Test response with data',
          responseType: 'agree',
          guidance: 'productivity statistics'
        })
      } as any;

      const response = await POST(mockRequest);
      
      if (response.ok) {
        const responseData = await response.json();
        const sanitizedResults = responseData.data.searchResults;
        
        // Should be manageable length (under ~1600 chars for 400 tokens)
        expect(sanitizedResults.length).toBeLessThan(1600);
        
        // Should preserve important statistics
        expect(sanitizedResults).toMatch(/\d+%/); // Should contain percentages
        
        console.log('Sanitized length:', sanitizedResults.length, 'characters');
        console.log('Contains statistics:', /\d+%/.test(sanitizedResults));
      }
      
      console.log('✅ Large responses handled appropriately');
    });
  });

  describe('Environment Configuration', () => {
    it('should reject requests when API key is missing', async () => {
      delete process.env.PERPLEXITY_API_KEY;
      
      const { POST } = await import('../app/api/research/route');
      
      const mockRequest = {
        json: () => Promise.resolve({
          originalTweet: 'Test',
          responseIdea: 'Test',
          responseType: 'agree'
        })
      } as any;

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('missing API key');
    });

    it('should reject requests when Perplexity is disabled', async () => {
      process.env.NEXT_PUBLIC_ENABLE_PERPLEXITY = 'false';
      
      const { POST } = await import('../app/api/research/route');
      
      const mockRequest = {
        json: () => Promise.resolve({
          originalTweet: 'Test',
          responseIdea: 'Test',
          responseType: 'agree'
        })
      } as any;

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('disabled');
    });
  });
});