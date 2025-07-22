# GHL Custom Fields for ReplyGuy Webhook Integration

This document lists all custom fields that need to be created in GoHighLevel (GHL) to receive data from the ReplyGuy webhook integration.

## User Profile Fields

### Basic Information

| Field Name | Parameter Name | Field Type | Description | Example Values |
|------------|---------------|------------|-------------|----------------|
| User ID | `user_id` | Text | Unique identifier from Supabase | `1d05adc2-7566-48de-b507-e0b541274161` |
| Email | `email` | Email | User's email address | `user@example.com` |
| Full Name | `full_name` | Text | User's full name | `John Doe` |
| Phone | `phone` | Phone | User's phone number (E.164 format) | `+12125551234` |
| SMS Opt-In | `sms_opt_in` | Boolean | Whether user opted into SMS | `true`, `false` |
| Referral Code | `referral_code` | Text | User's unique referral code | `ABC123` |
| Created At | `created_at` | Date/Time | When user account was created | `2025-07-22T10:30:00Z` |
| Updated At | `updated_at` | Date/Time | Last profile update | `2025-07-22T10:30:00Z` |

### Subscription Information

| Field Name | Parameter Name | Field Type | Description | Example Values |
|------------|---------------|------------|-------------|----------------|
| Plan ID | `plan_id` | Text | Current subscription plan | `free`, `growth`, `professional`, `enterprise` |
| Subscription Status | `subscription_status` | Text | Current subscription status | `active`, `canceled`, `past_due`, `trialing` |
| Current Period Start | `current_period_start` | Date/Time | Start of current billing period | `2025-07-01T00:00:00Z` |
| Current Period End | `current_period_end` | Date/Time | End of current billing period | `2025-07-31T23:59:59Z` |
| Stripe Customer ID | `stripe_customer_id` | Text | Stripe customer identifier | `cus_ABC123xyz` |
| Stripe Subscription ID | `stripe_subscription_id` | Text | Stripe subscription identifier | `sub_ABC123xyz` |

### Trial Offer Information

| Field Name | Parameter Name | Field Type | Description | Example Values |
|------------|---------------|------------|-------------|----------------|
| Trial Offer URL | `trial_offer_url` | URL | Direct link to claim trial offer | `https://replyguy.appendment.com/auth/trial-offer?token=abc123` |
| Trial Offer Token | `trial_offer_token` | Text | Unique trial offer token | `64-character-hex-string` |
| Trial Expires At | `trial_expires_at` | Date/Time | When trial offer expires | `2025-07-29T10:30:00Z` |
| Trial Offer Email Sent | `trial_offer_email_sent_at` | Date/Time | When trial email was sent | `2025-07-22T10:30:00Z` |
| Has Seen Trial Offer | `has_seen_trial_offer` | Boolean | Whether user has viewed trial offer | `true`, `false` |

### Usage Statistics

| Field Name | Parameter Name | Field Type | Description | Example Values |
|------------|---------------|------------|-------------|----------------|
| Daily Goal | `daily_goal` | Number | User's daily reply goal | `10` |
| Timezone | `timezone` | Text | User's timezone | `America/New_York` |
| Total Replies | `total_replies` | Number | Total replies generated all-time | `150` |
| Monthly Replies | `monthly_replies` | Number | Replies this billing period | `50` |
| Monthly Memes | `monthly_memes` | Number | Memes generated this period | `5` |

### Referral Information

| Field Name | Parameter Name | Field Type | Description | Example Values |
|------------|---------------|------------|-------------|----------------|
| Referred By | `referred_by_code` | Text | Referral code used during signup | `XYZ789` |
| Referrer ID | `referrer_id` | Text | ID of user who referred them | `user-id-here` |
| Total Referrals | `total_referrals` | Number | Number of users they've referred | `3` |
| Successful Referrals | `successful_referrals` | Number | Referrals that converted to paid | `1` |

## Event-Specific Fields

### Event Metadata

| Field Name | Parameter Name | Field Type | Description | Example Values |
|------------|---------------|------------|-------------|----------------|
| Event Type | `event` | Text | Type of webhook event | `user_created`, `subscription_started`, `subscription_updated`, `payment_failed`, `trial_ending` |
| Event Timestamp | `timestamp` | Date/Time | When event occurred | `2025-07-22T10:30:00Z` |
| Event Source | `source` | Text | Where event originated | `signup_form`, `stripe_webhook`, `admin_action` |

### Payment Information (for payment events)

| Field Name | Parameter Name | Field Type | Description | Example Values |
|------------|---------------|------------|-------------|----------------|
| Payment Amount | `payment_amount` | Number | Amount in cents | `1900` (for $19.00) |
| Payment Currency | `payment_currency` | Text | Currency code | `USD` |
| Payment Status | `payment_status` | Text | Payment status | `succeeded`, `failed`, `pending` |
| Failure Reason | `failure_reason` | Text | Why payment failed | `insufficient_funds`, `card_declined` |

## Webhook Payload Structure

### User Created Event
```json
{
  "event": "user_created",
  "timestamp": "2025-07-22T10:30:00Z",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+12125551234",
    "sms_opt_in": true,
    "referral_code": "ABC123",
    "created_at": "2025-07-22T10:30:00Z"
  },
  "metadata": {
    "source": "signup_form",
    "trial_offer_url": "https://replyguy.appendment.com/auth/trial-offer?token=...",
    "trial_offer_token": "token-here",
    "trial_expires_at": "2025-07-29T10:30:00Z"
  }
}
```

### Subscription Started Event
```json
{
  "event": "subscription_started",
  "timestamp": "2025-07-22T10:30:00Z",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "stripe_customer_id": "cus_ABC123"
  },
  "subscription": {
    "plan_id": "growth",
    "status": "active",
    "stripe_subscription_id": "sub_ABC123",
    "current_period_start": "2025-07-22T00:00:00Z",
    "current_period_end": "2025-08-22T00:00:00Z"
  }
}
```

## GHL Setup Instructions

1. **Create Custom Fields**: In GHL, navigate to Settings > Custom Fields and create each field listed above
2. **Field Naming**: Use the exact parameter names as the field keys
3. **Field Types**: Match the field types specified (Text, Number, Boolean, etc.)
4. **Webhook Automation**: In your webhook automation, map these fields from the webhook payload to the contact record

## Notes

- All date/time fields are in ISO 8601 format
- Phone numbers are in E.164 format (e.g., `+12125551234`)
- Boolean fields will be `true` or `false` (not "yes"/"no")
- User ID fields are UUIDs from Supabase
- Monetary amounts are in cents (multiply by 100)