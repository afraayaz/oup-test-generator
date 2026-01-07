# Interactive Questions - Complete Implementation Guide

## 🎯 Overview
This document summarizes all interactive question components and their integration into the quiz system.

---

## 📁 Student Components Created

### 1. **DiagramLabelingStudent** 
**Location:** `/app/student/quiz/components/DiagramLabelingStudent.tsx`

**Features:**
- Displays diagram image with small dots at marked positions
- Text input fields for each numbered area
- Real-time answer tracking
- Responsive layout

**Props:**
```typescript
{
  question: {
    prompt: string;
    backgroundImage: string;  // Base64 encoded
    dragItems: Array<{
      id: string;
      text: string;
      x: number;  // 0-100%
      y: number;  // 0-100%
    }>;
  };
  onAnswer: (answers: Record<string, string>) => void;
  studentAnswers?: Record<string, string>;
}
```

**Answer Format:**
```javascript
{
  "item_id_1": "Heart",
  "item_id_2": "Lung",
  "item_id_3": "Stomach"
}
```

---

### 2. **DragDropStudent**
**Location:** `/app/student/quiz/components/DragDropStudent.tsx`

**Features:**
- Available items in draggable cards
- Drop zones with drag-over states
- Remove items from zones (with ✕ button)
- Real-time feedback

**Props:**
```typescript
{
  question: {
    prompt: string;
    dragItems: Array<{ id: string; text: string }>;
    zones: Array<{ id: string; name: string; icon?: string }>;
  };
  onAnswer: (answers: Record<string, string[]>) => void;
  studentAnswers?: Record<string, string[]>;
}
```

**Answer Format:**
```javascript
{
  "zone_fruit": ["apple_id", "banana_id"],
  "zone_vegetable": ["carrot_id"]
}
```

---

### 3. **MatchingStudent**
**Location:** `/app/student/quiz/components/MatchingStudent.tsx`

**Features:**
- Two-column layout (left items, matching dropdowns)
- Shows preview of all current matches
- Dropdown selector for each item

**Props:**
```typescript
{
  question: {
    prompt: string;
    leftItems: Array<{ id: string; text: string }>;
    rightItems: Array<{ id: string; text: string }>;
  };
  onAnswer: (answers: Record<string, string>) => void;
  studentAnswers?: Record<string, string>;
}
```

**Answer Format:**
```javascript
{
  "left_item_1": "right_item_5",
  "left_item_2": "right_item_3"
}
```

---

### 4. **OrderingStudent**
**Location:** `/app/student/quiz/components/OrderingStudent.tsx`

**Features:**
- Drag-to-reorder items
- Up/Down arrow buttons
- Visual order numbering
- Real-time order tracking

**Props:**
```typescript
{
  question: {
    prompt: string;
    items: Array<{ id: string; text: string }>;
  };
  onAnswer: (answers: string[]) => void;
  studentAnswers?: string[];
}
```

**Answer Format:**
```javascript
[
  "step_id_1",
  "step_id_2",
  "step_id_3"
]
```

---

### 5. **CategorizationStudent**
**Location:** `/app/student/quiz/components/CategorizationStudent.tsx`

**Features:**
- Items with category dropdowns
- Category preview showing assignments
- Multi-select support
- Visual grouping

**Props:**
```typescript
{
  question: {
    prompt: string;
    categories: Array<{ id: string; name: string }>;
    items: Array<{ id: string; text: string }>;
  };
  onAnswer: (answers: Record<string, string>) => void;
  studentAnswers?: Record<string, string>;
}
```

**Answer Format:**
```javascript
{
  "item_dog": "category_mammals",
  "item_snake": "category_reptiles",
  "item_fish": "category_aquatic"
}
```

---

## 🏗️ Teacher Workflow - Question Details

### Current State
The teacher page already has fully dynamic dropdowns:

```tsx
<select
  value={quizMeta.grade}
  onChange={(e) => setQuizMeta({ ...quizMeta, grade: e.target.value })}
  disabled={!quizMeta.grade || !quizMeta.subject}
  className="w-full border rounded-lg px-3 py-2..."
>
  <option value="">Select Grade</option>
  {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
</select>
```

### Dropdown Hierarchy
1. **Grade** → Enables Subject
2. **Subject** → Enables Book
3. **Book** → Enables Chapter
4. **Chapter** → Enables SLO
5. **SLO** → Optional, depends on Chapter
6. **Difficulty** → Independent (defaults to "Medium")
7. **Question Type** → Independent (Visual button grid)

### Validation
- All fields show red border on error
- Error messages display below each field
- Save button disabled until all validations pass
- Dynamic feedback as user types

---

## 💾 Data Storage Pipeline

### Teacher Creates Question
```
Teacher Dashboard
  → Select Grade/Subject/Book/Chapter
  → Choose Question Type
  → Add Question
  → Edit Question Details (using builders)
  → Click "Save Questions"
  → Firestore Storage
```

### Storage in Firestore
```javascript
// Collection: schoolQuestionBanks
{
  grade: "9",
  subject: "Biology",
  book: "General Biology",
  chapter: "Chapter 2: Human Body",
  difficulty: "Medium",
  type: "diagram-labeling",
  questionType: "diagram-labeling",
  question: "Label the body parts...",
  
  interactiveData: {
    prompt: "Label the body parts...",
    layoutMode: "image",
    backgroundImage: "data:image/png;base64,...",
    dragItems: [
      { id: "1705000001", text: "Heart", x: 45, y: 35 },
      { id: "1705000002", text: "Lung", x: 30, y: 40 }
    ]
  },
  
  isInteractive: true,
  createdBy: "teacher",
  bankType: "school",
  createdAt: "2025-01-08T...",
  updatedAt: "2025-01-08T..."
}
```

---

## 📖 Student Quiz Taking Flow

### 1. Load Quiz Page
```
GET /api/quiz/:quizId
  → Returns: {
      title, questions: [
        { questionId, type, metadata }
      ]
    }
```

### 2. Load Individual Question
```
GET /api/questions/:questionId
  → Returns full interactiveData with:
    - prompt
    - backgroundImage (for diagrams)
    - dragItems, zones, pairs, etc.
```

### 3. Render Appropriate Component
```typescript
const componentMap = {
  'diagram-labeling': DiagramLabelingStudent,
  'drag-drop': DragDropStudent,
  'matching': MatchingStudent,
  'ordering': OrderingStudent,
  'categorization': CategorizationStudent
};

const Component = componentMap[question.type];
<Component 
  question={question.interactiveData}
  onAnswer={handleAnswer}
  studentAnswers={savedAnswers}
/>
```

### 4. Student Submits Answer
```typescript
const handleAnswer = (studentAnswers) => {
  // Format: varies by type (object, array, or primitive)
  setCurrentAnswers(studentAnswers);
  
  // Auto-save (optional)
  saveAnswerDraft();
};
```

### 5. Submit Quiz
```javascript
await submitQuiz({
  quizId,
  studentId,
  answers: [
    {
      questionId: "q1",
      type: "diagram-labeling",
      studentAnswers: { "1": "Heart", "2": "Lung" }
    },
    {
      questionId: "q2",
      type: "drag-drop",
      studentAnswers: { "zone1": ["item1"], "zone2": ["item2"] }
    }
  ],
  submittedAt: new Date()
});
```

### 6. Store Attempt
```javascript
// Collection: quizAttempts
{
  quizId,
  studentId,
  questionsSnapshot: [...full question data...],
  answers: [...student answers...],
  score: 85,
  submittedAt,
  startedAt
}
```

---

## ✅ Answer Validation Logic

### Diagram Labeling
```javascript
function validateDiagramLabeling(correctAnswers, studentAnswers) {
  let correct = 0;
  const total = Object.keys(correctAnswers).length;
  
  for (const [id, correctText] of Object.entries(correctAnswers)) {
    const studentText = (studentAnswers[id] || '').trim().toLowerCase();
    const correct_text = correctText.trim().toLowerCase();
    
    // Exact match (can add fuzzy matching with Levenshtein distance)
    if (studentText === correct_text) {
      correct++;
    }
  }
  
  return {
    score: (correct / total) * 100,
    details: {
      correct,
      total,
      feedback: correct === total ? 'Perfect!' : `${correct} out of ${total} correct`
    }
  };
}
```

### Drag & Drop
```javascript
function validateDragDrop(correctAnswers, studentAnswers) {
  let correct = 0;
  let total = 0;
  
  for (const [zoneId, items] of Object.entries(correctAnswers)) {
    total += items.length;
    const studentItems = studentAnswers[zoneId] || [];
    
    for (const item of items) {
      if (studentItems.includes(item)) correct++;
    }
  }
  
  return {
    score: (correct / total) * 100,
    details: { correct, total }
  };
}
```

### Matching
```javascript
function validateMatching(correctPairs, studentAnswers) {
  let correct = 0;
  const total = correctPairs.length;
  
  for (const pair of correctPairs) {
    if (studentAnswers[pair.leftId] === pair.rightId) {
      correct++;
    }
  }
  
  return {
    score: (correct / total) * 100,
    details: { correct, total }
  };
}
```

### Ordering
```javascript
function validateOrdering(correctOrder, studentAnswers) {
  // Check if order is exactly correct
  const isCorrect = JSON.stringify(correctOrder) === JSON.stringify(studentAnswers);
  
  // Or allow partial credit for partial correctness
  let consecutiveCorrect = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    if (correctOrder[i] === studentAnswers[i]) {
      consecutiveCorrect++;
    } else {
      break;
    }
  }
  
  return {
    score: isCorrect ? 100 : (consecutiveCorrect / correctOrder.length) * 100,
    details: {
      isCorrect,
      consecutiveCorrect,
      total: correctOrder.length
    }
  };
}
```

### Categorization
```javascript
function validateCategorization(correctCategories, studentAnswers) {
  let correct = 0;
  const total = Object.keys(correctCategories).length;
  
  for (const [itemId, correctCategory] of Object.entries(correctCategories)) {
    if (studentAnswers[itemId] === correctCategory) {
      correct++;
    }
  }
  
  return {
    score: (correct / total) * 100,
    details: { correct, total }
  };
}
```

---

## 🔌 Integration Checklist

### ✅ Completed
- [x] Teacher question creation page with dynamic dropdowns
- [x] Diagram Labeling builder (teacher side)
- [x] Drag & Drop builder (using EnhancedDragDropBuilder)
- [x] Matching builder
- [x] Ordering builder
- [x] Categorization builder
- [x] Student components for all 5 types
- [x] Firestore storage structure
- [x] Answer format definitions
- [x] Validation logic templates

### 🚧 Next Steps
1. **Create API Routes**
   - `/api/quiz/:quizId` - Load quiz
   - `/api/questions/:questionId` - Load question
   - `/api/quiz/submit` - Submit answers
   - `/api/quiz/:quizId/attempt/:attemptId` - Get attempt

2. **Create Quiz Taking Page**
   - `/app/student/quiz/:quizId` - Main quiz interface
   - Handle answer submission
   - Progress tracking

3. **Results & Review Pages**
   - Score display
   - Detailed feedback
   - Answer review
   - Attempt history

4. **Teacher Dashboard Updates**
   - View responses
   - Analytics
   - Export data

---

## 📝 Example Implementation

### Using DiagramLabelingStudent
```tsx
import DiagramLabelingStudent from '@/app/student/quiz/components/DiagramLabelingStudent';

const quizQuestion = {
  prompt: "Label the parts of the human body",
  backgroundImage: "data:image/png;base64,...",
  dragItems: [
    { id: "1", text: "Heart", x: 45, y: 35 },
    { id: "2", text: "Lung", x: 30, y: 40 },
    { id: "3", text: "Stomach", x: 50, y: 60 }
  ]
};

<DiagramLabelingStudent
  question={quizQuestion}
  onAnswer={(answers) => {
    console.log(answers);
    // { "1": "Heart", "2": "Lung", "3": "Stomach" }
  }}
/>
```

---

## 🎓 File Structure

```
app/
├── teacher/
│   └── interactiveQuiz/
│       └── page.tsx (Question Creation)
│
├── student/
│   └── quiz/
│       ├── page.tsx (Quiz Taking - TO BE CREATED)
│       └── components/
│           ├── DiagramLabelingStudent.tsx ✅
│           ├── DragDropStudent.tsx ✅
│           ├── MatchingStudent.tsx ✅
│           ├── OrderingStudent.tsx ✅
│           └── CategorizationStudent.tsx ✅
│
├── api/
│   └── quiz/ (TO BE CREATED)
│       ├── route.ts (Load/save quiz)
│       └── [quizId]/
│           ├── route.ts
│           └── attempt/
│               └── route.ts
│
components/
├── DiagramLabelingBuilder.tsx (in interactiveQuiz page)
├── EnhancedDragDropBuilder.tsx
├── MatchingBuilder.tsx
├── OrderingBuilder.tsx
└── CategorizationBuilder.tsx

types/
└── types.ts (Question interfaces)

firebase/
└── firebase.ts (DB connection)
```

---

## 🚀 Deployment Notes

1. **Base64 Image Handling**
   - Images stored as Base64 strings in Firestore
   - Can cause document size issues with large diagrams
   - Consider: Store images in Cloud Storage, reference by URL

2. **Firestore Limits**
   - Max document size: 1 MB
   - Large diagrams may exceed limit
   - Solution: Move images to Cloud Storage

3. **Performance**
   - Cache questions in client
   - Lazy-load images
   - Paginate long quizzes

4. **Security**
   - Validate answers server-side
   - Prevent answer modification after submission
   - Log all attempts

