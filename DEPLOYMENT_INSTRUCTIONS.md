# 🚀 Deployment Instructions - API Fixes

**Deployment Date**: June 27, 2025  
**Critical**: Database migration required!

## 📋 Deployment Steps

### 1. Wait for Vercel Deployment
- Code pushed to GitHub at commit `033c8b2`
- Wait ~90 seconds for automatic Vercel deployment
- Check deployment status at: https://vercel.com/dashboard

### 2. Apply Database Migration
**IMPORTANT**: This step is required for usage tracking to work!

#### Option A: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/025_fix_usage_functions.sql`
4. Run the migration
5. Verify no errors

#### Option B: Supabase CLI
```bash
supabase db push
```

### 3. Verify Deployment

#### Quick Health Check
```bash
# Check if APIs are responding
curl https://replyguy.appendment.com/api/auth/debug
curl https://replyguy.appendment.com/api/user/plan -H "Cookie: [your-auth-cookies]"
```

#### Full Test Procedure
1. Login to https://replyguy.appendment.com
2. Generate a test reply
3. Check daily counter increments (0/10 → 1/10)
4. Refresh page - counter should persist
5. Check browser console - no 500/404/406 errors

## 🔍 What Was Fixed

### API Endpoints
- ✅ `/api/user/usage` - Fixed column names, added graceful error handling
- ✅ `/api/process` - Added server auth, simplified queries
- ✅ `/api/user/plan` - Already fixed in previous deployment

### Database
- ✅ `get_current_usage()` - Robust function with fallbacks
- ✅ `track_daily_usage()` - Handles missing users, updates all tables
- ✅ Column name fixes (usage_date → date)

### Frontend
- ✅ Removed duplicate tracking from dashboard
- ✅ All tracking now handled by backend

## ⚠️ Troubleshooting

### If usage still doesn't increment:
1. Check if migration was applied:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'get_current_usage';
   ```
2. Check daily_usage table:
   ```sql
   SELECT * FROM daily_usage WHERE user_id = '[user-id]' ORDER BY date DESC LIMIT 5;
   ```

### If 500 errors persist:
1. Check Vercel function logs
2. Ensure all environment variables are set
3. Verify Supabase connection

## ✅ Success Criteria
- Daily counter increments with each reply
- No API errors in console
- Usage persists across page refreshes
- Monthly usage displays correctly

---

**Note**: The database migration is REQUIRED. Without it, usage tracking will fail even with the code fixes deployed.