# Onboarding Tour System - Complete Guide

## ✅ What's Been Implemented

### Core System
- **OnboardingTour Component** (`components/OnboardingTour.tsx`)
  - Reusable wrapper for react-joyride
  - LocalStorage persistence (shows only on first visit)
  - Custom styling matching brand colors (#002147)
  - Skip/Complete functionality

### Tour Step Files Created
1. ✅ `teacherTourSteps.tsx` - Teacher Dashboard (6 steps)
2. ✅ `studentTourSteps.tsx` - Student Dashboard (6 steps)
3. ✅ `teacherCreateQuestionTourSteps.tsx` - Create Questions Page (11 steps)
4. ✅ `teacherQuizGenerationTourSteps.tsx` - Quiz Generation (11 steps)
5. ✅ `teacherQuizzesLibraryTourSteps.tsx` - Quizzes Library (8 steps)
6. ✅ `studentAssignedQuizzesTourSteps.tsx` - Assigned Quizzes (8 steps)
7. ✅ `studentQuizAttemptTourSteps.tsx` - Quiz Attempt Page (9 steps)

### Pages with Tours Integrated
1. ✅ **Teacher Dashboard** (`app/teacher/dashboard/page.tsx`)
   - CSS Classes: `.stat-card-books`, `.stat-card-questions`, `.stat-card-quizzes`, `.assigned-books-section`
   - Storage Key: `teacher-tour-completed`

2. ✅ **Student Dashboard** (`app/student/dashboard/DashboardClient.tsx`)
   - CSS Classes: `.stat-card-attempted`, `.stat-card-pending`, `.stat-card-latest`, `.stat-card-average`
   - Storage Key: `student-tour-completed`

3. ✅ **Teacher Create Questions** (`app/teacher/questions/page.tsx`)
   - CSS Classes: `.mode-selector`, `.template-download-btn`, `.grade-select`, `.subject-select`, `.question-type-select`, `.math-formula-btn`, `.urdu-keyboard-btn`, `.preview-section`, `.submit-question-btn`
   - Storage Key: `teacher-create-question-tour-completed`

4. ✅ **Student Assigned Quizzes** (`app/student/assigned/AssignedQuizzesClient.tsx`)
   - CSS Classes: `.filter-tabs`, `.quiz-card-assigned`, `.start-quiz-btn`
   - Storage Key: `student-assigned-quizzes-tour-completed`

---

## 🚀 How to Extend Tours to Other Pages

### Step 1: Import the Tour
Add these imports at the top of your page component:

```tsx
import OnboardingTour from '@/components/OnboardingTour';
import { tourStepFileName } from '@/components/tours/tourStepFileName';
```

### Step 2: Add CSS Classes to Target Elements
Add unique CSS classes to elements you want to highlight:

```tsx
// Example:
<button className="my-button-class px-4 py-2...">
  Click Me
</button>

<div className="my-section-class bg-white...">
  Content here
</div>
```

### Step 3: Add Tour Component
Place at the end of your component, before the closing return statement:

```tsx
return (
  <div>
    {/* Your page content */}
    
    <OnboardingTour 
      steps={yourTourSteps} 
      storageKey="unique-page-tour-completed" 
    />
  </div>
);
```

---

## 📋 Remaining Pages to Add Tours

### Teacher Pages
- [ ] **Quiz Generation** (`app/teacher/quiz/page.tsx`)
  - Tour file: `teacherQuizGenerationTourSteps.tsx` ✅ (already created)
  - Need to: Add CSS classes, import tour, add component
  - Key elements: quiz title input, grade/subject selects, chapter filters, question selection, time limit, assign students

- [ ] **Quizzes Library** (`app/teacher/quizzes/page.tsx`)
  - Tour file: `teacherQuizzesLibraryTourSteps.tsx` ✅ (already created)
  - Need to: Add CSS classes, import tour, add component
  - Key elements: quiz filters, quiz cards, view results button, grade submissions button, settings button

- [ ] **Question Bank** (`app/teacher/question-bank/page.tsx`)
  - Need to: Create tour steps file, integrate
  - Suggested elements: search/filter, question list, edit/delete actions, preview

### Student Pages
- [ ] **Quiz Attempt** (`app/student/attempt/page.tsx`)
  - Tour file: `studentQuizAttemptTourSteps.tsx` ✅ (already created)
  - Need to: Add CSS classes, import tour, add component
  - Key elements: timer, question navigation, question display, mark for review button, next/prev buttons, progress bar, submit button

- [ ] **Quiz History** (`app/student/history/page.tsx`)
  - Need to: Create tour steps file, integrate
  - Suggested elements: history filters, quiz attempt cards, view results button

---

## 🎨 Tour Implementation Template

### Example: Adding Tour to Quiz Generation Page

**1. Create/Use Tour Steps** (already done for many pages)

**2. Import in Page:**
```tsx
import OnboardingTour from '@/components/OnboardingTour';
import { teacherQuizGenerationTourSteps } from '@/components/tours/teacherQuizGenerationTourSteps';
```

**3. Add CSS Classes:**
```tsx
// Quiz title input
<input 
  className="quiz-title-input w-full px-4..."
  placeholder="Enter quiz title"
/>

// Grade select
<select className="grade-subject-select w-full...">
  <option>Select Grade</option>
</select>

// Book/Chapter filters
<div className="book-chapter-select space-y-4...">
  {/* content */}
</div>

// Difficulty filter
<div className="difficulty-filter flex gap-2...">
  {/* buttons */}
</div>

// Question type filter
<div className="question-type-filter...">
  {/* checkboxes */}
</div>

// Question selection area
<div className="question-selection-area...">
  {/* question list */}
</div>

// Time limit
<input className="time-limit-input..." type="number" />

// Assign students section
<div className="assign-students-section...">
  {/* student list */}
</div>

// Generate button
<button className="generate-quiz-btn...">
  Generate Quiz
</button>
```

**4. Add Tour Component:**
```tsx
export default function QuizGenerationPage() {
  // ... component code ...
  
  return (
    <div>
      {/* All your page content */}
      
      <OnboardingTour 
        steps={teacherQuizGenerationTourSteps} 
        storageKey="teacher-quiz-generation-tour-completed" 
      />
    </div>
  );
}
```

---

## 🎯 Tips for Creating New Tour Steps

1. **Keep it concise**: 6-11 steps per page is ideal
2. **Focus on key features**: Don't overwhelm users
3. **Use descriptive CSS classes**: Makes targeting easier
4. **Unique storage keys**: Prevents tours from interfering with each other
5. **Test placement**: Use 'top', 'bottom', 'left', 'right' based on element position
6. **Emojis help**: Visual indicators make tours more engaging

---

## 🔧 Testing Your Tours

1. **Clear localStorage** in browser DevTools (Application > Local Storage)
2. **Visit the page** - tour should auto-start
3. **Test navigation** - Next, Back, Skip buttons
4. **Verify targeting** - All highlighted elements should be correct
5. **Check storage** - Tour shouldn't show again after completion

---

## 📚 Available Tour Steps (Ready to Use)

All these tour step files are created and ready - just need to be integrated into pages:

- ✅ `teacherTourSteps.tsx` → Teacher Dashboard (INTEGRATED)
- ✅ `studentTourSteps.tsx` → Student Dashboard (INTEGRATED)
- ✅ `teacherCreateQuestionTourSteps.tsx` → Create Questions (INTEGRATED)
- ✅ `teacherQuizGenerationTourSteps.tsx` → Quiz Generation (READY)
- ✅ `teacherQuizzesLibraryTourSteps.tsx` → Quizzes Library (READY)
- ✅ `studentAssignedQuizzesTourSteps.tsx` → Assigned Quizzes (INTEGRATED)
- ✅ `studentQuizAttemptTourSteps.tsx` → Quiz Attempt (READY)

---

## 🎓 Example: Quick Integration for Quiz Attempt Page

**File:** `app/student/attempt/page.tsx`

```tsx
// 1. Add imports
import OnboardingTour from '@/components/OnboardingTour';
import { studentQuizAttemptTourSteps } from '@/components/tours/studentQuizAttemptTourSteps';

export default function QuizAttemptPage() {
  // ... existing code ...
  
  return (
    <div className="quiz-attempt-container">
      {/* 2. Add CSS classes to key elements */}
      <div className="timer-display">⏱️ {timeRemaining}</div>
      
      <div className="question-navigation">
        {/* question numbers */}
      </div>
      
      <div className="question-display">
        {/* current question */}
      </div>
      
      <button className="mark-review-btn">Mark for Review</button>
      
      <div className="next-prev-buttons">
        <button>Previous</button>
        <button>Next</button>
      </div>
      
      <div className="progress-indicator">
        Progress: {answered}/{total}
      </div>
      
      <button className="submit-quiz-btn">Submit Quiz</button>
      
      {/* 3. Add tour component */}
      <OnboardingTour 
        steps={studentQuizAttemptTourSteps} 
        storageKey="student-quiz-attempt-tour-completed" 
      />
    </div>
  );
}
```

---

## 🎉 Benefits of This System

- ✅ **First-time user guidance**: Shows automatically on first visit
- ✅ **Never annoying**: Uses localStorage to show only once
- ✅ **Skippable**: Users can skip anytime
- ✅ **Consistent styling**: Matches your brand colors
- ✅ **Mobile-friendly**: Responsive tooltips
- ✅ **Easy to extend**: Simple template for new pages
- ✅ **Professional**: Uses react-joyride - industry standard

---

## 🔄 How to Reset Tours (For Testing)

```javascript
// In browser console:
localStorage.removeItem('teacher-tour-completed');
localStorage.removeItem('student-tour-completed');
localStorage.removeItem('teacher-create-question-tour-completed');
localStorage.removeItem('student-assigned-quizzes-tour-completed');
// ... etc for other pages
```

Or clear all localStorage:
```javascript
localStorage.clear();
```
