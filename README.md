# ReplyGuy

> AI-powered tool for crafting authentic, human-like replies to tweets

## 🚀 Overview

ReplyGuy helps users create natural, engaging responses to tweets (X posts) using advanced AI models. It uses a multi-stage approach:

1. **Classification** - GPT-3.5 identifies appropriate reply types
2. **Research** (Optional) - Perplexity API finds relevant facts
3. **Reasoning** - Claude Sonnet selects the best reply pattern
4. **Generation** - Claude Opus crafts the final human-like response

## ✨ Features

- 🤖 Multi-model AI pipeline for optimal results
- 💾 50+ reply types categorized by tone and intent
- 🔍 Optional fact-finding with Perplexity API
- 💰 Cost-optimized token usage (90% reduction)
- 🎨 Clean, intuitive UI built with Next.js and Tailwind
- 📊 Analytics and performance tracking
- 🔄 Caching for improved performance

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI Models**: 
  - OpenAI GPT-3.5-turbo (classification)
  - Anthropic Claude 3 (reasoning & generation)
  - Perplexity API (research)
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- API Keys:
  - OpenAI API key
  - Anthropic API key
  - Perplexity API key (optional)
  - Supabase project

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/bpousa/replyguy.git
   cd replyguy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your API keys:
   ```
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   PERPLEXITY_API_KEY=pplx-...
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   
   # Optional: Enable two-step formatting with GPT-3.5-turbo
   ENABLE_FORMATTING_LLM=true
   ```

4. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
replyguy/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── lib/              # Utilities and services
│   └── page.tsx          # Main page
├── data/                  # Static data (reply types)
├── scripts/              # Database scripts
├── public/               # Static assets
└── supabase/            # Database migrations
```

## 🔧 Configuration

### Database Schema

The app uses two main tables:
- `reply_types` - Stores all reply patterns and metadata
- `reply_type_mappings` - Maps response types and tones to reply patterns

See `supabase/migrations/` for the complete schema.

### Reply Types

Reply types are categorized by:
- **Response Type**: agree, disagree, neutral, other
- **Tone**: humorous, professional, casual, supportive, etc.
- **Category**: Humor & Wit, Agreement & Relatability, etc.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in CI mode
npm run test:ci
```

## 📦 Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 💰 Cost Optimization

- Uses cheaper models for classification
- Implements smart caching
- Batches similar requests
- Only uses expensive models for final generation

Average cost per reply: ~$0.016

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for GPT models
- Anthropic for Claude
- Perplexity for search API
- Vercel for hosting
- Supabase for database