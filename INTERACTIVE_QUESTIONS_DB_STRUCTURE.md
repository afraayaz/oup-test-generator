# Interactive Questions - Database Storage & Quiz Integration

## Overview
Interactive questions (Diagram Labeling, Drag & Drop, Matching, etc.) are stored in Firestore and retrieved for quizzes with full support for interactive rendering.

---

## 1. DATA STORAGE STRUCTURE

### Collection: `schoolQuestionBanks` (Teacher Created)
```javascript
{
  id: "unique_doc_id",
  grade: "9",
  class: "9",
  subject: "Biology",
  book: "General Biology",
  chapter: "Chapter 2: Body Systems",
  slo: "Students will identify body parts",
  difficulty: "Medium",
  
  // Question Type
  type: "diagram-labeling",
  questionType: "diagram-labeling",
  
  // Main Question Content
  question: "Label the parts of the human body shown in the diagram",
  
  // FULL INTERACTIVE DATA - stored as-is
  interactiveData: {
    prompt: "Label the parts of the human body shown in the diagram",
    layoutMode: "image",
    backgroundImage: "data:image/png;base64,iVBOR...", // Base64 encoded image
    
    // Diagram Labeling specific data
    dragItems: [
      {
        id: "1705000001",
        text: "Heart",
        x: 45,      // Position on image: 45% from left
        y: 35       // Position on image: 35% from top
      },
      {
        id: "1705000002",
        text: "Lung",
        x: 30,
        y: 40
      },
      {
        id: "1705000003",
        text: "Stomach",
        x: 50,
        y: 60
      }
    ],
    
    // Other question types include their specific data
    // Drag & Drop: zones, items, connections
    // Matching: leftItems, rightItems
    // Ordering: items array
    // Categorization: categories, items
  },
  
  // Metadata
  isInteractive: true,
  createdBy: "teacher",
  bankType: "school",
  createdAt: "2025-01-08T10:30:00.000Z",
  updatedAt: "2025-01-08T10:30:00.000Z"
}
```

### Collection: `oupQuestionBanks` (Content Creator Created)
```javascript
// Same structure as above, but:
{
  ...same fields...,
  createdBy: "contentCreator",
  bankType: "oup"
}
```

---

## 2. QUESTION TYPES & THEIR DATA

### A. Diagram Labeling
```javascript
interactiveData: {
  prompt: "Label the diagram",
  layoutMode: "image",
  backgroundImage: "data:image/...",
  dragItems: [
    { id: "1", text: "Heart", x: 45, y: 35 },
    { id: "2", text: "Lung", x: 30, y: 40 }
  ]
}

// Student Answer Format:
studentAnswers: {
  "1": "Heart",      // id -> student's typed answer
  "2": "Lung"
}
```

### B. Drag & Drop
```javascript
interactiveData: {
  prompt: "Drag items to correct zones",
  layoutMode: "zones",
  dragItems: [
    { id: "apple", text: "Apple" },
    { id: "carrot", text: "Carrot" }
  ],
  zones: [
    { id: "fruit", name: "Fruit", icon: "🍎" },
    { id: "vegetable", name: "Vegetable", icon: "🥕" }
  ]
}

// Student Answer Format:
studentAnswers: {
  "fruit": ["apple"],
  "vegetable": ["carrot"]
}
```

### C. Matching
```javascript
interactiveData: {
  prompt: "Match the items",
  leftItems: [
    { id: "l1", text: "Photosynthesis" },
    { id: "l2", text: "Respiration" }
  ],
  rightItems: [
    { id: "r1", text: "Breaking down glucose" },
    { id: "r2", text: "Making glucose from sunlight" }
  ],
  pairs: [
    { left: "l1", right: "r2" },
    { left: "l2", right: "r1" }
  ]
}

// Student Answer Format:
studentAnswers: {
  "l1": "r2",  // left id -> right id
  "l2": "r1"
}
```

### D. Ordering
```javascript
interactiveData: {
  prompt: "Order the steps",
  items: [
    { id: "s1", text: "First step" },
    { id: "s2", text: "Second step" },
    { id: "s3", text: "Third step" }
  ]
}

// Student Answer Format:
studentAnswers: [
  "s1",  // correct order as array of ids
  "s2",
  "s3"
]
```

### E. Categorization
```javascript
interactiveData: {
  prompt: "Categorize the items",
  categories: [
    { id: "mammals", name: "Mammals" },
    { id: "reptiles", name: "Reptiles" }
  ],
  items: [
    { id: "dog", text: "Dog", category: "mammals" },
    { id: "snake", text: "Snake", category: "reptiles" }
  ]
}

// Student Answer Format:
studentAnswers: {
  "dog": "mammals",
  "snake": "reptiles"
}
```

---

## 3. QUIZ WITH INTERACTIVE QUESTIONS

When a quiz includes interactive questions, it's stored as:

```javascript
// Collection: quizzes
{
  id: "quiz_123",
  title: "Biology Unit 2 Assessment",
  grade: "9",
  subject: "Biology",
  questions: [
    {
      id: "q1",
      questionId: "schoolQuestionBanks/doc_abc123",  // Reference to stored question
      type: "diagram-labeling",
      isInteractive: true,
      order: 1
    },
    {
      id: "q2",
      questionId: "schoolQuestionBanks/doc_xyz789",  // Reference to another question
      type: "drag-drop",
      isInteractive: true,
      order: 2
    }
  ],
  createdBy: "teacher123",
  createdAt: "2025-01-08T10:30:00.000Z"
}
```

---

## 4. STUDENT QUIZ ATTEMPT - STORING RESPONSES

When a student takes the quiz:

```javascript
// Collection: quizAttempts
{
  id: "attempt_001",
  quizId: "quiz_123",
  studentId: "student_xyz",
  
  // Full question data at time of attempt
  questionsSnapshot: [
    {
      questionId: "q1",
      type: "diagram-labeling",
      prompt: "Label the body parts",
      backgroundImage: "data:image/...",
      dragItems: [
        { id: "1", text: "Heart", x: 45, y: 35 },
        { id: "2", text: "Lung", x: 30, y: 40 }
      ]
    }
  ],
  
  // Student's answers
  answers: [
    {
      questionId: "q1",
      studentAnswers: {
        "1": "Heart",
        "2": "Lung"
      },
      isCorrect: true,
      submittedAt: "2025-01-08T11:30:00.000Z"
    }
  ],
  
  score: 100,
  totalPoints: 100,
  startedAt: "2025-01-08T11:00:00.000Z",
  submittedAt: "2025-01-08T11:30:00.000Z"
}
```

---

## 5. RETRIEVAL FLOW FOR QUIZZES

### Step 1: Load Quiz
```javascript
const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
const quizData = quizDoc.data();
```

### Step 2: Load Each Question
```javascript
for (const qRef of quizData.questions) {
  const questionDoc = await getDoc(
    doc(db, 'schoolQuestionBanks', qRef.questionId)
  );
  const questionData = questionDoc.data();
  
  // This has:
  // - prompt
  // - type
  // - interactiveData (with all specific data)
  // - backgroundImage (for diagram labeling)
  // - dragItems, zones, etc.
}
```

### Step 3: Render Interactive Component
```javascript
// React component selector
const InteractiveRenderer = {
  'diagram-labeling': DiagramLabelingStudent,
  'drag-drop': DragDropStudent,
  'matching': MatchingStudent,
  'ordering': OrderingStudent,
  'categorization': CategorizationStudent'
}

const StudentComponent = InteractiveRenderer[question.type];

// Pass question data
<StudentComponent 
  question={question.interactiveData}
  onAnswer={handleStudentAnswer}
/>
```

### Step 4: Save Student Attempt
```javascript
await addDoc(collection(db, 'quizAttempts'), {
  quizId: quizId,
  studentId: currentStudent.id,
  questionsSnapshot: allQuestions, // Full data
  answers: studentResponses,
  submittedAt: new Date().toISOString()
});
```

---

## 6. ANSWER VALIDATION & SCORING

For each question type:

### Diagram Labeling
```javascript
function validateDiagramAnswer(correctAnswers, studentAnswers) {
  let correct = 0;
  
  for (const [id, correctText] of Object.entries(correctAnswers)) {
    const studentText = studentAnswers[id]?.trim().toLowerCase();
    const correct Text = correctText.trim().toLowerCase();
    
    // Exact match or fuzzy match with tolerance
    if (studentText === correctText) {
      correct++;
    }
  }
  
  return {
    score: (correct / Object.keys(correctAnswers).length) * 100,
    breakdown: { correct, total: Object.keys(correctAnswers).length }
  };
}
```

### Drag & Drop
```javascript
function validateDragDrop(correctZones, studentAnswers) {
  let correct = 0;
  let total = 0;
  
  for (const [zoneId, items] of Object.entries(correctZones)) {
    const studentItems = studentAnswers[zoneId] || [];
    total += items.length;
    
    for (const item of items) {
      if (studentItems.includes(item)) {
        correct++;
      }
    }
  }
  
  return { score: (correct / total) * 100 };
}
```

---

## 7. CURRENT IMPLEMENTATION STATUS

### ✅ Completed
- Question creation with interactive builders
- Storage in Firestore (schoolQuestionBanks, oupQuestionBanks)
- Full `interactiveData` object persistence
- Image encoding as Base64
- Metadata tracking (grade, subject, chapter, etc.)

### 🚧 In Progress / TODO
- Student quiz rendering components for each type
- Answer submission & storage in quizAttempts
- Answer validation & auto-scoring logic
- Quiz retrieval & display in student dashboard
- Attempt history & review functionality

---

## 8. EXAMPLE COMPLETE FLOW

### Teacher Creates Diagram Labeling Question
1. Navigates to: `/teacher/interactiveQuiz`
2. Selects: Grade 9 → Biology → Chapter 2 → Diagram Labeling
3. Uploads image of human body
4. Adds labels: Heart (45%, 35%), Lung (30%, 40%), Stomach (50%, 60%)
5. Clicks "Save to School Question Bank"

### Data Stored in Firestore
```javascript
// In collection: schoolQuestionBanks
{
  question: "Label the parts of the human body shown in the diagram",
  type: "diagram-labeling",
  interactiveData: {
    layoutMode: "image",
    backgroundImage: "data:image/png;base64,...",
    dragItems: [
      { id: "1705000001", text: "Heart", x: 45, y: 35 },
      { id: "1705000002", text: "Lung", x: 30, y: 40 },
      { id: "1705000003", text: "Stomach", x: 50, y: 60 }
    ]
  },
  grade: "9",
  subject: "Biology",
  chapter: "Chapter 2: Body Systems"
}
```

### Quiz Creator Includes This Question
1. Creates new quiz
2. Adds this diagram labeling question
3. Quiz document references it

### Student Takes Quiz
1. Sees diagram image with small dots at marked areas
2. Types answers in numbered blanks
3. Submits: `{ "1": "Heart", "2": "Lung", "3": "Stomach" }`
4. System validates answers
5. Quiz attempt saved with score

---

## 9. NEXT STEPS

To complete the integration:

1. **Create Student Components** for each question type
   - `/app/student/quiz/components/DiagramLabelingStudent.tsx`
   - `/app/student/quiz/components/DragDropStudent.tsx`
   - etc.

2. **Implement Quiz Taking Flow**
   - Load quiz from DB
   - Render interactive components
   - Handle student submissions

3. **Create Answer Validation**
   - Fuzzy matching for text answers
   - Exact positioning for drag/drop
   - Scoring algorithms

4. **Display Results**
   - Student score & feedback
   - Question review
   - Attempt history

