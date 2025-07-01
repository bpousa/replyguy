# ReplyGuy Referral System Documentation

## Overview

The referral system allows all users (both free and paid) to earn bonus replies and research by inviting friends to join ReplyGuy. This creates a viral growth loop while rewarding loyal users.

## Referral Rewards

### Free Tier Users
- **Per referral**: +10 replies, +1 research
- **Maximum referrals**: 4
- **Maximum bonuses**: 40 replies, 4 research
- **Total capacity**: 50 replies/month (10 base + 40 bonus), 5 research/month (1 base + 4 bonus)

### Paid Tier Users
- **Per referral**: +10 replies, +1 research  
- **Maximum referrals**: 10
- **Maximum bonuses**: 100 replies, 10 research
- **Example (Pro tier)**: 600 replies/month (500 base + 100 bonus)

## Key Features

### 1. Persistent Bonuses
- Bonuses earned as a free user persist when upgrading to paid
- Example: Free user with 30 bonus replies upgrades to Pro → gets 530 replies/month

### 2. Unique Referral Codes
- Format: 4 chars from user ID + 6 random chars (e.g., "111CAB1C2D")
- Generated automatically on user signup
- Accessible via dashboard

### 3. Referral Tracking
- **Pending**: Referred user signed up but hasn't verified email
- **Completed**: Email verified, bonuses awarded
- **Expired**: (future feature) if user doesn't verify within X days

### 4. Share Templates
- **Email**: 2 pre-written templates with different tones
- **Social**: Twitter/X, LinkedIn, Facebook templates
- **Dynamic URLs**: Uses environment variable or auto-detects domain

## Database Schema

### Tables

#### `referrals`
```sql
- id: UUID (primary key)
- referrer_id: UUID (who referred)
- referred_id: UUID (who was referred)
- referral_code: VARCHAR(20)
- status: VARCHAR(20) (pending/completed/expired)
- created_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
```

#### `referral_bonuses`
```sql
- id: UUID (primary key)
- user_id: UUID (unique)
- bonus_replies: INTEGER (0-100)
- bonus_research: INTEGER (0-10)
- total_referrals: INTEGER
- updated_at: TIMESTAMPTZ
```

### Key Functions

#### `generate_referral_code(user_id)`
- Creates unique referral code for user
- Format: UPPER(first 4 of UUID + 6 random chars)

#### `complete_referral(referred_user_id)`
- Called when user verifies email
- Awards bonuses to referrer
- Checks tier-specific caps

#### `get_user_limits(user_id)`
- Returns limits including referral bonuses
- Works for all tiers (not just free)

## API Endpoints

### `POST /api/referral/generate`
- Generates/retrieves user's referral code
- Returns referral URL

### `GET /api/referral/stats`
- Returns user's referral statistics
- Includes tier-specific maximums

### `POST /api/referral/validate`
- Validates referral code during signup
- No authentication required

## User Flow

### For Referrers
1. User clicks "Share" in dashboard
2. Gets unique referral link
3. Shares via email/social media
4. Tracks progress in dashboard
5. Bonuses applied automatically

### For Referred Users
1. Clicks referral link
2. Lands on signup page with code pre-filled
3. Creates account
4. Sees "Referred by a friend!" badge
5. Verifies email
6. Both users get bonuses

## UI Components

### `ReferralStats`
- Dashboard widget showing progress
- Different messaging for free/paid tiers
- Progress bars with tier-specific caps

### `ReferralShareModal`
- Pre-written templates
- One-click copy/share
- Shows remaining referral capacity

## Migration Instructions

To apply the referral system:

1. Go to Supabase SQL Editor
2. Login as user "mike"
3. Run: `/supabase/migrations/20250701_create_referral_system.sql`

## Testing Checklist

- [ ] Free user can generate referral code
- [ ] Referral code appears in signup URL
- [ ] Email verification triggers bonus award
- [ ] Free user caps at 40 bonus replies
- [ ] Paid user caps at 100 bonus replies
- [ ] Bonuses persist through tier upgrade
- [ ] Dashboard shows correct limits
- [ ] Share modal shows tier-specific messaging

## Future Enhancements

1. **Referral expiry**: Pending referrals expire after 30 days
2. **Bonus types**: Different rewards for different actions
3. **Leaderboard**: Top referrers recognition
4. **Cascade bonuses**: Earn from referrals of referrals
5. **Special campaigns**: 2x bonuses during launch week