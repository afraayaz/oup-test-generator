# Question Count Discrepancy Fix

## Problem
Question counts shown on the quiz creation page don't match the actual database counts. For example:
- **Database**: Grade 8 Science has 123 MCQ questions
- **Quiz Page**: Shows only 42 MCQ questions

## Root Cause
The question count displayed on the quiz page is **filtered** by the user's selections:
1. ✅ Grade, Subject, Book (base filters)
2. ✅ **Selected Chapters** - if chapters are selected, only counts questions from those chapters
3. ✅ **Selected SLOs** - if SLOs are selected, only counts questions with those SLOs  
4. ✅ **Selected Difficulties** - only counts questions with the selected difficulty levels

### Example:
- Database has 123 MCQ questions across 11 chapters
- User selects only 3-4 specific chapters
- Question count shows ~42 questions (only from selected chapters)
- **This is working as designed** but was not clear to users

## Database Verification
Grade 8 Science "New Amazing Science":
```
Total MCQ: 123 questions
Distributed across chapters:
  - Ecology: 27 questions
  - electricity and magnetism: 21 questions
  - chemical reactions: 16 questions
  - force and pressure: 11 questions
  ... (11 chapters total)
  
Difficulty:
  - Medium: 45 questions
  - Easy: 41 questions
  - Hard: 37 questions
```

## Solution
Enhanced the UI to show **both** counts:

### 1. Added Total Count Function
Created `getTotalQuestionCountByType()` that shows the unfiltered total (all questions for grade/subject/book/type).

### 2. Updated Display Format
Changed from:
```
(42 available)
```

To:
```
(42 available of 123 total)
```

### 3. Added Contextual Messages
- When filtered count < total: Shows "of X total" 
- When filtered count = 0 but total > 0: Shows "Filtered out by chapter/SLO/difficulty selection"
- When total = 0: Shows "Not available in [QB source]"

### 4. Added Info Banner
Added blue info box explaining that counts are filtered:
> ℹ️ **Note:** Question counts shown below are filtered by your selected chapters, SLOs and difficulty levels. Total available counts (unfiltered) are shown in parentheses.

## Files Modified
**[app/teacher/quiz/page.tsx](app/teacher/quiz/page.tsx)**

### Changes Made:
1. **Line ~761**: Added `getTotalQuestionCountByType()` function
2. **Line ~819**: Modified display to show both filtered and total counts
3. **Line ~2817**: Added info banner explaining filtering

## Before vs After

### Before:
```
Multiple Choice (MCQs)
(42 available)
```

### After (with filters):
```
Multiple Choice (MCQs)
(42 available of 123 total)

ℹ️ Note: Question counts shown below are filtered by your selected 
chapters, SLOs and difficulty levels.
```

### After (all filtered out):
```
Multiple Choice (MCQs)
(0 available of 123 total - Filtered out by chapter/SLO/difficulty selection)
```

## Impact
- ✅ Users now see BOTH filtered and total counts
- ✅ Clear indication when filters are reducing available questions
- ✅ Explains why count might be less than expected
- ✅ No change to actual filtering logic (working correctly)
- ✅ Better UX - users understand what's happening

## Testing
1. Go to `/teacher/quiz`
2. Select: Grade 8, Science, "New Amazing Science"
3. Select **all chapters** → Should see "(123 available)"
4. Select **only 2-3 chapters** → Should see "(~40 available of 123 total)"
5. The info banner appears explaining the filtering
6. Try different difficulty selections → count updates accordingly

## Key Insight
The "discrepancy" was not a bug - **the filtering is working correctly**. Users just needed clearer feedback about:
1. What the count represents (filtered, not total)
2. What the total unfiltered count is
3. Why their count might be lower than expected
