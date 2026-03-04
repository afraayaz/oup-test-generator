# SLO Issue Fix - Grade Normalization

## Problem
Teachers were seeing "No SLOs Available" message when creating quizzes, even though SLOs exist in the PostgreSQL database for the selected questions.

## Root Cause
**Grade Format Mismatch:**
- Database stores grades as: `Grade 1`, `Grade 2`, `Grade 3`, etc.
- Frontend was sending: `Class 1` when teachers select from dropdown
- API was keeping "Class 1" as-is (not normalizing to "Grade 1")
- Database query failed to match because `"Class 1" != "Grade 1"`
- No questions returned = No SLOs available

## Database Verification
We confirmed the database has SLOs:
```
📊 Total questions: 4,323
✅ Questions with SLOs: 4,299
❌ Questions without SLOs: 24

📖 New Oxford Modern English specifically:
  Grade 1: 122 questions (all with SLOs)
  Grade 2: 385 questions (all with SLOs)  
  Grade 3: 507 questions (all with SLOs)
```

## Solution
Fixed the `normalizeGrade()` function in API routes to consistently convert both "Class X" and "Grade X" to "Grade X" format:

### Files Modified:
1. **`app/api/teacher/questions/route.ts`** (line 13)
2. **`app/api/oup-creator/questions/route.ts`** (line 5)

### Before:
```typescript
function normalizeGrade(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (/^(grade|class)\s+/i.test(trimmed)) return trimmed; // ❌ Returns as-is
  return `Grade ${trimmed}`;
}
```

### After:
```typescript
function normalizeGrade(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  // Extract the numeric part from "Grade X" or "Class X"
  const match = trimmed.match(/^(?:grade|class)\s+(\d+)/i);
  if (match) {
    return `Grade ${match[1]}`; // ✅ Always returns "Grade X"
  }
  // If it's just a number, add "Grade" prefix
  return `Grade ${trimmed}`;
}
```

## Test Results
All grade formats now normalize correctly:
```
"Class 1"  => "Grade 1" ✅
"Grade 1"  => "Grade 1" ✅
"class 2"  => "Grade 2" ✅
"grade 3"  => "Grade 3" ✅
"1"        => "Grade 1" ✅
```

## Verification Steps
1. Go to teacher quiz creation page: `/teacher/quiz`
2. Select QB Source: "OUP" 
3. Select Format: "Online" or "Offline"
4. Select Grade: "Class 1" (or any grade)
5. Select Subject: "English"
6. Select Book: "New Oxford Modern English"
7. Select Chapters (any chapters)
8. **Expected Result:** Should now see available SLOs listed, no "No SLOs Available" message

## Impact
- ✅ Teachers can now see SLOs when creating quizzes
- ✅ Works for all books with SLO data in database
- ✅ Consistent grade normalization across all API endpoints
- ✅ No changes needed to database or frontend

## Files Created for Testing
- `check-slos.js` - Checks SLO data in PostgreSQL
- `test-teacher-questions-api.js` - Simulates API query
- `test-grade-normalization.js` - Tests normalization logic
