# Claude Code Instructions - ReplyGuy

## Project Overview

ReplyGuy is an AI-powered tool for crafting authentic, human-like replies to tweets (X posts). It uses:
- GPT-3.5-turbo for reply type classification (cost-efficient)
- Perplexity API for optional real-time fact-finding
- Claude 3.5 Sonnet for reasoning about the best reply type
- Claude 3 Opus for final human-like content generation

The goal is to create replies that sound genuinely human while being contextually appropriate and engaging.

## Key Commands & Tools

### Build & Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type checking
npm run type-check

# Database migrations
npm run db:migrate

# Seed reply types
npm run db:seed

# Run tests
npm test
```

### Available CLI Tools
You have access to these tools through the CLI:
- **Vercel**: `vercel` - for deployment and preview
- **Supabase**: `supabase` - for database operations
- **Git/GitHub**: `git`, `gh` - for version control

**IMPORTANT**: Always test commands and changes locally before committing.

## Project Structure

```
replyguy/
├── app/                          # Next.js 14 app directory
│   ├── api/                     # API routes (keep separate, focused)
│   │   ├── classify/           # Reply type classification
│   │   ├── research/           # Perplexity search
│   │   ├── reason/             # Pick best reply type
│   │   └── generate/           # Final reply generation
│   ├── components/             # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── reply-form.tsx     # Main form component
│   │   └── reply-output.tsx   # Output display
│   ├── lib/                    # Utilities and services
│   │   ├── services/          # API service classes
│   │   ├── utils/             # Helper functions
│   │   └── types.ts           # TypeScript types
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── data/                       # Static data
│   └── reply-types.json       # Reply type definitions
├── scripts/                    # Database scripts
├── supabase/                   # Database migrations
│   └── migrations/            # SQL migration files
├── public/                     # Static assets
├── .env.local                 # Environment variables (never commit)
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── claude.md                  # This file
```

## Code Style & Conventions

### General Rules
1. **NO MONOLITHIC FILES**: Keep files under 200 lines. Split large components.
2. **TypeScript First**: Use proper types, avoid `any`
3. **Functional Components**: Use React hooks, no class components
4. **Async/Await**: Modern async patterns only
5. **Error Handling**: Always include proper error boundaries and try/catch
6. **Environment Variables**: Use process.env.VARIABLE_NAME

### Naming Conventions
- **Files**: kebab-case (e.g., `reply-form.tsx`)
- **Components**: PascalCase (e.g., `ReplyForm`)
- **Functions**: camelCase (e.g., `generateReply`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_TOKENS`)
- **Types/Interfaces**: PascalCase with descriptive names

### TypeScript Patterns
```typescript
// Define clear interfaces
interface UserInput {
  originalTweet: string;
  responseIdea: string;
  responseType: 'agree' | 'disagree' | 'neutral' | 'other';
  tone: Tone;
  needsResearch: boolean;
}

// Use proper error types
class APIError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// Type API responses
interface APIResponse<T> {
  data?: T;
  error?: string;
}
```

### React/Next.js Component Pattern
```typescript
'use client'; // Only for client components

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';

interface ComponentProps {
  onSubmit: (data: FormData) => Promise<void>;
}

export default function ComponentName({ onSubmit }: ComponentProps) {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(data);
      toast.success('Success!');
    } catch (error) {
      toast.error(error.message);
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  }, [onSubmit, data]);
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Component JSX */}
    </form>
  );
}
```

### API Route Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const requestSchema = z.object({
  tweet: z.string().min(1).max(280),
  responseType: z.enum(['agree', 'disagree', 'neutral', 'other']),
  tone: z.string()
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate input
    const body = await req.json();
    const validated = requestSchema.parse(body);
    
    // Main logic here
    const result = await processRequest(validated);
    
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Important Implementation Details

### Multi-Stage Processing Flow
1. **Input Collection**: Tweet + user intent + tone
2. **Classification** (GPT-3.5): Select top 3 reply types
3. **Research** (Perplexity): Optional fact-finding
4. **Reasoning** (Claude Sonnet): Pick best reply type
5. **Generation** (Claude Opus): Create final reply

### Token Optimization
- Send only relevant reply types to each model
- Use compressed prompts with minimal instructions
- Cache common patterns
- Batch similar requests when possible

### Database Schema
```sql
-- Main reply types table
CREATE TABLE reply_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  pattern TEXT,
  style_rules TEXT,
  examples TEXT[],
  tags TEXT[],
  complexity INT DEFAULT 1
);

-- Mapping table for quick lookups
CREATE TABLE reply_type_mappings (
  id SERIAL PRIMARY KEY,
  response_type VARCHAR(20),
  tone VARCHAR(30),
  reply_type_id VARCHAR(50) REFERENCES reply_types(id),
  priority INT DEFAULT 50
);
```

### State Management
- Use React hooks for component state
- Server state with React Query or SWR
- Form state with controlled components
- No Redux needed for this scope

### Error Handling
- User-friendly messages in UI
- Detailed logging for debugging
- Graceful fallbacks for API failures
- Never expose API keys or sensitive errors

### Performance Considerations
- Implement request debouncing
- Show loading states for all async operations
- Cache classification results
- Use streaming for long responses

## Testing Approach

Before committing:
1. Run `npm run type-check` - no TypeScript errors
2. Run `npm run lint` - clean code
3. Test all user flows manually
4. Check browser console for errors
5. Test error states (API failures)
6. Verify mobile responsiveness

## Deployment

### Environment Variables Required
```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Optional
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Vercel Deployment
```bash
# Deploy preview
vercel

# Deploy to production
vercel --prod

# Check deployments
vercel ls
```

## Common Tasks

### Adding a New Reply Type
1. Add to `data/reply-types.json`
2. Run `npm run db:seed` to update database
3. Test classification picks it up
4. Verify generation uses it properly

### Modifying the UI
1. Use existing shadcn/ui components
2. Maintain consistent spacing (use Tailwind classes)
3. Keep forms accessible (labels, ARIA)
4. Test on mobile devices

### Optimizing Costs
1. Check token usage in responses
2. Reduce prompt lengths
3. Increase cache TTL for stable data
4. Use cheaper models where possible

## Anti-Patterns to Avoid

1. **Don't send full reply type list to LLMs** - filter first
2. **Don't skip loading states** - users need feedback
3. **Don't ignore TypeScript errors** - fix them properly
4. **Don't hardcode API endpoints** - use environment variables
5. **Don't create mega-components** - split into logical pieces
6. **Don't skip error handling** - every API call needs try/catch

## Debugging Tips

1. **API Issues**: Check Network tab in DevTools
2. **Type Errors**: Run `npm run type-check`
3. **Database Issues**: Check Supabase logs
4. **Token Costs**: Log token usage in API routes
5. **Performance**: Use React DevTools Profiler

## Performance Metrics to Track

- Average tokens per request
- Cost per reply
- Cache hit rate
- API response times
- User satisfaction (via feedback)

## Remember

- **Human-like replies** are the goal - no AI-isms
- **Cost efficiency** matters - optimize token usage
- **User experience** is paramount - keep it fast and intuitive
- **Type safety** prevents bugs - use TypeScript properly
- **Test everything** - manual and automated

When making changes, ask yourself:
- Will this scale to 1000s of requests?
- Is the code maintainable?
- Have I handled all error cases?
- Is the cost optimized?
- Does it feel natural to use?

**Your goal**: Build a tool that helps people communicate better on social media with AI assistance that feels invisible.