# GHL Milestone Tracking Implementation Plan

## Problem Statement

Currently, the ReplyGuy → GHL webhook integration only sends specific events:
- user_created
- subscription_started  
- payment_failed
- trial_ending
- etc.

**Missing**: Milestone events like:
- First reply created
- 10th, 50th, 100th, 500th, 1000th reply
- Daily goal achieved
- Feature first used (memes, research, etc.)
- Engagement milestones

## Current Architecture Issues

1. **No Lifetime Tracking**: The `total_replies` field in GHL sync is actually monthly count, not lifetime
2. **No Milestone Detection**: `track_daily_usage` function doesn't check for milestones
3. **No Event Emission**: No mechanism to send milestone events to GHL
4. **Inefficient Polling**: GHL can't efficiently poll for value changes

## Recommended Solution: Hybrid Approach

### 1. Add Lifetime Tracking to Database

**New table: `user_lifetime_stats`**
```sql
CREATE TABLE user_lifetime_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  total_replies INTEGER DEFAULT 0,
  total_memes INTEGER DEFAULT 0,
  total_suggestions INTEGER DEFAULT 0,
  first_reply_at TIMESTAMP,
  latest_milestone_replies INTEGER DEFAULT 0,
  latest_milestone_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Modify `track_daily_usage` Function

```sql
CREATE OR REPLACE FUNCTION public.track_daily_usage(
  p_user_id UUID,
  p_usage_type TEXT,
  p_count INTEGER DEFAULT 1,
  p_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_lifetime_replies INTEGER;
  v_milestone_reached INTEGER := NULL;
  v_is_first_reply BOOLEAN := FALSE;
  -- ... existing declarations
BEGIN
  -- ... existing logic ...
  
  -- Update lifetime stats
  IF p_usage_type = 'reply' THEN
    INSERT INTO user_lifetime_stats (user_id, total_replies, first_reply_at)
    VALUES (p_user_id, p_count, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_replies = user_lifetime_stats.total_replies + p_count,
      first_reply_at = COALESCE(user_lifetime_stats.first_reply_at, NOW()),
      updated_at = NOW();
    
    -- Get updated lifetime count
    SELECT total_replies INTO v_lifetime_replies
    FROM user_lifetime_stats
    WHERE user_id = p_user_id;
    
    -- Check if this is the first reply
    IF v_lifetime_replies = p_count THEN
      v_is_first_reply := TRUE;
      v_milestone_reached := 1;
    -- Check for other milestones
    ELSIF v_lifetime_replies >= 10 AND v_lifetime_replies - p_count < 10 THEN
      v_milestone_reached := 10;
    ELSIF v_lifetime_replies >= 50 AND v_lifetime_replies - p_count < 50 THEN
      v_milestone_reached := 50;
    ELSIF v_lifetime_replies >= 100 AND v_lifetime_replies - p_count < 100 THEN
      v_milestone_reached := 100;
    ELSIF v_lifetime_replies >= 500 AND v_lifetime_replies - p_count < 500 THEN
      v_milestone_reached := 500;
    ELSIF v_lifetime_replies >= 1000 AND v_lifetime_replies - p_count < 1000 THEN
      v_milestone_reached := 1000;
    END IF;
    
    -- Record milestone if reached
    IF v_milestone_reached IS NOT NULL THEN
      UPDATE user_lifetime_stats
      SET latest_milestone_replies = v_milestone_reached,
          latest_milestone_date = NOW()
      WHERE user_id = p_user_id;
      
      -- Queue milestone webhook event
      INSERT INTO webhook_events (
        user_id,
        event_type,
        event_data,
        status
      ) VALUES (
        p_user_id,
        'milestone_reached',
        jsonb_build_object(
          'milestone_type', 'replies',
          'milestone_value', v_milestone_reached,
          'lifetime_total', v_lifetime_replies,
          'is_first', v_is_first_reply
        ),
        'pending'
      );
    END IF;
  END IF;
  
  -- Return enhanced response
  RETURN jsonb_build_object(
    'success', true,
    'date', v_user_date,
    'timezone', v_user_timezone,
    'goal_achieved', v_goal_achieved,
    'current_count', v_current_replies,
    'daily_goal', v_daily_goal,
    'lifetime_total', v_lifetime_replies,
    'milestone_reached', v_milestone_reached
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Create Webhook Event Queue System

**New table: `webhook_events`**
```sql
CREATE TABLE webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  error_message TEXT
);

-- Index for efficient processing
CREATE INDEX idx_webhook_events_pending ON webhook_events(status) 
WHERE status = 'pending';
```

### 4. Add Webhook Event Processor

**New endpoint: `/api/webhooks/process-queue`**
```typescript
// Run via cron every minute
export async function processWebhookQueue() {
  // Get pending events
  const { data: events } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .limit(50);
    
  for (const event of events) {
    try {
      // Get full user data
      const userData = await getUserData(event.user_id);
      
      // Send to GHL
      const response = await fetch(GHL_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GHL_API_KEY}`
        },
        body: JSON.stringify({
          event: event.event_type,
          timestamp: event.created_at,
          user: userData,
          metadata: event.event_data
        })
      });
      
      if (response.ok) {
        // Mark as sent
        await supabase
          .from('webhook_events')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', event.id);
      } else {
        throw new Error(`GHL returned ${response.status}`);
      }
    } catch (error) {
      // Update attempts and error
      await supabase
        .from('webhook_events')
        .update({
          attempts: event.attempts + 1,
          error_message: error.message,
          status: event.attempts >= 2 ? 'failed' : 'pending'
        })
        .eq('id', event.id);
    }
  }
}
```

### 5. Add New Event Types to GHL Webhook Handler

```typescript
// In /api/ghl/webhook/route.ts
const validEvents: EventType[] = [
  'user_created',
  'subscription_started',
  'subscription_updated',
  'payment_failed',
  'payment_recovered',
  'subscription_canceled',
  'trial_ending',
  // NEW milestone events
  'milestone_reached',
  'daily_goal_achieved',
  'feature_first_used'
];
```

### 6. Enhanced GHL Email Triggers

With this system, GHL can trigger emails based on:

```yaml
milestone_reached:
  conditions:
    - event.metadata.milestone_type = 'replies'
    - event.metadata.milestone_value IN (1, 10, 50, 100, 500, 1000)
  
  email_templates:
    - milestone_value = 1: "first_reply_celebration"
    - milestone_value = 10: "getting_started_congrats"
    - milestone_value = 50: "power_user_emerging"
    - milestone_value = 100: "century_club"
    - milestone_value = 500: "pro_achievement"
    - milestone_value = 1000: "elite_status"

daily_goal_achieved:
  conditions:
    - event.metadata.streak_days = 1: "first_goal_achieved"
    - event.metadata.streak_days = 7: "week_streak"
    - event.metadata.streak_days = 30: "month_streak"

feature_first_used:
  conditions:
    - event.metadata.feature = 'meme': "meme_discovery"
    - event.metadata.feature = 'write_like_me': "style_activated"
    - event.metadata.feature = 'research': "fact_checker_unlocked"
```

## Implementation Steps

### Phase 1: Database Setup (Week 1)
1. Create lifetime stats table
2. Create webhook events queue table
3. Update track_daily_usage function
4. Backfill lifetime stats for existing users

### Phase 2: Webhook System (Week 1-2)
1. Build webhook event processor
2. Set up cron job for queue processing
3. Add monitoring for failed events
4. Test with sample events

### Phase 3: GHL Integration (Week 2)
1. Update webhook handler for new events
2. Create email templates in GHL
3. Configure triggers for each milestone
4. Test end-to-end flow

### Phase 4: Additional Milestones (Week 3)
1. Add engagement milestones (likes, retweets)
2. Add streak tracking (consecutive days)
3. Add feature adoption tracking
4. Add time-based milestones

## Alternative Approaches

### Option 1: Real-time Webhook (More Complex)
- Send webhook immediately from track_daily_usage
- Requires careful error handling
- Risk of blocking reply generation

### Option 2: GHL Polling (Less Efficient)
- Send lifetime_total with every sync
- GHL workflows check for changes
- Requires GHL to store previous values

### Option 3: Batch Processing (Less Timely)
- Run hourly job to check all milestones
- Send batch of milestone events
- Less real-time but more efficient

## Monitoring & Analytics

Track these metrics:
1. Webhook delivery rate
2. Milestone email open rates
3. Conversion impact of milestone emails
4. Queue processing latency
5. Failed webhook retry success rate

## Migration Plan

```sql
-- Backfill lifetime stats
INSERT INTO user_lifetime_stats (user_id, total_replies, total_memes, total_suggestions)
SELECT 
  u.id,
  COALESCE(SUM(du.replies_generated), 0) as total_replies,
  COALESCE(SUM(du.memes_generated), 0) as total_memes,
  COALESCE(SUM(du.suggestions_used), 0) as total_suggestions
FROM users u
LEFT JOIN daily_usage du ON u.id = du.user_id
GROUP BY u.id;

-- Set first_reply_at
UPDATE user_lifetime_stats uls
SET first_reply_at = (
  SELECT MIN(date) 
  FROM daily_usage du 
  WHERE du.user_id = uls.user_id 
    AND du.replies_generated > 0
);
```

## Testing Strategy

1. **Unit Tests**: Test milestone detection logic
2. **Integration Tests**: Test webhook delivery
3. **End-to-End Tests**: Test from reply → milestone → email
4. **Load Tests**: Ensure queue can handle volume
5. **Failure Tests**: Test retry logic

## Success Criteria

- 95%+ webhook delivery rate
- <5 minute milestone → email latency
- 0 duplicate milestone emails
- 20%+ engagement lift from milestone emails
- No impact on reply generation performance

---

This hybrid approach balances real-time milestone detection with system reliability and maintainability. The queue system ensures no events are lost and provides retry capability.