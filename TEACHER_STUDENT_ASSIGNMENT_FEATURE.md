# Teacher-to-Student Quiz Assignment Feature

## Overview
Implemented a complete feature that allows teachers to create quizzes and assign them directly to students in their class. Assigned quizzes then appear in the student's "Assigned" dashboard with clear indication of assignments.

## Features Implemented

### 1. **Teacher Quiz Creation with Student Assignment**
- **Location**: `app/teacher/quiz/page.tsx`
- When creating a quiz, teachers can now:
  - Select a grade/class
  - Get a list of all students in that class
  - Check/uncheck individual students to assign the quiz
  - See the count of selected students before creating the quiz

### 2. **Student Selection UI**
- Added interactive modal in the quiz confirmation dialog
- Shows student name, email, and allows multi-select
- Displays number of students selected
- Only loads students from the selected grade/class

### 3. **Quiz Assignment Database**
- **New Firestore Collection**: `quizAssignments`
- Stores relationship between:
  - `quizId`: Reference to the quiz
  - `studentId`: Reference to the student
  - `quizTitle`: Quiz title for display
  - `assignedAt`: When the quiz was assigned
  - `status`: Assignment status (assigned, started, completed)
  - `score`: Student's score when completed

### 4. **Student Dashboard Integration**
- **Location**: `app/student/assigned/page.tsx` and `AssignedPage.tsx`
- Students now see only quizzes that teachers have assigned to them
- Displays:
  - Quiz title
  - Subject and book information
  - Assigned date
  - Time limit and marks
  - Assignment status

## API Endpoints Created

### 1. **GET `/api/teacher/students`**
- **Purpose**: Fetch list of students in a specific class
- **Parameters**: 
  - `schoolId`: School ID
  - `grade`: Class/Grade
- **Response**: List of students with name, email, roll number

### 2. **POST `/api/teacher/assign-quiz`**
- **Purpose**: Create assignment records for selected students
- **Parameters**:
  - `quizId`: ID of the quiz
  - `studentIds`: Array of student IDs to assign to
  - `quizTitle`: Title of the quiz
- **Response**: Success message and assignment count

### 3. **GET `/api/student/assigned-quizzes`**
- **Purpose**: Fetch quizzes assigned to a specific student
- **Parameters**:
  - `studentId`: Student's UID
- **Response**: List of assigned quizzes with metadata

## Data Flow

1. **Quiz Creation**:
   ```
   Teacher creates quiz → Selects students → Quiz saved to `quizzes` collection
   → Assignment records created in `quizAssignments` collection
   ```

2. **Student View**:
   ```
   Student logs in → System fetches student UID → Query `quizAssignments` 
   → Fetch corresponding quiz data → Display in "Assigned" page
   ```

## Database Schema Changes

### `quizzes` Collection
Added fields:
```typescript
{
  assignedStudents: string[];  // Array of student UIDs
  assignedBy: string;          // Teacher name/email
  createdBy: string;           // Teacher UID
  // ... existing fields
}
```

### New `quizAssignments` Collection
```typescript
{
  id: string;
  quizId: string;
  studentId: string;
  quizTitle: string;
  assignedAt: timestamp;
  status: 'assigned' | 'started' | 'completed';
  startedAt?: timestamp;
  completedAt?: timestamp;
  score?: number;
}
```

## UI Components Modified

1. **Teacher Quiz Page**:
   - Added student selection state management
   - Added student fetching logic
   - Added "Assign to Students" section in confirmation modal
   - Updated quiz save logic to create assignments

2. **Student Assigned Page**:
   - Changed from showing all online quizzes to showing only assigned quizzes
   - Added client component wrapper to get student from auth context
   - Updated API integration to fetch from quizAssignments

## Usage Instructions

### For Teachers:
1. Navigate to Quiz Creation (Teacher → Create Quiz)
2. Select Grade/Subject/Book and configure questions
3. Click "Confirm & Create Quiz"
4. In the confirmation dialog, click "Assign to Students (Optional)"
5. Check/uncheck students to select
6. Create the quiz - it will be assigned to selected students

### For Students:
1. Navigate to "Assigned Quizzes" tab
2. View all quizzes teachers have assigned
3. Click on a quiz to take it
4. Score and completion status tracked

## Security Considerations

- ✅ Students can only see quizzes assigned to them (server-side filtering)
- ✅ Teachers can only assign quizzes they created
- ✅ Assignment creation validated on backend
- ⚠️ Consider adding Firestore security rules to enforce these constraints

## Future Enhancements

1. **Bulk Assignment**:
   - Assign quiz to all students in a class at once
   - Schedule quiz availability dates

2. **Analytics**:
   - Teachers can see which students completed the quiz
   - View performance statistics

3. **Notifications**:
   - Notify students when quiz is assigned
   - Email/push notifications

4. **Deadline Management**:
   - Set quiz deadline
   - Auto-close quiz after deadline
   - Warn students before deadline

5. **Reassignment**:
   - Unassign quiz from specific students
   - Reassign quiz with reset scores

## Files Modified

- `app/teacher/quiz/page.tsx` - Quiz creation with assignment
- `app/student/assigned/page.tsx` - Student assigned quizzes page
- `app/student/assigned/AssignedPage.tsx` - Client wrapper for assigned page
- `app/api/teacher/students/route.ts` - Fetch students by class
- `app/api/teacher/assign-quiz/route.ts` - Create quiz assignments
- `app/api/student/assigned-quizzes/route.ts` - Get student's assigned quizzes

## Testing Checklist

- [ ] Teacher can select students when creating quiz
- [ ] Quiz is created successfully with assignments
- [ ] Student sees assigned quiz in "Assigned" tab
- [ ] Student can start assigned quiz
- [ ] Quiz restrictions honored (time limit, marking)
- [ ] Student score tracked after completion
- [ ] Multiple quizzes assignable to same student
- [ ] Same quiz assignable to multiple students
