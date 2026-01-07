# Bulk Upload Debug Guide

## Issue
Bulk uploaded questions appear in database but show **0 count** when creating quiz.

---

## Root Cause Analysis

The questions ARE being saved correctly, but they're being **filtered out** when you select criteria for the quiz. This is a field matching issue.

### Most Likely Causes (In Order of Probability)

1. **SLO Field is Empty** ⚠️ **MOST LIKELY**
   - Bulk uploaded questions have empty `slo` field
   - You select specific SLOs when creating quiz
   - Filter fails: `selectedSLOs.includes(qSLO)` where `qSLO = ""`
   - **Solution**: Ensure your Excel file has SLO values for each question

2. **Book Name Mismatch**
   - Question stored as `"Home"` but filtering by "Mathematics Home"
   - Or stored with ID instead of display name
   - **Solution**: Use exact book name from dropdown

3. **Chapter has Quotes**
   - Stored as `"'Chapter 1'"` instead of `Chapter 1`
   - **Solution**: The code strips quotes, but check Firestore

4. **Subject Case Sensitivity**
   - Stored as `"Math"` but filtering by `"mathematics"`
   - **Solution**: Code uses `.toLowerCase()` so should handle this

5. **Grade Format Missing "Grade " Prefix**
   - Stored as `"1"` instead of `"Grade 1"`
   - **Solution**: Code should add prefix, check if it worked

---

## Step-by-Step Debugging

### **Step 1: Prepare Test Data**
Create a small test file with 1-2 questions including all fields:

| Chapter | Subject | Grade | Book | SLO | Type | Question | Option1 | Option2 | Option3 | Option4 | Correct | Difficulty |
|---------|---------|-------|------|-----|------|----------|---------|---------|---------|---------|---------|------------|
| Chapter 1 | Math | 1 | Mathematics | Numbers | Multiple | What is 2+2? | 1 | 2 | 3 | 4 | D | Medium |

**KEY**: Make sure **SLO column is filled**

### **Step 2: Upload & Check Database**

1. **Upload** the test questions via bulk upload
2. **Verify in Firestore**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to: `Firestore Database` → `questions` → `schools` → `{your-school-id}`
   - Click on one saved question
   - **Check these fields**:
     - `grade`: Should be `"Grade 1"` (with "Grade " prefix)
     - `slo`: Should be `"Numbers"` (NOT empty)
     - `book`: Should match dropdown exactly
     - `chapter`: Should be `"Chapter 1"` (no extra quotes)
     - `subject`: Should be `"math"` (lowercase)
     - `type`: Should be `"multiple"` (lowercase)

### **Step 3: Open Browser Console**

1. **Close** any existing browser tabs
2. **Open new tab** to your app
3. Press `F12` → Click `Console` tab
4. **Clear console** (right-click → Clear)
5. Leave console **open** while following next steps

### **Step 4: Create Quiz with Same Criteria**

1. **Teacher Dashboard** → Create Quiz
2. Select:
   - **Grade**: Same as upload (e.g., "1")
   - **Subject**: Same as upload (e.g., "Math")
   - **Book**: Same as upload (e.g., "Mathematics")
3. Click "Next" → Select:
   - **Chapter**: Same chapter from question (e.g., "Chapter 1")
   - **SLO**: Same SLO from question (e.g., "Numbers") ⚠️
4. Select question types: 1-2 of each
5. Click "Create" or generate

### **Step 5: Check Console Logs**

Look for these log patterns:

#### **Log Pattern A: Question Saved**
```
📝 Saving question to database: {
  type: "multiple",
  subject: "Math",
  grade: "1",
  normalizedGrade: "Grade 1",  ← ✅ Should have prefix
  book: "Mathematics",
  chapter: "Chapter 1",
  slo: "Numbers",              ← ✅ Should NOT be empty
  ...
}
```

#### **Log Pattern B: Question Filtered Out** ❌
```
❌ Question excluded: "What is 2+2?..."
{
  gradeMatch: true,            ← Grade matched
  subjectMatch: true,          ← Subject matched
  bookMatch: true,             ← Book matched
  chapterMatch: true,          ← Chapter matched
  sloMatch: false,             ← ❌ SLO FAILED!
  typeMatch: true,
  difficultyMatch: true
}
```

**What to Report**: Which field has `false`? That's your problem.

---

## Common Scenarios & Fixes

### **Scenario 1: All sloMatch = false**
```
sloMatch: false
questionSLO: ""              ← EMPTY!
selectedSLOs: ["Numbers"]    ← You selected SLO
```

**FIX**: 
- Add SLO values to Excel column
- Or uncheck "SLO Filter" in quiz creation (if that option exists)

### **Scenario 2: All bookMatch = false**
```
bookMatch: false
questionBook: "Home"
selectedBook: "Mathematics Home"  ← Different names!
```

**FIX**: 
- Use exact book name in Excel as shown in dropdown
- Check Firestore what the actual book name is

### **Scenario 3: All chapterMatch = false**
```
chapterMatch: false
questionChapter: "'Chapter 1'"    ← Has quotes
selectedChapters: ["Chapter 1"]   ← No quotes
```

**FIX**: 
- Remove quotes from Excel data
- Or update question in Firestore: change `"'Chapter 1'"` to `"Chapter 1"`

### **Scenario 4: All gradeMatch = false**
```
gradeMatch: false
questionGrade: "1"               ← Missing prefix
qGradeNormalized: "1"           ← Normalization failed
selectedGradeNormalized: "1"    ← They match!
```

**FIX**: 
- Restart the application (might be stale code)
- Or manually edit Firestore: change `"1"` to `"Grade 1"`

---

## Copy-Paste Excel Template

Use this exact template for testing:

```csv
Chapter,Subject,Grade,Book,SLO,Type,Question,Option A,Option B,Option C,Option D,Correct Answer,Difficulty
Chapter 1,Math,1,Mathematics,Basic Numbers,Multiple,"What is 2+2?","1","2","3","4","D","Medium"
Chapter 2,English,1,English,Grammar,Multiple,"What is a noun?","Verb","Noun","Adjective","Adverb","B","Easy"
```

---

## After You Fix It

Once you identify the field causing the problem:

1. **Report back** with the failing field name
2. **I'll provide specific fix**:
   - If SLO: Add SLO values to Excel
   - If Book: Update book matching logic
   - If Grade: Clear Firestore and re-upload with fix
   - If Chapter: Strip quotes from chapter names
   - etc.

---

## Quick Checklist

- [ ] Excel file has **SLO column filled** (not blank)
- [ ] Excel uses **exact book names** from dropdown
- [ ] Excel uses **exact chapter names** (no extra quotes)
- [ ] Excel has **Grade as "1"** or **"Grade 1"** (API will normalize)
- [ ] **Subject** spelling matches exactly
- [ ] Opened browser **F12 Console** during quiz creation
- [ ] Looked for **❌ Question excluded** logs
- [ ] Identified which **field = false** caused match to fail

---

## Still Stuck?

If logs show all questions passed all filters but still show 0 count:
- The issue is **not in filtering** but in question fetching
- Please share the logs showing: "Found X school questions" vs "Included 0 of type X"

---

**Next Step**: Upload your test file, attempt quiz creation, and share the console logs showing which field is failing!
