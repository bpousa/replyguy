# ReplyGuy Pricing & Plan Configuration (Updated)

## Current Plan Structure

ReplyGuy now offers five subscription tiers with meme integration:

### 🆓 Free Plan
- **Price**: $0/month
- **Limits**:
  - 10 replies/month
  - 280 character tweets (standard)
  - 280 character replies (short only)
  - NO memes
  - NO AI suggestions
  - NO style matching
  - NO real-time research

### 💼 Basic Plan
- **Price**: $9/month ($90/year - save 17%)
- **Limits**:
  - 50 replies/month
  - 500 character tweets
  - 280 character replies (short only)
  - NO memes
  - 25 AI suggestions/month
  - NO style matching
  - NO real-time research

### 🚀 Pro Plan (Most Popular)
- **Price**: $19/month ($190/year - save 17%)
- **Limits**:
  - 150 replies/month
  - 1000 character tweets
  - 560 character replies (short/medium)
  - 25 memes/month
  - 50 AI suggestions/month
  - ✅ Style matching (50% influence)
  - NO real-time research

### 💎 Business Plan
- **Price**: $29/month ($290/year - save 17%)
- **Limits**:
  - 300 replies/month
  - 1500 character tweets
  - 1000 character replies (short/medium/long)
  - 50 memes/month
  - 100 AI suggestions/month
  - ✅ Style matching
  - ✅ Real-time research with Perplexity

### 🏢 Enterprise Plan
- **Price**: $49/month ($490/year - save 17%)
- **Limits**:
  - 500 replies/month
  - 2000 character tweets
  - 2000 character replies (all lengths)
  - 100 memes/month
  - 200 AI suggestions/month
  - ✅ Style matching
  - ✅ Real-time research
  - ✅ API access (coming soon)
  - ✅ Dedicated support

## Feature Comparison Matrix

| Feature | Free | Basic | Pro | Business | Enterprise |
|---------|------|-------|-----|----------|------------|
| **Monthly Replies** | 10 | 50 | 150 | 300 | 500 |
| **Memes/Month** | 0 | 0 | 25 | 50 | 100 |
| **AI Suggestions** | 0 | 25 | 50 | 100 | 200 |
| **Max Tweet Length** | 280 | 500 | 1000 | 1500 | 2000 |
| **Max Reply Length** | 280 | 280 | 560 | 1000 | 2000 |
| **Reply Lengths** | Short | Short | Short/Med | All | All |
| **Style Matching** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Real-time Research** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Debug Mode** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Support** | Community | Email | Priority | Priority | Dedicated |

## Database Schema Updates

The following tables have been added/updated:

### subscription_plans
```sql
- id (free, basic, pro, business, enterprise)
- name
- description
- price_monthly
- price_yearly
- reply_limit
- meme_limit (NEW)
- enable_memes (NEW)
- max_tweet_length
- max_response_idea_length  
- max_reply_length
- suggestion_limit
- enable_long_replies
- enable_style_matching
- enable_perplexity_guidance
- features (JSONB)
- popular (boolean)
- active
```

### users (NEW)
```sql
- id (UUID, references auth.users)
- email
- full_name
- stripe_customer_id
- daily_goal (default: 10)
- timezone (default: America/New_York)
- created_at
- updated_at
```

### subscriptions (NEW)
```sql
- id
- user_id
- plan_id
- stripe_subscription_id
- status (active, canceled, past_due, trialing)
- current_period_start
- current_period_end
- cancel_at_period_end
- canceled_at
```

### daily_usage (NEW)
```sql
- id
- user_id
- date
- replies_generated
- memes_generated
- suggestions_used
- goal_achieved
```

### user_usage (UPDATED)
```sql
- id
- user_id
- month
- replies_generated
- memes_generated (NEW)
- suggestions_used
- total_cost
```

## Cost Analysis

### Per-Reply Costs
- **GPT-3.5 Classification**: ~$0.001
- **Claude Sonnet Reasoning**: ~$0.003
- **Claude Opus Generation**: ~$0.015
- **Style Analysis** (optional): ~$0.001
- **Perplexity Research** (optional): ~$0.0002
- **Total without meme**: ~$0.02-0.025

### Meme Costs
- **Imgflip Premium**: $99/year ($8.25/month)
- **Included automemes**: 50/month
- **Overage cost**: $0.02 per meme
- **At current limits**: All plans stay within included memes

### Profit Margins (Monthly)
- **Free**: -$0.25 (loss leader, limited to 10 replies)
- **Basic**: $9 - (50 × $0.025) = $7.75 profit
- **Pro**: $19 - (150 × $0.025) - $8.25 = $7.00 profit
- **Business**: $29 - (300 × $0.025) - $8.25 = $13.25 profit
- **Enterprise**: $49 - (500 × $0.025) - $8.25 = $28.25 profit

## Implementation Status

### ✅ Completed
- Database migrations for all new tables
- Subscription plan updates with meme limits
- Imgflip service integration
- Meme decision logic in reasoning service
- UI updates for meme toggle
- Landing page with pricing
- Loading animations
- Environment variable configuration

### 🔄 In Progress
- Stripe checkout flow
- Webhook handlers for subscription management

### 📋 Pending
- Supabase authentication implementation
- Daily goal tracking with celebrations
- User dashboard with usage stats
- Billing portal integration
- Plan upgrade/downgrade flow

## Stripe Integration Requirements

### Products to Create
1. **Basic Plan** - $9/month or $90/year
2. **Pro Plan** - $19/month or $190/year
3. **Business Plan** - $29/month or $290/year
4. **Enterprise Plan** - $49/month or $490/year

### Webhook Events to Handle
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

## Usage Tracking

### Daily Limits
- Tracked in user's timezone
- Reset at midnight
- Goal celebrations trigger when daily goal is met

### Monthly Limits
- Reset on calendar month
- Prevent usage when limits reached
- Show clear usage indicators in UI

### Features to Track
1. Reply generation count
2. Meme generation count
3. AI suggestion usage
4. Character count per request
5. Research queries
6. Total cost per user

## Next Steps

1. **Complete Stripe Integration**
   - Create products in Stripe dashboard
   - Implement checkout flow
   - Add webhook handlers

2. **Implement Authentication**
   - Supabase auth with email/password
   - Social login (Google, Twitter)
   - Protected routes

3. **Build User Dashboard**
   - Usage statistics
   - Daily goal tracking
   - Billing management
   - Settings page

4. **Add Gamification**
   - Daily goal celebrations
   - Streak tracking
   - Achievement badges

5. **Launch Preparation**
   - Load testing
   - Security audit
   - Documentation
   - Marketing materials