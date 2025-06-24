# Pricing Discrepancy Report

## Summary
There is a significant discrepancy between the pricing limits stored in the database and what's displayed on the pricing page UI.

## Database Values (from migration 008_update_pricing_plans.sql)

### Current Plans in Database:
1. **Free Plan**
   - Reply limit: 10/month
   - Price: $0

2. **Basic Plan**
   - Reply limit: 50/month
   - Price: $9/month ($90/year)

3. **Pro Plan** (Most Popular)
   - Reply limit: 150/month
   - Price: $19/month ($190/year)

4. **Business Plan**
   - Reply limit: 300/month
   - Price: $29/month ($290/year)

5. **Enterprise Plan**
   - Reply limit: 500/month
   - Price: $49/month ($490/year)

## UI Display Values (from pricing-cards.tsx)

### Plans Shown to Users:
1. **Free Plan**
   - Displays: "10 replies per month" ✅ MATCHES
   - Price: $0 ✅ MATCHES

2. **Basic Plan**
   - Displays: "50 replies per month" ✅ MATCHES
   - Price: $19/month ❌ MISMATCH (DB: $9/month)

3. **Pro Plan**
   - Displays: "150 replies per month" ✅ MATCHES
   - Price: $49/month ❌ MISMATCH (DB: $19/month)

4. **Business Plan**
   - Displays: "500 replies per month" ❌ MISMATCH (DB: 300/month)
   - Price: $99/month ❌ MISMATCH (DB: $29/month)

## Additional Discrepancies

### Dashboard Hardcoded Limits (dashboard/page.tsx)
The dashboard has hardcoded plan limits that don't match either the database or UI:
```typescript
const planLimits = {
  free: 10,      // ✅ Matches DB
  basic: 50,     // ✅ Matches DB
  pro: 150,      // ✅ Matches DB
  business: 500, // ❌ DB has 300
  enterprise: 1000, // ❌ DB has 500
};
```

## Recommendations

1. **Immediate Action Required**: The pricing displayed to users ($19, $49, $99) is significantly higher than what's in the database ($9, $19, $29). This could lead to:
   - Customer confusion if they're charged the database prices
   - Lost revenue if charging the lower database prices
   - Legal issues if there's a mismatch between advertised and actual prices

2. **Reply Limits**: The Business plan shows 500 replies in the UI but only 300 in the database. The Enterprise plan isn't shown in the UI but exists in the database.

3. **Consistency**: The hardcoded values in the dashboard should be removed and replaced with dynamic queries to the subscription_plans table.

## Source Files Referenced
- Database: `/mnt/c/Projects/replyguy/supabase/migrations/008_update_pricing_plans.sql`
- UI Display: `/mnt/c/Projects/replyguy/app/(marketing)/components/pricing-cards.tsx`
- Dashboard Logic: `/mnt/c/Projects/replyguy/app/dashboard/page.tsx`
- Pricing Docs: `/mnt/c/Projects/replyguy/pricing-updated.md`