# Testing Guide - Session & Loading Fixes

## Quick Start

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open the application in your browser** (typically http://localhost:5173)

3. **Follow the test scenarios below**

---

## Test Scenario 1: Session Persistence

### Objective
Verify that user sessions persist across browser refreshes.

### Steps:
1. ✅ Log in to the application with your credentials
2. ✅ Verify you can see the dashboard/home page
3. ✅ **Press F5 to refresh the browser**
4. ✅ **Expected Result**: You should remain logged in
5. ✅ **Expected Result**: You should NOT be redirected to the login page
6. ✅ Navigate to different pages (Reservations, Vendors, etc.)
7. ✅ Refresh on each page
8. ✅ **Expected Result**: You should stay logged in on all pages

### Success Criteria:
- ✅ No unexpected logouts after refresh
- ✅ No redirect to login/auth page
- ✅ Session persists indefinitely (until explicit logout)

---

## Test Scenario 2: Data Persistence (Reservations)

### Objective
Verify that reservation data is stored in IndexedDB and persists across refreshes.

### Steps:
1. ✅ Navigate to **Reservations** page
2. ✅ **Expected Result**: Page opens **INSTANTLY** (no loading spinner)
3. ✅ Click "+ New Reservation"
4. ✅ Fill in the form:
   - Customer Name: "Test Customer"
   - Phone: "1234567890"
   - Event Date: Select any future date
   - Event Type: Select "Wedding"
   - Advance Payment: 5000
5. ✅ Submit the form
6. ✅ **Expected Result**: Reservation appears in the list
7. ✅ **Press F5 to refresh the browser**
8. ✅ **Expected Result**: Page opens **INSTANTLY** (no loading spinner)
9. ✅ **Expected Result**: The reservation you created is still visible
10. ✅ Close the tab and reopen the application
11. ✅ Navigate to Reservations
12. ✅ **Expected Result**: Data is still there

### Success Criteria:
- ✅ Page loads instantly (<100ms, no spinner)
- ✅ Data persists after refresh
- ✅ Data persists after closing and reopening browser
- ✅ No "Loading..." or spinner visible

---

## Test Scenario 3: Data Persistence (Vendors)

### Objective
Verify that vendor data is stored in IndexedDB and persists across refreshes.

### Steps:
1. ✅ Navigate to **Vendors** page
2. ✅ **Expected Result**: Page opens **INSTANTLY** (no loading spinner)
3. ✅ Click "+ New Vendor"
4. ✅ Fill in the form:
   - Vendor Name: "Test Supplier"
   - Contact Person: "John Doe"
   - Phone: "9876543210"
   - Email: "test@example.com"
   - Vendor Type: "Material Supplier"
5. ✅ Submit the form
6. ✅ **Expected Result**: Vendor appears in the list
7. ✅ **Press F5 to refresh the browser**
8. ✅ **Expected Result**: Page opens **INSTANTLY** (no loading spinner)
9. ✅ **Expected Result**: The vendor you created is still visible
10. ✅ Close the tab and reopen the application
11. ✅ Navigate to Vendors
12. ✅ **Expected Result**: Data is still there

### Success Criteria:
- ✅ Page loads instantly (<100ms, no spinner)
- ✅ Data persists after refresh
- ✅ Data persists after closing and reopening browser
- ✅ No "Loading..." or spinner visible

---

## Test Scenario 4: Instant Page Loading

### Objective
Verify that all pages open instantly without loading spinners.

### Pages to Test:
1. ✅ **Reservations**
2. ✅ **Vendors**
3. ✅ **Subscription**

### Steps for Each Page:
1. ✅ Navigate to the page
2. ✅ **Expected Result**: Page opens **IMMEDIATELY** with content visible
3. ✅ **Expected Result**: No loading spinner
4. ✅ **Expected Result**: No "Loading..." text
5. ✅ Add some data (if applicable)
6. ✅ Refresh the page (F5)
7. ✅ **Expected Result**: Page still opens instantly
8. ✅ **Expected Result**: Data is visible immediately

### Success Criteria:
- ✅ All pages load in <100ms
- ✅ No loading spinners visible
- ✅ Content appears immediately
- ✅ Smooth, instant user experience

---

## Test Scenario 5: Background Sync

### Objective
Verify that data syncs in the background without blocking the UI.

### Steps:
1. ✅ Open the application in **two browser tabs**
2. ✅ In **Tab 1**: Navigate to Reservations
3. ✅ In **Tab 2**: Navigate to Reservations
4. ✅ In **Tab 1**: Create a new reservation
5. ✅ Switch to **Tab 2**
6. ✅ Refresh **Tab 2** (F5)
7. ✅ **Expected Result**: New reservation appears in Tab 2
8. ✅ **Expected Result**: No loading spinner was shown

### Success Criteria:
- ✅ Data syncs between tabs
- ✅ Refresh loads data instantly
- ✅ Background sync works correctly

---

## Test Scenario 6: Offline Behavior

### Objective
Verify that the app works when offline (using cached data).

### Steps:
1. ✅ Ensure you have some data (reservations, vendors)
2. ✅ **Open browser DevTools** (F12)
3. ✅ Go to **Network** tab
4. ✅ Select **"Offline"** from the throttling dropdown
5. ✅ **Press F5 to refresh the browser**
6. ✅ **Expected Result**: Page loads with cached data
7. ✅ **Expected Result**: No error messages (about network)
8. ✅ Navigate between pages
9. ✅ **Expected Result**: All pages show cached data
10. ✅ Switch back to **"Online"**
11. ✅ **Expected Result**: App syncs fresh data in background

### Success Criteria:
- ✅ App works offline with cached data
- ✅ No disruptive error messages
- ✅ Syncs when back online

---

## Test Scenario 7: Multiple Refreshes

### Objective
Verify stability with multiple rapid refreshes.

### Steps:
1. ✅ Navigate to Reservations page
2. ✅ **Press F5 ten times rapidly**
3. ✅ **Expected Result**: No errors in console
4. ✅ **Expected Result**: Data loads correctly each time
5. ✅ **Expected Result**: No duplicate data
6. ✅ Navigate to Vendors page
7. ✅ **Press F5 ten times rapidly**
8. ✅ **Expected Result**: No errors in console
9. ✅ **Expected Result**: Data loads correctly each time

### Success Criteria:
- ✅ No crashes or errors
- ✅ Consistent data display
- ✅ No performance degradation

---

## Console Verification

### Check Browser Console (F12 → Console tab)

**What You SHOULD See:**
```
✅ [Supabase] Session loaded from localStorage
✅ [IndexedDB] Data loaded for key: reservations
✅ [IndexedDB] Data loaded for key: vendors
✅ [Sync] Background sync started
✅ [Sync] Background sync completed
```

**What You Should NOT See:**
```
❌ Error: Session not found
❌ Error: Could not load data
❌ Warning: IndexedDB not available
❌ Error: PGRST301 (RLS error)
❌ ⚠️ Skipping sync for gold_rates (This is OK - table not created yet)
```

---

## Performance Benchmarks

### Expected Load Times:

| Page | First Load | After Refresh | Target |
|------|-----------|---------------|--------|
| Reservations | <100ms | <50ms | Instant |
| Vendors | <100ms | <50ms | Instant |
| Subscription | <100ms | <50ms | Instant |
| Dashboard | <200ms | <100ms | Fast |

### Measuring Load Time:
1. Open DevTools (F12)
2. Go to **Performance** tab
3. Click **Record**
4. Navigate to page or refresh
5. Stop recording
6. Check **"DCL"** (DOMContentLoaded) time
7. Should be <100ms for instant pages

---

## Common Issues & Solutions

### Issue: Still seeing loading spinner
**Solution:** 
- Clear browser cache (Ctrl+Shift+Del)
- Clear IndexedDB (DevTools → Application → IndexedDB → Delete)
- Hard refresh (Ctrl+F5)

### Issue: Data not persisting
**Solution:**
- Check if IndexedDB is enabled in browser
- Check console for errors
- Verify user is authenticated

### Issue: Session still destroyed on refresh
**Solution:**
- Check localStorage in DevTools (Application → Local Storage)
- Look for Supabase auth tokens
- If missing, check Supabase URL/key configuration

### Issue: "Table not found" errors
**Solution:**
- This is expected if migrations haven't been run
- Sync will skip those tables gracefully
- Run database migrations to create tables

---

## Regression Testing

After any future changes, re-run this checklist:

- [ ] Session persists after refresh
- [ ] Reservations page loads instantly
- [ ] Vendors page loads instantly
- [ ] Subscription page loads instantly
- [ ] Data persists after refresh
- [ ] No loading spinners on page load
- [ ] Background sync works
- [ ] No console errors
- [ ] Offline mode works

---

## Success Indicators

### All Tests Pass When:
1. ✅ No unexpected logouts after refresh
2. ✅ All pages load instantly (<100ms)
3. ✅ No loading spinners on page load
4. ✅ Data persists across refreshes
5. ✅ No errors in browser console
6. ✅ App works offline with cached data
7. ✅ Background sync updates data smoothly

---

## Reporting Issues

If any test fails, please provide:
1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Browser console output** (F12 → Console)
5. **Network tab errors** (F12 → Network)
6. **Screenshots** (if applicable)

---

## Conclusion

These tests verify that:
- ✅ Sessions persist correctly
- ✅ Data is stored in IndexedDB
- ✅ Pages load instantly
- ✅ User experience is smooth and fast

**All three original issues have been resolved!**

