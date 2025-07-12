# GHL Webhook Data Format from ReplyGuy

This document shows the exact data format that ReplyGuy sends to your GHL webhook for each event type.

## Webhook Events and Data

### 1. User Created (New Signup)
**Event**: `user_created`
```json
{
  "event": "user_created",
  "timestamp": "2025-01-12T18:30:00.000Z",
  "user": {
    "external_id": "uuid-123-456",
    "email": "user@example.com",
    "name": "John Doe",
    "timezone": "America/New_York",
    "member_level": "free",
    "subscription_status": "trialing",
    "daily_goal": 10,
    "total_replies": 0,
    "signup_date": "2025-01-12T18:30:00.000Z",
    "payment_status": "trial",
    "monthly_reply_limit": 10,
    "monthly_meme_limit": 0,
    "features": []
  },
  "metadata": {
    "source": "signup_form"
  }
}
```

### 2. Subscription Started (Checkout Completed)
**Event**: `subscription_started`
```json
{
  "event": "subscription_started",
  "userId": "uuid-123-456",
  "data": {
    "planId": "pro",
    "subscriptionId": "sub_123abc",
    "customerId": "cus_456def",
    "status": "active"
  },
  "metadata": {
    "billingCycle": "monthly",
    "trial": false
  }
}
```

### 3. Subscription Updated (Plan Change)
**Event**: `subscription_updated`
```json
{
  "event": "subscription_updated",
  "userId": "uuid-123-456",
  "data": {
    "oldPlanId": "basic",
    "newPlanId": "pro",
    "oldStatus": "active",
    "newStatus": "active"
  },
  "metadata": {
    "eventType": "customer.subscription.updated",
    "priceId": "price_123"
  }
}
```

### 4. Payment Failed
**Event**: `payment_failed`
```json
{
  "event": "payment_failed",
  "userId": "uuid-123-456",
  "data": {
    "subscriptionId": "sub_123abc",
    "invoiceId": "inv_789ghi",
    "amount": 49.00
  },
  "metadata": {
    "failureReason": "insufficient_funds",
    "nextRetryDate": "2025-01-15T18:30:00.000Z",
    "retryCount": 1
  }
}
```

### 5. Payment Recovered
**Event**: `payment_recovered`
```json
{
  "event": "payment_recovered",
  "userId": "uuid-123-456",
  "data": {
    "subscriptionId": "sub_123abc",
    "invoiceId": "inv_789ghi",
    "amount": 49.00
  },
  "metadata": {
    "recoveredAt": "2025-01-13T10:00:00.000Z"
  }
}
```

### 6. Subscription Canceled
**Event**: `subscription_canceled`
```json
{
  "event": "subscription_canceled",
  "userId": "uuid-123-456",
  "data": {
    "subscriptionId": "sub_123abc",
    "customerId": "cus_456def"
  },
  "metadata": {
    "canceledAt": "2025-01-12T18:30:00.000Z"
  }
}
```

### 7. Trial Ending (3 Days Warning)
**Event**: `trial_ending`
```json
{
  "event": "trial_ending",
  "userId": "uuid-123-456",
  "data": {
    "subscriptionId": "sub_123abc",
    "customerId": "cus_456def"
  },
  "metadata": {
    "trialEndDate": "2025-01-15T18:30:00.000Z",
    "daysRemaining": 3
  }
}
```

## User Sync Data Format

When any event triggers, ReplyGuy first syncs the complete user data. The sync includes:

```json
{
  "event": "user_sync",
  "data": {
    "external_id": "uuid-123-456",
    "email": "user@example.com",
    "name": "John Doe",
    "timezone": "America/New_York",
    "member_level": "x_pro",
    "subscription_status": "active",
    "billing_day": 15,
    "trial_ends": null,
    "daily_goal": 10,
    "total_replies": 245,
    "signup_date": "2025-01-01T10:00:00.000Z",
    "last_active": "2025-01-12T15:30:00.000Z",
    "payment_status": "current",
    "payment_failed_date": null,
    "payment_retry_count": 0,
    "referred_by": "referrer@example.com",
    "referral_code": "REF12345",
    "monthly_reply_limit": 500,
    "monthly_meme_limit": 50,
    "features": ["meme_generation", "write_like_me", "style_matching"]
  },
  "timestamp": "2025-01-12T18:30:00.000Z"
}
```

## Field Mappings

### Member Level Values
- `free` → Free tier
- `x_basic` → Growth plan ($19/mo)
- `x_pro` → Professional plan ($49/mo)
- `x_business` → Enterprise plan ($99/mo)

### Subscription Status Values
- `active` → Active subscription
- `trialing` → In trial period
- `past_due` → Payment overdue
- `canceled` → Subscription canceled
- `unpaid` → Payment failed

### Payment Status Values
- `current` → Payments up to date
- `failed` → Recent payment failure
- `canceled` → Subscription was canceled
- `trial` → Currently in trial

### Features Array
Possible values in the features array:
- `meme_generation` → Can generate memes
- `write_like_me` → Personal style matching
- `style_matching` → Advanced style options
- `research` → Perplexity research enabled
- `long_replies` → Extended reply length

## Webhook Configuration

Your webhook is configured at:
```
https://services.leadconnectorhq.com/hooks/NGw3pjXqz1DFBatCnlw0/webhook-trigger/6caf6654-fff1-4924-ae1e-86925bf57d70
```

All events are sent as POST requests with:
- Content-Type: `application/json`
- Authorization: `Bearer [YOUR_GHL_API_KEY]` (if configured)