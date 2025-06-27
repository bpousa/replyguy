# 🔧 API Fixes Test Guide

**Deployment Time**: June 27, 2025  
**Fixes Deployed**: Classification, usage tracking, and plan fetching

## What Was Fixed

### 1. Classification API (`/api/classify`)
- **Issue**: Using wrong model (gpt-4o) causing failures
- **Fix**: Changed to gpt-3.5-turbo with correct pricing
- **Impact**: Reply generation now works

### 2. User Plan API (`/api/user/plan`)
- **Issue**: Complex nested joins causing 500 errors
- **Fix**: Simplified queries with separate lookups
- **Impact**: Plan data loads correctly

### 3. User Usage API (`/api/user/usage`)
- **Issue**: Endpoint didn't exist (404 errors)
- **Fix**: Created complete endpoint with GET/POST methods
- **Impact**: Usage tracking now functional

### 4. Daily Goal API (`/api/user/daily-goal`)
- **Issue**: Endpoint didn't exist
- **Fix**: Created endpoint for getting/setting daily goals
- **Impact**: Daily goal feature works

## Test Steps

### 1. Test Reply Generation
1. Go to: https://replyguy.appendment.com
2. Login with: `test-pro@replyguy.com` / `TestPro123!`
3. Fill in reply form:
   - Original tweet: "Just launched my new startup!"
   - Your response: "Congratulations on the launch"
   - Response type: Agree
   - Tone: Enthusiastic
4. Click "Generate Reply"
5. **Expected**: Reply generates successfully (no "Classification failed" error)

### 2. Test Usage Tracking
1. After generating a reply, check the dashboard
2. Daily counter should show "1 of 10 replies"
3. Generate another reply
4. Counter should update to "2 of 10 replies"
5. **Expected**: Counter increments with each reply

### 3. Test Daily Goal Setting
1. Go to Settings page
2. Change daily goal to 20
3. Save settings
4. Return to dashboard
5. **Expected**: Shows "X of 20 replies" (not 10)

### 4. Test Plan Data Loading
1. Open browser DevTools > Network tab
2. Refresh dashboard
3. Look for `/api/user/plan` request
4. **Expected**: 200 OK response (not 500 error)

## API Endpoint Tests

### Check Classification
```javascript
// Browser console test
fetch('/api/classify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalTweet: "Test tweet",
    responseIdea: "Test response",
    responseType: "agree",
    tone: "casual"
  })
}).then(r => r.json()).then(console.log)
```

### Check Usage
```javascript
// Get current usage
fetch('/api/user/usage')
  .then(r => r.json())
  .then(console.log)
```

### Check Plan
```javascript
// Get user plan
fetch('/api/user/plan')
  .then(r => r.json())
  .then(console.log)
```

## Expected Console Output

✅ **No errors like**:
- "Classification failed"
- "500 Internal Server Error"
- "404 Not Found"

✅ **Should see**:
- Successful API responses
- Usage counters updating
- Plan data loading

## Test Accounts

| Email | Password | Daily Limit |
|-------|----------|-------------|
| `test-free@replyguy.com` | `TestFree123!` | 5 replies |
| `test-basic@replyguy.com` | `TestBasic123!` | 50 replies |
| `test-pro@replyguy.com` | `TestPro123!` | 200 replies |
| `test-business@replyguy.com` | `TestBusiness123!` | 1000 replies |

## Verification Checklist

- [ ] Reply generation works without errors
- [ ] Daily counter increments properly
- [ ] Monthly usage displays correctly
- [ ] Daily goal can be changed in settings
- [ ] No 500 errors in console
- [ ] No 404 errors for API endpoints
- [ ] Classification completes successfully
- [ ] Usage tracking persists across refreshes

## Troubleshooting

If issues persist:

1. **Clear browser cache**
2. **Check console for specific errors**
3. **Verify latest deployment** with:
   ```bash
   curl https://replyguy.appendment.com/api/auth/debug
   ```

---

**Success Criteria**: Users can generate replies, track usage, and manage settings without API errors.