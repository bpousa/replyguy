# Stripe Integration Analysis Report

## Overview
I've analyzed the Stripe integration in the ReplyGuy codebase and found several critical issues that need to be addressed.

## Key Findings

### 1. **Missing User Authentication in Stripe Routes**

#### `/app/api/stripe/checkout/route.ts`
- **Issue**: Creates temporary user IDs instead of using authenticated users
- **Line 17-18**: `const userId = 'temp-' + Date.now();`
- **Impact**: Subscriptions won't be properly linked to authenticated users

#### `/app/api/stripe/portal/route.ts`
- **Status**: Properly implements authentication using `createServerClient` and `supabase.auth.getUser()`
- **Good**: This route correctly validates authenticated users before creating portal sessions

### 2. **Plan ID Mismatches**

The system uses different plan IDs in different places:

#### Database (`subscription_plans` table):
- `free`, `basic`, `pro`, `business` (new naming)
- `growth`, `professional`, `enterprise` (legacy aliases, marked as inactive)

#### Code (`check-limits/route.ts`):
- Maps old names to new: `growth` → `basic`, `professional` → `pro`, `enterprise` → `business`
- Lines 92-96 implement this mapping

### 3. **Missing Database Function**

#### `get_current_usage` Function
- **Called by**: `/app/api/check-limits/route.ts` (line 73) and `/app/api/process/route.ts`
- **Status**: Function doesn't exist in any migration
- **Impact**: Usage tracking will fail
- **Solution**: Created script at `/scripts/create-missing-get-current-usage-function.sql`

### 4. **Usage Tracking Not Implemented**

#### `/app/api/process/route.ts`
- **Issue**: No usage tracking after successful reply generation
- **Missing**: Call to `track_daily_usage` function after generating replies
- **Impact**: Users can exceed limits without enforcement

### 5. **Upgrade Modal Component**

#### `/app/components/upgrade-modal.tsx`
- **Status**: Component exists and is well-structured
- **Issue**: Links to `/auth/signup` instead of Stripe checkout
- **Line 107**: Should create Stripe checkout session instead

### 6. **Stripe Service Implementation**

#### `/app/lib/services/stripe.service.ts`
- **Good**: Comprehensive implementation with all necessary methods
- **Features**: Checkout sessions, portal sessions, webhooks, usage tracking
- **Issue**: `getCurrentUsage` method (line 286) returns simplified data structure

### 7. **Webhook Handler**

#### `/app/api/stripe/webhook/route.ts`
- **Status**: Properly implemented with signature verification
- **Handles**: checkout completion, subscription updates, cancellations, payment failures
- **Good**: Updates database correctly after Stripe events

## Critical Issues to Fix

### 1. **Authentication in Checkout Route**
The checkout route needs proper authentication:

```typescript
// Add this to checkout/route.ts
const cookieStore = cookies();
const supabase = createServerClient(cookieStore);
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const userId = user.id; // Instead of 'temp-' + Date.now()
```

### 2. **Usage Tracking Implementation**
Add usage tracking to `/app/api/process/route.ts` after successful generation:

```typescript
// After successful reply generation
if (user) {
  await supabase.rpc('track_daily_usage', {
    p_user_id: user.id,
    p_usage_type: 'reply',
    p_count: 1
  });
  
  if (memeUrl) {
    await supabase.rpc('track_daily_usage', {
      p_user_id: user.id,
      p_usage_type: 'meme',
      p_count: 1
    });
  }
}
```

### 3. **Create Missing Database Function**
Run the script to create the `get_current_usage` function:
```bash
psql $DATABASE_URL -f scripts/create-missing-get-current-usage-function.sql
```

### 4. **Fix Upgrade Modal**
Update the upgrade modal to use Stripe checkout:

```typescript
// Replace Link with button that calls checkout API
const handleUpgrade = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, billingCycle })
  });
  
  const { url } = await response.json();
  window.location.href = url;
};
```

### 5. **Database Migration Needed**
Create a new migration to add the missing `get_current_usage` function and ensure is_active column exists on subscriptions table.

## Plan Naming Consistency

The system should standardize on the new naming convention:
- `free` (not growth)
- `basic` (not growth)
- `pro` (not professional)
- `business` (not enterprise)

The mapping in `check-limits/route.ts` handles backward compatibility but new code should use the new names.

## Missing Features

1. **Subscription management UI**: No page for users to view/manage their subscription
2. **Usage dashboard**: No visualization of current usage vs limits
3. **Billing history**: No way to view past invoices
4. **Plan comparison**: Pricing page needs to show current plan and upgrade options

## Security Considerations

1. **Webhook endpoint**: Properly validates Stripe signatures ✓
2. **Portal route**: Properly authenticates users ✓
3. **Checkout route**: NEEDS authentication fix ❌
4. **Environment variables**: All properly configured ✓

## Next Steps

1. Fix authentication in checkout route (CRITICAL)
2. Implement usage tracking in process route (CRITICAL)
3. Create and run migration for `get_current_usage` function
4. Update upgrade modal to use Stripe checkout
5. Create subscription management page
6. Add usage visualization to dashboard
7. Standardize plan naming throughout the codebase