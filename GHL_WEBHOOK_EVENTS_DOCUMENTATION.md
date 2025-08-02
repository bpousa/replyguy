# ReplyGuy GHL Webhook Events Documentation

This document provides comprehensive details of all webhook events that send data to Go High Level (GHL) in the ReplyGuy application.

## Overview

The ReplyGuy system sends webhook events to GHL for key user lifecycle events. All webhooks are sent to the configured `GHL_WEBHOOK_URL` when `GHL_SYNC_ENABLED=true`.

**Base Webhook Flow:**
```
Trigger Event → Internal API → /api/ghl/webhook → /api/ghl/sync-user → External GHL System
```

---

## 1. USER_CREATED

**Trigger:** New user account creation (both free and paid accounts)  
**Source:** Database trigger on `auth.users` table insert  
**Endpoint:** `/api/auth/handle-new-user`

### Parameters:
```json
{
  "event": "user_created",
  "userId": "uuid",
  "data": {
    "email": "string",
    "full_name": "string|null",
    "phone": "string|null", 
    "sms_opt_in": "boolean",
    "selected_plan": "string"
  },
  "metadata": {
    "source": "signup_form",
    "timestamp": "ISO_8601_string",
    "trial_offer_url": "string|null",
    "trial_offer_token": "string|null", 
    "trial_expires_at": "ISO_8601_string|null"
  }
}
```

### Possible Values:
- **event**: Always `"user_created"`
- **userId**: UUID of the created user
- **email**: User's email address
- **full_name**: User's full name or null if not provided
- **phone**: E.164 formatted phone number or null
- **sms_opt_in**: Boolean indicating SMS marketing consent
- **selected_plan**: Plan selected during signup (`"free"`, `"basic"`, `"pro"`, `"business"`)
- **source**: Always `"signup_form"`
- **trial_offer_url**: URL for trial offer page (generated for all new users)
- **trial_offer_token**: Token for trial offer (generated for all new users)

### Description:
Fired immediately when any new user creates an account, whether free or paid. Includes trial offer generation for follow-up marketing. This webhook is triggered by the database trigger on successful user registration.

---

## 2. USER_PROFILE_COMPLETED

**Trigger:** User completes their profile after initial signup  
**Source:** Profile completion form submission  
**Endpoint:** `/api/user/complete-profile`

### Parameters:
```json
{
  "event": "user_profile_completed",
  "userId": "uuid",
  "data": {
    "email": "string",
    "full_name": "string",
    "phone": "string|null",
    "sms_opt_in": "boolean"
  },
  "metadata": {
    "source": "profile_completion_modal",
    "timestamp": "ISO_8601_string",
    "completed_fields": {
      "full_name": "boolean",
      "phone": "boolean", 
      "sms_opt_in": "boolean"
    }
  }
}
```

### Possible Values:
- **event**: Always `"user_profile_completed"`
- **userId**: UUID of the user
- **full_name**: Updated full name (always present when this event fires)
- **phone**: E.164 formatted phone number or null
- **sms_opt_in**: Boolean indicating SMS marketing consent
- **source**: Always `"profile_completion_modal"`
- **completed_fields**: Object showing which fields were completed

### Description:
Fired when a user fills out additional profile information after their initial signup. This indicates higher engagement and provides more complete user data for GHL lead nurturing.

---

## 3. SUBSCRIPTION_STARTED

**Trigger:** User starts a paid subscription (including $1 trials)  
**Source:** Stripe webhook `checkout.session.completed`  
**Endpoint:** `/api/stripe/webhook`

### Parameters:
```json
{
  "event": "subscription_started",
  "userId": "uuid",
  "data": {
    "planId": "string",
    "subscriptionId": "string",
    "customerId": "string",
    "status": "string"
  },
  "metadata": {
    "billingCycle": "monthly|yearly",
    "trial": "boolean"
  }
}
```

### Possible Values:
- **event**: Always `"subscription_started"`
- **planId**: Plan identifier (`"basic"`, `"pro"`, `"business"`)
- **subscriptionId**: Stripe subscription ID
- **customerId**: Stripe customer ID
- **status**: Stripe subscription status (`"active"`, `"trialing"`)
- **billingCycle**: `"monthly"` or `"yearly"`
- **trial**: `true` if this is a trial subscription (including $1 trials)

### Description:
Fired when a user successfully starts any paid subscription, including $1 trial offers. This is a high-value conversion event for GHL tracking and follow-up sequences.

---

## 4. SUBSCRIPTION_UPDATED

**Trigger:** User changes their subscription plan or billing  
**Source:** Stripe webhook `customer.subscription.updated`  
**Endpoint:** `/api/stripe/webhook`

### Parameters:
```json
{
  "event": "subscription_updated", 
  "userId": "uuid",
  "data": {
    "oldPlanId": "string",
    "newPlanId": "string", 
    "oldStatus": "string",
    "newStatus": "string"
  },
  "metadata": {
    "eventType": "customer.subscription.updated",
    "priceId": "string"
  }
}
```

### Possible Values:
- **event**: Always `"subscription_updated"`
- **oldPlanId/newPlanId**: Plan identifiers (`"free"`, `"basic"`, `"pro"`, `"business"`)
- **oldStatus/newStatus**: Stripe statuses (`"active"`, `"canceled"`, `"past_due"`, `"trialing"`)
- **eventType**: Always `"customer.subscription.updated"`
- **priceId**: Stripe price ID that triggered the update

### Description:
Fired when a user upgrades, downgrades, or changes their subscription in any way. Useful for tracking plan changes and triggering appropriate GHL automation sequences.

---

## 5. PAYMENT_FAILED

**Trigger:** Payment fails for a subscription  
**Source:** Stripe webhook `invoice.payment_failed`  
**Endpoint:** `/api/stripe/webhook`

### Parameters:
```json
{
  "event": "payment_failed",
  "userId": "uuid", 
  "data": {
    "subscriptionId": "string",
    "invoiceId": "string",
    "amount": "number"
  },
  "metadata": {
    "failureReason": "string",
    "nextRetryDate": "ISO_8601_string",
    "retryCount": "number"
  }
}
```

### Possible Values:
- **event**: Always `"payment_failed"`
- **subscriptionId**: Stripe subscription ID
- **invoiceId**: Stripe invoice ID that failed
- **amount**: Failed payment amount in dollars (e.g. 29.00)
- **failureReason**: Reason for failure or `"unknown"`
- **nextRetryDate**: When Stripe will retry the payment
- **retryCount**: Number of retry attempts (starts at 1)

### Description:
Fired when a subscription payment fails. Critical for triggering payment recovery sequences in GHL and preventing involuntary churn.

---

## 6. PAYMENT_RECOVERED

**Trigger:** Failed payment is successfully recovered  
**Source:** Stripe webhook `invoice.payment_succeeded` (after failure)  
**Endpoint:** `/api/stripe/webhook`

### Parameters:
```json
{
  "event": "payment_recovered",
  "userId": "uuid",
  "data": {
    "subscriptionId": "string", 
    "invoiceId": "string",
    "amount": "number"
  },
  "metadata": {
    "recoveredAt": "ISO_8601_string"
  }
}
```

### Possible Values:
- **event**: Always `"payment_recovered"`
- **subscriptionId**: Stripe subscription ID
- **invoiceId**: Stripe invoice ID that was paid
- **amount**: Recovered payment amount in dollars
- **recoveredAt**: When the payment was successfully recovered

### Description:
Fired when a previously failed payment is successfully processed. Good trigger for thank you messages and retention bonuses in GHL.

---

## 7. SUBSCRIPTION_CANCELED

**Trigger:** User cancels their subscription  
**Source:** Stripe webhook `customer.subscription.deleted`  
**Endpoint:** `/api/stripe/webhook`

### Parameters:
```json
{
  "event": "subscription_canceled",
  "userId": "uuid",
  "data": {
    "subscriptionId": "string",
    "customerId": "string"
  },
  "metadata": {
    "canceledAt": "ISO_8601_string"
  }
}
```

### Possible Values:
- **event**: Always `"subscription_canceled"`
- **subscriptionId**: Stripe subscription ID that was canceled
- **customerId**: Stripe customer ID
- **canceledAt**: When the cancellation occurred

### Description:
Fired when a user's subscription is canceled (immediately, not at period end). User is automatically moved back to free plan. Triggers win-back sequences in GHL.

---

## 8. TRIAL_ENDING

**Trigger:** User's trial period is ending soon (3 days warning)  
**Source:** Stripe webhook `customer.subscription.trial_will_end`  
**Endpoint:** `/api/stripe/webhook`

### Parameters:
```json
{
  "event": "trial_ending",
  "userId": "uuid",
  "data": {
    "subscriptionId": "string",
    "customerId": "string"
  },
  "metadata": {
    "trialEndDate": "ISO_8601_string",
    "daysRemaining": 3
  }
}
```

### Possible Values:
- **event**: Always `"trial_ending"`
- **subscriptionId**: Stripe subscription ID
- **customerId**: Stripe customer ID
- **trialEndDate**: When the trial will end
- **daysRemaining**: Always `3` (3-day warning)

### Description:
Fired 3 days before a trial subscription ends. Critical for trial conversion campaigns and ensuring users don't lose access unexpectedly.

---

## Implementation Details

### Webhook Processing Flow:
1. **Event Trigger** → Various parts of the application
2. **Internal API Call** → `/api/ghl/webhook` 
3. **User Data Sync** → `/api/ghl/sync-user` (gets full user profile)
4. **External Webhook** → Configured GHL webhook URL

### Configuration:
- **Environment Variable**: `GHL_SYNC_ENABLED=true` (must be set)
- **Webhook URL**: Configured in `GHL_WEBHOOK_URL` environment variable
- **API Key**: Optional authentication via `GHL_API_KEY`

### User Data Format:
All webhooks include full user profile data via the sync-user process:

```json
{
  "external_id": "uuid",
  "email": "string", 
  "name": "string",
  "phone": "string|null",
  "phone_verified": "boolean",
  "sms_opt_in": "boolean",
  "sms_opt_in_date": "ISO_8601_string|null",
  "timezone": "string",
  "member_level": "free|x_basic|x_pro|x_business",
  "subscription_status": "string",
  "billing_day": "number|null",
  "trial_ends": "ISO_8601_string|null",
  "daily_goal": "number",
  "total_replies": "number", 
  "signup_date": "ISO_8601_string",
  "last_active": "ISO_8601_string|null",
  "payment_status": "current|failed|canceled|trial",
  "payment_failed_date": "ISO_8601_string|null",
  "payment_retry_count": "number|null",
  "referred_by": "string|null",
  "referral_code": "string",
  "monthly_reply_limit": "number",
  "monthly_meme_limit": "number",
  "features": "string[]"
}
```

### Retry Logic:
- Failed webhooks are retried up to 3 times
- 5-second delay between retries, increasing with each attempt
- Failed events are logged for debugging

### Testing:
Use `/api/ghl/test-data` endpoint to send test webhook events to GHL for automation setup and testing.

---

## GHL Automation Triggers

Based on these webhook events, you can create the following GHL automation sequences:

1. **user_created** → Welcome sequence + trial offer follow-up
2. **user_profile_completed** → Enhanced onboarding with personalization  
3. **subscription_started** → Customer onboarding + feature tutorials
4. **subscription_updated** → Plan change acknowledgment + feature updates
5. **payment_failed** → Payment recovery sequence (3 attempts)
6. **payment_recovered** → Thank you + retention bonus offer
7. **subscription_canceled** → Win-back campaign + feedback request
8. **trial_ending** → Trial conversion campaign (upgrade urgency)

Each event includes rich user data and context for highly targeted automation sequences.