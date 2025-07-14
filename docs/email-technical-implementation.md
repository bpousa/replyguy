# ReplyGuy Email Technical Implementation Guide

## Table of Contents
1. [GHL Webhook Configuration](#ghl-webhook-configuration)
2. [Event-Based Automation Flows](#event-based-automation-flows)
3. [Property-Based Triggers](#property-based-triggers)
4. [Segmentation Rules](#segmentation-rules)
5. [Stop/Start Conditions](#stopstart-conditions)
6. [Testing & QA Procedures](#testing--qa-procedures)
7. [Performance Tracking](#performance-tracking)
8. [Troubleshooting Guide](#troubleshooting-guide)

## GHL Webhook Configuration

### Webhook Endpoint
```
https://services.leadconnectorhq.com/hooks/{locationId}/webhook-trigger/{triggerId}
```

### Authentication
```
Authorization: Bearer {GHL_API_KEY}
Content-Type: application/json
```

### Core Webhook Events

#### 1. user_created
**Payload Structure**:
```json
{
  "event": "user_created",
  "timestamp": "2025-07-12T10:00:00Z",
  "user": {
    "external_id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "timezone": "America/New_York",
    "member_level": "free",
    "subscription_status": "active",
    "signup_date": "2025-07-12T10:00:00Z",
    "referral_code": "REF123",
    "referred_by": null,
    "product_purchased": null,
    "trial_ends": null
  }
}
```

**Triggers**:
- Welcome Series (5-email sequence)
- Chrome Extension Campaign (if not installed)
- Onboarding checklist

#### 2. subscription_started
**Payload Structure**:
```json
{
  "event": "subscription_started",
  "timestamp": "2025-07-12T10:00:00Z",
  "user": {
    "external_id": "user_123",
    "member_level": "x_basic",
    "product_purchased": "x_basic",
    "billing_day": 15,
    "monthly_reply_limit": 300,
    "monthly_meme_limit": 10,
    "features": ["meme_generation"]
  }
}
```

**Triggers**:
- New customer onboarding
- Feature unlock notifications
- Pro tips series

#### 3. payment_failed
**Payload Structure**:
```json
{
  "event": "payment_failed",
  "timestamp": "2025-07-12T10:00:00Z",
  "user": {
    "external_id": "user_123",
    "payment_status": "failed",
    "payment_failed_date": "2025-07-12T10:00:00Z",
    "payment_retry_count": 1
  }
}
```

**Triggers**:
- Payment recovery sequence (4 emails)
- Grace period notifications
- Support outreach (after 3 fails)

#### 4. trial_ending
**Payload Structure**:
```json
{
  "event": "trial_ending",
  "timestamp": "2025-07-12T10:00:00Z",
  "user": {
    "external_id": "user_123",
    "trial_ends": "2025-07-15T10:00:00Z",
    "member_level": "x_pro",
    "subscription_status": "trialing"
  }
}
```

**Triggers**:
- Trial conversion campaign
- Urgency sequence
- Special offers

## Event-Based Automation Flows

### Welcome Series Flow
```
Trigger: user_created event
├── Wait: 0 minutes → Send Welcome Email
├── Wait: 1 day → Send AI Process Education
├── Condition: IF replies_created = 0
│   └── Send: First Reply Encouragement
├── Wait: 3 days → Send Reply Types Showcase
├── Wait: 5 days → Send Success Story
└── Wait: 7 days → Send Week 1 Report
```

### Payment Recovery Flow
```
Trigger: payment_failed event
├── Wait: 0 minutes → Send Payment Failed Notice
├── Wait: 3 days → Send Friendly Reminder
├── Condition: IF payment_retry_count >= 2
│   └── Send: Alternative Payment Methods
├── Wait: 5 days → Send Urgency Email
└── Wait: 7 days → Send Final Notice
    └── Condition: IF still failed
        └── Trigger: subscription_suspended
```

### Trial Conversion Flow
```
Trigger: trial_ends approaching
├── Calculate: days_until_trial_end
├── IF days = 7 → Send Trial Week Warning
├── IF days = 3 → Send Benefits Reminder
├── IF days = 1 → Send Last Chance Offer
└── IF days = 0 → Send Trial Ended
    └── Wait: 3 days → Send Reactivation Offer
```

## Property-Based Triggers

### Usage-Based Triggers

#### Approaching Limit Trigger
```javascript
Condition: (total_replies_this_month / monthly_reply_limit) >= 0.8
Action: Send upgrade warning email
Frequency: Once per month
Reset: On billing_day
```

#### Low Usage Alert
```javascript
Condition: last_active > 7 days AND member_level != 'free'
Action: Send re-engagement email
Frequency: Once per 14 days
Stop: After 3 sends with no activity
```

#### Power User Recognition
```javascript
Condition: total_replies_this_month > 100 AND engagement_rate > 0.3
Action: Send power user perks email
Frequency: Once per month
Include: Referral program invite
```

### Behavioral Triggers

#### Feature Adoption
```javascript
Trigger: User has access to feature BUT hasn't used it
Conditions:
- has_meme_access = true AND memes_created = 0
- has_write_like_me = true AND style_profile = null
- has_research = true AND research_queries = 0

Action: Send feature discovery email
Timing: 7 days after feature access granted
```

#### Milestone Celebrations
```javascript
Triggers:
- total_replies = 10, 50, 100, 500, 1000
- followers_gained = 100, 1000, 10000
- best_reply_engagement > previous_record

Action: Send celebration email with badge
Include: Social sharing prompt
```

## Segmentation Rules

### User Segments

#### By Plan Level
```sql
-- Free Users
WHERE member_level = 'free' 
  AND subscription_status = 'active'

-- Paid Users
WHERE member_level IN ('x_basic', 'x_pro', 'x_business')
  AND subscription_status = 'active'

-- Trial Users
WHERE subscription_status = 'trialing'
  AND trial_ends > NOW()
```

#### By Engagement Level
```sql
-- Highly Engaged
WHERE (total_replies_this_month / days_since_billing) > 10
  AND last_active < 3 days ago

-- At Risk
WHERE last_active > 14 days ago
  AND member_level != 'free'

-- Dormant
WHERE last_active > 30 days ago
  OR total_replies_last_30_days = 0
```

#### By Feature Usage
```sql
-- Meme Masters
WHERE memes_created > 10
  AND meme_engagement_rate > 0.5

-- Write Like Me Users
WHERE style_profile IS NOT NULL
  AND write_like_me_replies > 20

-- Research Power Users
WHERE research_queries > 5
  AND member_level = 'x_business'
```

### Dynamic Segments

#### Upgrade Candidates
```javascript
Criteria:
1. Hit reply limit 2+ months in a row
2. High engagement rate (>0.4)
3. Active in last 7 days
4. Current plan < x_business

Action: Add to upgrade_candidates segment
Campaign: Personalized upgrade offers
```

#### Churn Risk Scoring
```javascript
Risk Score = 
  (days_since_last_active * 2) +
  (1 - (replies_this_month / replies_last_month) * 30) +
  (payment_failures * 20) +
  (support_tickets_unresolved * 10)

High Risk: Score > 70
Medium Risk: Score 40-70
Low Risk: Score < 40
```

## Stop/Start Conditions

### Global Stop Conditions

```yaml
stop_all_emails:
  - email_status: unsubscribed
  - email_status: hard_bounced
  - email_status: marked_spam
  - account_status: deleted
  - account_status: suspended_fraud
```

### Campaign-Specific Stops

#### Welcome Series
```yaml
stop_conditions:
  - user_upgraded_to_paid: true
  - emails_sent_count: 5
  - days_since_signup: 8
  - consecutive_unopened: 3
```

#### Upgrade Campaigns
```yaml
stop_conditions:
  - plan_upgraded: true
  - upgrade_emails_this_month: 3
  - user_downgraded: true
  - explicit_not_interested: true
```

#### Win-back Campaigns
```yaml
stop_conditions:
  - user_reactivated: true
  - winback_emails_sent: 4
  - days_since_cancel: 91
  - explicit_do_not_contact: true
```

### Start Condition Examples

#### Re-engagement Campaign Start
```javascript
start_when_all:
  - last_active > 7 days
  - member_level != 'free'
  - no_active_campaign: true
  - last_re_engagement_sent > 30 days ago
```

#### Referral Program Start
```javascript
start_when_any:
  - total_replies > 100
  - nps_score >= 9
  - explicit_positive_feedback: true
  - referred_users_count > 0
```

## Testing & QA Procedures

### Pre-Launch Testing

#### 1. Webhook Testing
```bash
# Test user creation
curl -X POST {webhook_url} \
  -H "Authorization: Bearer {token}" \
  -d @test-payloads/user_created.json

# Verify email triggered in GHL
# Check merge fields populated correctly
# Confirm stop conditions work
```

#### 2. Segment Testing
```sql
-- Verify segment counts
SELECT COUNT(*), member_level, subscription_status
FROM users
WHERE {segment_conditions}
GROUP BY member_level, subscription_status;

-- Test edge cases
-- Users with null values
-- Recently changed states
-- Timezone considerations
```

#### 3. Flow Testing Checklist
- [ ] All triggers fire correctly
- [ ] Wait times calculate properly
- [ ] Conditions evaluate accurately
- [ ] Emails contain correct merge data
- [ ] Stop conditions prevent duplicates
- [ ] Unsubscribe links work
- [ ] Mobile rendering correct

### A/B Test Configuration

#### Subject Line Test
```yaml
test_name: welcome_subject_curiosity_vs_benefit
variants:
  A: 
    subject: "The secret to viral tweets..."
    weight: 50
  B:
    subject: "Save 3 hours on Twitter this week"
    weight: 50
success_metric: open_rate
minimum_sample: 1000
```

#### Send Time Test
```yaml
test_name: best_send_time_trials
variants:
  A: 
    send_time: "09:00"
    timezone: user_timezone
  B:
    send_time: "14:00"
    timezone: user_timezone
  C:
    send_time: "19:00"
    timezone: user_timezone
success_metric: click_rate
duration: 30_days
```

## Performance Tracking

### Key Metrics Setup

#### Email Performance
```sql
CREATE VIEW email_performance AS
SELECT 
  campaign_name,
  COUNT(sent) as total_sent,
  COUNT(opened) / COUNT(sent) as open_rate,
  COUNT(clicked) / COUNT(opened) as click_rate,
  COUNT(converted) / COUNT(sent) as conversion_rate,
  COUNT(unsubscribed) / COUNT(sent) as unsub_rate
FROM email_events
GROUP BY campaign_name;
```

#### Revenue Attribution
```sql
CREATE VIEW email_revenue AS
SELECT 
  e.campaign_name,
  COUNT(DISTINCT u.user_id) as converters,
  SUM(u.mrr) as monthly_revenue,
  AVG(DATEDIFF(u.upgraded_at, e.sent_at)) as days_to_convert
FROM email_events e
JOIN user_upgrades u ON e.user_id = u.user_id
WHERE u.upgraded_at BETWEEN e.sent_at AND e.sent_at + INTERVAL 7 DAY
GROUP BY e.campaign_name;
```

### Dashboard Requirements

#### Real-Time Metrics
- Active campaigns running
- Emails sent today
- Current open/click rates
- Failed webhook events
- Unsubscribe rate alerts

#### Weekly Reports
- Campaign performance summary
- Segment growth/shrinkage
- Revenue attribution
- A/B test results
- Delivery issues

#### Monthly Analysis
- Lifecycle stage conversion rates
- Cohort retention curves
- Feature adoption funnels
- ROI by campaign type
- Engagement trends

## Troubleshooting Guide

### Common Issues

#### Emails Not Sending
```
1. Check webhook logs for errors
2. Verify user meets segment criteria
3. Confirm no stop conditions active
4. Check email service status
5. Verify merge fields exist
```

#### Duplicate Emails
```
1. Check for multiple trigger events
2. Verify idempotency keys
3. Review flow logic for loops
4. Check timezone calculations
5. Confirm stop conditions working
```

#### Wrong Segment Assignment
```
1. Review segment SQL queries
2. Check for null values
3. Verify data type matching
4. Test timezone conversions
5. Look for race conditions
```

### Debug Queries

#### Find Stuck Users
```sql
-- Users who should get emails but aren't
SELECT u.*, 
  CASE 
    WHEN stop_condition THEN 'stopped'
    WHEN not segment_match THEN 'wrong segment'
    WHEN last_email_bounced THEN 'bounced'
    ELSE 'unknown'
  END as issue
FROM users u
WHERE expected_email = true
  AND email_sent = false;
```

#### Campaign Performance Issues
```sql
-- Identify underperforming campaigns
SELECT 
  campaign_name,
  open_rate,
  click_rate,
  (SELECT AVG(open_rate) FROM campaigns) as avg_open_rate,
  (SELECT AVG(click_rate) FROM campaigns) as avg_click_rate
FROM campaign_stats
WHERE open_rate < (SELECT AVG(open_rate) * 0.8 FROM campaigns)
ORDER BY volume DESC;
```

### Emergency Procedures

#### Stop All Campaigns
```bash
# GHL API call to pause all automations
curl -X POST https://api.ghl.com/automations/pause-all \
  -H "Authorization: Bearer {token}" \
  -d '{"reason": "emergency stop"}'
```

#### Rollback Campaign
```sql
-- Mark emails as not sent to retry
UPDATE email_queue
SET status = 'pending', 
    error_count = 0,
    last_error = null
WHERE campaign_id = '{campaign_id}'
  AND sent_at > NOW() - INTERVAL 1 HOUR;
```

## Integration Checklist

### Initial Setup
- [ ] Configure webhook endpoints in ReplyGuy
- [ ] Set up GHL webhook listeners
- [ ] Map all user properties to GHL fields
- [ ] Create email templates in GHL
- [ ] Configure segments and tags
- [ ] Set up tracking pixels
- [ ] Test all webhook events
- [ ] Configure backup procedures

### Pre-Launch
- [ ] Run full test suite
- [ ] Verify email rendering
- [ ] Check merge field population
- [ ] Test stop conditions
- [ ] Confirm tracking works
- [ ] Set up monitoring alerts
- [ ] Document support procedures
- [ ] Train support team

### Post-Launch
- [ ] Monitor delivery rates
- [ ] Check for bounce patterns
- [ ] Review early metrics
- [ ] Gather user feedback
- [ ] Optimize based on data
- [ ] Document learnings
- [ ] Plan iteration cycles

---

*Technical implementation guide v1.0*
*Last updated: [Current Date]*
*Contact: engineering@replyguy.ai for technical support*