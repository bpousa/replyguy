# GHL Custom Fields Setup Guide for ReplyGuy Integration

## Overview
This guide outlines the custom fields you need to create in GoHighLevel (GHL) to properly sync user data from ReplyGuy.

## Important Note
The webhook integration is already working and will send data to your GHL webhook URL. You just need to create the custom fields manually in GHL to receive and store this data.

## Custom Fields to Create

You'll need to manually create these custom fields in your GHL location settings:

### 1. **ReplyGuy User ID**
- **Field Type**: Text
- **Field Key**: `replyguy_user_id`
- **Description**: Unique identifier from ReplyGuy system
- **Example Value**: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### 2. **Member Level** ⭐ (Important for automation)
- **Field Type**: Text or Dropdown
- **Field Key**: `member_level`
- **Description**: Subscription tier
- **Possible Values**:
  - `free` - Free tier users
  - `x_basic` - Growth/Basic plan ($19/mo)
  - `x_pro` - Professional plan ($49/mo)
  - `x_business` - Enterprise/Business plan ($99/mo)

### 3. **Product Purchased**
- **Field Type**: Text
- **Field Key**: `product_purchased`
- **Description**: Name of the product/plan purchased
- **Possible Values**:
  - `Free` - Free tier
  - `Growth` - Basic plan
  - `Professional` - Pro plan
  - `Enterprise` - Business plan

### 4. **Subscription Status**
- **Field Type**: Text or Dropdown
- **Field Key**: `subscription_status`
- **Description**: Current subscription status
- **Possible Values**: `active`, `trialing`, `past_due`, `canceled`, `unpaid`

### 5. **Daily Goal**
- **Field Type**: Number
- **Field Key**: `daily_goal`
- **Description**: Daily reply goal set by user
- **Example Value**: `10`

### 6. **Total Replies**
- **Field Type**: Number
- **Field Key**: `total_replies`
- **Description**: Total number of replies generated
- **Example Value**: `150`

### 7. **Signup Date**
- **Field Type**: Date
- **Field Key**: `signup_date`
- **Description**: Date when user signed up
- **Format**: `YYYY-MM-DD`

### 8. **Last Active**
- **Field Type**: Date
- **Field Key**: `last_active`
- **Description**: Date of last activity
- **Format**: `YYYY-MM-DD`

### 9. **Trial Ends**
- **Field Type**: Date
- **Field Key**: `trial_ends`
- **Description**: Trial end date (if applicable)
- **Format**: `YYYY-MM-DD`

### 10. **Billing Day**
- **Field Type**: Number
- **Field Key**: `billing_day`
- **Description**: Day of month for billing (1-31)
- **Example Value**: `15`

### 11. **Payment Status** ⭐ (Important for automation)
- **Field Type**: Text or Dropdown
- **Field Key**: `payment_status`
- **Description**: Current payment status
- **Possible Values**:
  - `current` - Payment is up to date
  - `failed` - Payment has failed
  - `canceled` - Subscription was canceled
  - `trial` - User is in trial period

### 12. **Payment Failed Date**
- **Field Type**: Date
- **Field Key**: `payment_failed_date`
- **Description**: Date when payment last failed
- **Format**: `YYYY-MM-DD`

### 13. **Payment Retry Count**
- **Field Type**: Number
- **Field Key**: `payment_retry_count`
- **Description**: Number of payment retry attempts
- **Example Value**: `2`

### 14. **Referred By**
- **Field Type**: Text/Email
- **Field Key**: `referred_by`
- **Description**: Email of referrer
- **Example Value**: `referrer@example.com`

### 15. **Referral Code**
- **Field Type**: Text
- **Field Key**: `referral_code`
- **Description**: User's referral code
- **Example Value**: `REFABCD123`

### 16. **Monthly Reply Limit**
- **Field Type**: Number
- **Field Key**: `monthly_reply_limit`
- **Description**: Monthly reply limit for plan
- **Example Values**: `10`, `300`, `500`, `1000`

### 17. **Monthly Meme Limit**
- **Field Type**: Number
- **Field Key**: `monthly_meme_limit`
- **Description**: Monthly meme generation limit
- **Example Values**: `0`, `10`, `50`, `100`

### 18. **Features Enabled**
- **Field Type**: Text (Long Text/Textarea)
- **Field Key**: `features_enabled`
- **Description**: Comma-separated list of enabled features
- **Example Value**: `meme_generation,write_like_me,style_matching,research,long_replies`

## Data Mapping from ReplyGuy

When ReplyGuy sends user data to GHL, it will populate these fields with the following data:

### User Created Event
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "customFields": {
    "replyguy_user_id": "uuid-here",
    "member_level": "free",
    "product_purchased": "Free",
    "subscription_status": "trialing",
    "daily_goal": 10,
    "total_replies": 0,
    "signup_date": "2025-01-12",
    "payment_status": "trial",
    "monthly_reply_limit": 10,
    "monthly_meme_limit": 0,
    "referral_code": "REF12345"
  }
}
```

### Subscription Updated Event
```json
{
  "customFields": {
    "member_level": "x_pro",
    "product_purchased": "Professional",
    "subscription_status": "active",
    "payment_status": "current",
    "monthly_reply_limit": 500,
    "monthly_meme_limit": 50,
    "features_enabled": "meme_generation,write_like_me,style_matching"
  }
}
```

### Payment Failed Event
```json
{
  "customFields": {
    "payment_status": "failed",
    "payment_failed_date": "2025-01-12",
    "payment_retry_count": 1
  }
}
```

## Setting Up Automations in GHL

Based on these custom fields, you can create automations for:

1. **New User Welcome Series**
   - Trigger: Contact created with `member_level` = `free`
   - Actions: Send welcome email series, trial tips

2. **Paid Plan Onboarding**
   - Trigger: `member_level` changes to `x_basic`, `x_pro`, or `x_business`
   - Actions: Send plan-specific onboarding, feature tutorials

3. **Payment Failed Recovery**
   - Trigger: `payment_status` = `failed`
   - Actions: Send payment update reminders, retry sequences

4. **Trial Ending Campaigns**
   - Trigger: `trial_ends` is within 3 days
   - Actions: Send upgrade offers, feature highlights

5. **Cancellation Win-Back**
   - Trigger: `subscription_status` = `canceled`
   - Actions: Send win-back offers, feedback surveys

## Important Notes

1. **Field Keys Must Match**: The field keys (like `member_level`) must match exactly what's listed above for the integration to work properly.

2. **Data Types**: Make sure to use the correct data type for each field (Text, Number, Date).

3. **Dropdown Options**: For fields like `member_level` and `payment_status`, you can create them as dropdown fields with the specific values listed.

4. **Testing**: After creating the fields, test the webhook integration using the ReplyGuy test endpoint to ensure data is flowing correctly.

## Support

If you need help setting up these fields or have questions about the integration, please refer to:
- GHL Custom Fields Documentation
- ReplyGuy API Documentation at `/api/ghl/test-data`