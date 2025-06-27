# ReplyGuy API Fixes - Test Instructions

**Date**: June 27, 2025  
**Purpose**: Verify that all API issues have been resolved after applying fixes

## Prerequisites
- Test user account: Use the same account as before (81a9b3a9-1aca-4f5d-acc2-532b30b70986)
- Browser: Chrome with Developer Tools open
- Clear browser cache before testing
- Test URL: https://replyguy.appendment.com

## Test 1: Health Check Verification
**Objective**: Ensure system is properly configured

1. Navigate to: https://replyguy.appendment.com/api/health
2. **Expected Result**: 
   - Should return JSON with `status: "healthy"` or `"degraded"`
   - All API keys should show `true`
   - Database connected should be `true`
   - All tables should show `true`
   - Record any items showing `false` or errors array

## Test 2: Authentication & Dashboard Load
**Objective**: Verify login and initial data loading

1. Go to https://replyguy.appendment.com
2. Log in with test account
3. Open Console (F12) and Network tab
4. **Check for**:
   - ❌ Any 406 errors (should be none)
   - ❌ Any 500 errors (should be none)
   - ✅ Dashboard loads successfully
   - ✅ Daily counter shows (record the value: X of 10 replies today)

## Test 3: Reply Generation & Usage Tracking
**Objective**: Verify core functionality works and usage is tracked

1. Fill in the reply form:
   - Original Tweet: "Just discovered that coffee at 3pm might not be the best idea for sleep"
   - Your Response: "I learned this the hard way last week"
   - Response Type: Agree
   - Tone: Casual
   - Research: No
   - Include Meme: No

2. Click "Generate Reply"

3. **Monitor Console for**:
   - Classification success/failure
   - Any error messages
   - Process completion

4. **Expected Results**:
   - ✅ Reply generates successfully
   - ✅ No 500 errors in console
   - ✅ Daily counter increments by 1
   - ✅ Generated reply appears in output

5. **Record**:
   - Was reply generated? Yes/No
   - Final daily counter value: ___ of 10
   - Any console errors (copy exact text)

## Test 4: Database Query Verification
**Objective**: Ensure queries work without 406 errors

1. Refresh the dashboard page (F5)
2. Watch Network tab for Supabase requests
3. **Check for**:
   - `/rest/v1/daily_usage` requests - should return 200 OK
   - `/rest/v1/subscriptions` requests - should return 200 OK
   - `/rest/v1/rpc/get_current_usage` - should return 200 OK
   - No 406 errors

## Test 5: Multiple Reply Generation
**Objective**: Test sustained usage and counter accuracy

1. Generate 2 more replies with different inputs
2. After each generation, verify:
   - Reply generates successfully
   - Counter increments correctly
   - No errors in console

3. **Final Check**:
   - Total replies generated in session: ___
   - Final counter shows: ___ of 10 replies today
   - All increments tracked correctly? Yes/No

## Test 6: Error Handling Check
**Objective**: Verify graceful error handling

1. Try to generate a reply with empty fields
2. **Expected**: User-friendly error message (not a 500 error)

## Test Report Template

```markdown
## API Fixes Test Report
**Date**: [Current Date]
**Tester**: [Name]
**Environment**: Production (replyguy.appendment.com)

### Health Check Results
- Status: [healthy/degraded/unhealthy]
- Issues found: [List any false values or errors]

### Test Results Summary
- [ ] Health check accessible
- [ ] No 406 errors during testing
- [ ] No 500 errors during reply generation
- [ ] Usage tracking working (counter increments)
- [ ] All database queries return 200 OK
- [ ] Reply generation successful

### Usage Tracking Details
- Starting counter: ___ of 10
- Replies generated: ___
- Final counter: ___ of 10
- Tracking accurate: Yes/No

### Console Errors
[Paste any console errors here]

### Network Errors
[List any failed requests with status codes]

### Overall Status
- [ ] All tests passed
- [ ] Some issues remain (list below)

### Issues Found
1. [Issue description]
2. [Issue description]

### Screenshots
[Attach any relevant screenshots]
```

## Important Notes

1. **Clear cache between test runs** to ensure fresh state
2. **Document all console errors** with full error text
3. **Take screenshots** of any errors or unexpected behavior
4. **Test both with and without research enabled** if time permits
5. **Note response times** - are they reasonable?

## Success Criteria

✅ **PASS** if:
- No 406 or 500 errors
- Usage tracking increments correctly
- Replies generate successfully
- Health check shows mostly healthy

❌ **FAIL** if:
- Any 406 errors appear
- 500 errors on reply generation
- Usage counter doesn't increment
- Multiple "unhealthy" items in health check

## After Testing

1. Export console logs (right-click in console → Save as...)
2. Export network HAR file if errors occurred
3. Create test report using template above
4. Share findings with development team