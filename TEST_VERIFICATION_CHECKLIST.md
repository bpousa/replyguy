# 🎯 Test Verification Checklist - Quick Reference

## 🔑 Priority Tests (Must Pass)

### 1. Daily Counter Increment
- [ ] Login → Generate reply → Counter goes 0→1
- [ ] Generate 2 more → Counter goes 1→2→3
- [ ] Refresh page → Counter stays at 3
- [ ] **CRITICAL**: If counter stays at 0 = FAIL

### 2. No API Errors
- [ ] No 500 errors in console
- [ ] No 404 errors (except expected routes)
- [ ] No 406 database errors
- [ ] No "Classification failed" messages

### 3. Core APIs Working
- [ ] `/api/user/plan` → 200 OK
- [ ] `/api/user/usage` → 200 OK
- [ ] `/api/process` → 200 OK (when generating)
- [ ] `/api/user/daily-goal` → 200 OK

## 🧪 Test Accounts
| Use This | For This Test |
|----------|---------------|
| test-pro@replyguy.com | Main functionality |
| test-free@replyguy.com | Limit testing (5/month) |

## ⚡ Quick Smoke Test (2 mins)
1. Login (test-pro)
2. Generate 1 reply
3. Check counter = 1
4. Refresh
5. Check counter still = 1
6. Check console for errors

## 🚨 Red Flags (Immediate Fail)
- Counter stuck at 0
- "track_daily_usage" errors
- Process API returning 500
- Missing database tables (404)
- "Failed to generate reply" but UI shows success

## ✅ Success Indicators
- Counter increments properly
- Persists after refresh
- Clean console (no errors)
- All features accessible
- Settings save correctly

## 📊 What to Screenshot
- Daily goal showing correct count
- Console showing no errors
- Network tab showing 200 OKs
- Monthly usage display

---
**Bottom Line**: If daily counter increments and persists with no console errors = PASS