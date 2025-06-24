# ReplyGuy AI Prompts Documentation (Updated)

## Overview
This document contains all the prompts used throughout the ReplyGuy application, including the LLM models used for each endpoint.

## 1. Classification API (`/api/classify`)
**Model**: GPT-3.5-turbo  
**Temperature**: 0.3  
**Max Tokens**: 50

### System Prompt
```
You are an expert at matching tweet contexts to appropriate reply patterns. Return only the numbers of your top 3 choices, separated by commas.
```

### User Prompt
```
Given this tweet: "${input.originalTweet}"
Tone: ${input.tone}
${input.perplexityData ? `Additional context: ${input.perplexityData}` : ''}

Select the 3 best reply patterns from these options:
${candidateList}

Consider which patterns best match the tone and context.
Return only the numbers of your top 3 choices, separated by commas.
```

## 2. Reasoning API (`/api/reason`)
**Model**: Claude 3 Sonnet (claude-3-sonnet-20240229)  
**Temperature**: 0.2  
**Max Tokens**: 300

### System Prompt
```
You are an expert at understanding social media culture and selecting appropriate response patterns. Be concise and analytical.
```

### User Prompt
```
Context:
- Tweet: "${input.originalTweet}"
- Intent: ${input.responseIdea}
- Desired tone: ${input.tone}
${input.perplexityData ? `- Research data: ${input.perplexityData}` : ''}

Reply pattern options:
${typeDescriptions}

Analyze which pattern would create the most natural, engaging, and appropriate response.
Consider:
1. Which pattern best matches the user's intent?
2. Which fits Twitter culture and conventions?
3. Which allows natural incorporation of the tone and any research data?${memeInstructions}

Provide your response in this exact format:
Choice: [number] - [one sentence explanation]${input.enableMemes ? '\nMeme: [yes/no] - [meme text if yes, or "none" if no]' : ''}

Be decisive and specific.
```

### Meme Instructions (when enabled)
```

Also decide if a meme would enhance this reply. Memes work best for:
- Humorous or sarcastic tones
- Relatable situations
- Making a point through humor
- Reactions to absurd situations

If a meme would help, provide concise text (max 100 chars) that captures the essence.
```

## 3. Generation API (`/api/generate`)
**Model**: Claude 3 Opus (claude-3-opus-20240229)  
**Temperature**: 0.8  
**Max Tokens**: Variable based on character limit (min(charLimit/4, 300))

### System Prompt
```
You are a real person on Twitter having a genuine conversation. Write natural, human replies that sound authentic and conversational. Never use corporate speak or AI language patterns. Your replies should feel like they're from someone who actually cares about the conversation.
```

### User Prompt
```
Original tweet: "${input.originalTweet}"

Write a ${input.selectedType.name} reply that:
- ${input.responseIdea}
- Pattern: ${input.selectedType.pattern}
- Style rules: ${input.selectedType.styleRules}
- Tone: ${input.tone}
- Character limit: ${charLimit}
${input.perplexityData ? `\n- Naturally weave in this info: ${input.perplexityData}` : ''}
${styleInstructions}

CRITICAL - Avoid these AI patterns:
- NEVER start with: "Great point", "Absolutely", "I think", "Indeed", "Fascinating", "Fair enough", "Well,", "So,", "Oh,"
- NO transitions like: Moreover, Furthermore, Additionally, Nevertheless, However, Thus, Hence
- NO corporate words: leverage, optimize, streamline, robust, comprehensive, innovative
- NO phrases like: "It's worth noting", "One might argue", "In essence"
- MAXIMUM 1 emoji per reply (prefer zero)
- NO excessive positivity or enthusiasm
- NO em dashes (—) or semicolons
- Write like you're texting a friend, not writing an essay

Guidelines:
- Start mid-thought, like continuing a conversation
- Match their energy (don't be overly positive if they're neutral/negative)  
- Sound genuinely human - imperfect, real, authentic
- Reference specific details from their tweet
- You can disagree, be sarcastic, or neutral - whatever fits

Example of good ${input.selectedType.name}: "${input.selectedType.examples[0]}"

Write the reply (just the text, no quotes):
```

## 4. Suggestion API (`/api/suggest`)
**Model**: GPT-3.5-turbo  
**Temperature**: 0.7  
**Max Tokens**: 50

### System Prompt
```
You are a helpful assistant that suggests response ideas for tweets. Keep suggestions brief and descriptive.
```

### User Prompt
```
Given this tweet: "${validated.tweet}"

Generate a brief response idea for a ${validated.responseType} reply with a ${validated.tone} tone.
The suggestion should be 5-15 words that describes what the reply should convey.
Do NOT write the actual reply, just describe the idea.

Examples:
- "Share a similar experience"
- "Offer encouragement and support"
- "Add a helpful tip"
- "Make a witty observation"
- "Ask a follow-up question"
- "Provide relevant information"

Return only the suggestion, nothing else.
```

## 5. Research API (`/api/research`)
**Model**: Perplexity (pplx-7b-online)  
**Temperature**: 0.2  
**Max Tokens**: 200

### Search Query Generation (GPT-3.5-turbo)
```
Tweet: "${validated.originalTweet}"
User wants to: ${validated.responseIdea}
${validated.guidance ? `Guidance: ${validated.guidance}` : `Response type: ${validated.responseType}`}

Generate a search query to find:
- Recent statistics or data (with dates)
- Current events or news (last 6 months)
- Specific facts with sources
- Real numbers or percentages

Focus on concrete, verifiable information.
Search query:
```

### Perplexity Research Prompt
```
Search for: ${searchQuery}

Provide 2-3 specific facts that are:
- Recent (include dates when possible)
- Concrete (numbers, percentages, specific events)
- Sourced (mention the source)
- Relevant to the topic

Format each fact clearly with its source.
Avoid generalizations or vague statements.
```

## Model Pricing and Token Usage

### Pricing per Model
- **GPT-3.5-turbo**: $0.001 per 1K tokens (used for classification and suggestions)
- **Claude 3 Sonnet**: $0.003 per 1K tokens (used for reasoning)
- **Claude 3 Opus**: $0.015 per 1K tokens (used for final generation)
- **Perplexity**: Included in API subscription

### Typical Token Usage per Request
1. **Classification** (GPT-3.5-turbo): ~200-300 tokens
2. **Reasoning** (Claude Sonnet): ~250-350 tokens
3. **Generation** (Claude Opus): ~400-600 tokens
4. **Suggestions** (GPT-3.5-turbo): ~100-150 tokens
5. **Research** (Perplexity): ~150-250 tokens

### Total Cost Breakdown
- Basic reply (no research): ~$0.01-0.015
- Reply with research: ~$0.015-0.02
- Reply with style matching: ~$0.02-0.025

## Anti-AI Processing

The system includes the `AntiAIDetector` service that removes AI-like patterns from generated replies:

### Removed Patterns
- Corporate/formal transitions
- AI clichés and phrases
- Excessive punctuation
- Overly structured formatting
- Robotic enthusiasm

### Style Matching

When enabled, the system analyzes the original tweet's style using GPT-3.5 and generates instructions to match:
- Vocabulary complexity
- Sentence structure
- Punctuation patterns
- Overall tone and voice

## Summary

The multi-stage approach uses:
1. **Cost-efficient models** (GPT-3.5) for classification and suggestions
2. **Balanced model** (Claude Sonnet) for reasoning and decision-making
3. **Premium model** (Claude Opus) for final human-like generation
4. **Specialized service** (Perplexity) for real-time research

This architecture optimizes for both quality and cost, producing authentic-sounding replies while keeping expenses manageable.