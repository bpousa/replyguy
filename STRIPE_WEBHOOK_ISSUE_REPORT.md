# 🚨 Stripe Webhook Configuration Error Report

**Issue**: Stripe webhook endpoint has failed 246 times since June 23, 2025  
**URL**: https://replyguy.appendment.com/api/webhooks/stripe  
**Test Date**: June 27, 2025

## 🔍 Root Cause Identified

### URL Mismatch Issue

There is a **critical mismatch** between:

1. **Stripe Configuration**: Webhook URL is `/api/webhooks/stripe`
2. **Application Route**: Actual webhook is at `/api/stripe/webhook`
3. **Middleware Exception**: Only allows `/api/stripe/webhook`

### What's Happening

1. Stripe sends webhooks to: `https://replyguy.appendment.com/api/webhooks/stripe`
2. This URL doesn't exist (no route at this path)
3. Request hits middleware which requires authentication
4. Middleware returns 401 "Unauthenticated" error
5. Stripe marks webhook as failed

## 📊 Test Results

### Webhook Endpoint Test
```
GET /api/webhooks/stripe → 401 Unauthorized
POST /api/webhooks/stripe → 401 Unauthorized
Response: {"error":"Unauthenticated","message":"Please sign in to access this resource"}
```

### Actual Webhook Location
- File exists at: `/app/api/stripe/webhook/route.ts`
- Correct URL would be: `/api/stripe/webhook`
- Middleware allows: `/api/stripe/webhook` (without auth)

## 🛠️ Required Fixes

### Option 1: Update Stripe Dashboard (Recommended)
1. Log into Stripe Dashboard
2. Go to Webhooks settings
3. Change webhook URL from:
   - ❌ `https://replyguy.appendment.com/api/webhooks/stripe`
   - ✅ `https://replyguy.appendment.com/api/stripe/webhook`
4. Save changes

### Option 2: Move Webhook Route
1. Create directory: `/app/api/webhooks/stripe/`
2. Move webhook file to: `/app/api/webhooks/stripe/route.ts`
3. Update middleware.ts line 13 to:
   ```typescript
   !pathname.startsWith('/api/webhooks/')
   ```

### Option 3: Add URL Rewrite
Add to `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/api/webhooks/stripe',
      destination: '/api/stripe/webhook',
    },
  ]
}
```

## 🔒 Security Considerations

The webhook implementation is **secure** with:
- ✅ Stripe signature verification
- ✅ Idempotency checks (prevents duplicate processing)
- ✅ Error handling and logging
- ✅ Proper status code returns

## 📋 Middleware Configuration

Current middleware (line 13):
```typescript
!pathname.startsWith('/api/stripe/webhook')
```

This correctly excludes `/api/stripe/webhook` from authentication, but NOT `/api/webhooks/stripe`.

## 🎯 Immediate Action Required

**RECOMMENDED**: Update the webhook URL in Stripe Dashboard to:
```
https://replyguy.appendment.com/api/stripe/webhook
```

This is the quickest fix and requires no code changes.

## ⚠️ Impact

Until fixed:
- Subscription updates won't be processed
- Payment failures won't be handled
- Checkout completions may be delayed
- Customer billing status may be incorrect

## 📝 Testing After Fix

After updating the URL:
1. Send a test webhook from Stripe Dashboard
2. Check for 200 OK response
3. Verify event appears in `stripe_webhook_events` table
4. Monitor for any 401 errors

## 🔍 Additional Findings

The webhook handler is well-implemented with:
- Comprehensive event handling (checkout, subscriptions, payments)
- Database logging of all events
- Proper error handling
- Support for replay/debugging

The only issue is the URL mismatch preventing Stripe from reaching the handler.

---

*Report generated through automated testing on June 27, 2025*