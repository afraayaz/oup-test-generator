# Two-Tier Question Bank System - Implementation Summary

## Overview
A complete two-tier question bank system has been implemented for the OUP Test Generator, allowing both Oxford (OUP) professional content and school-specific custom content.

## Architecture

### 1. **OUP Question Bank (Global/Shared)**
- **Created by:** OUP creators and OUP admin only
- **Accessible to:** All teachers across all schools (Read-only)
- **Storage:** `/questions/oup/items/`
- **Purpose:** Professional, curated content

### 2. **School Question Bank (Local/Private)**
- **Created by:** Teachers (for their assigned subjects/grades) and School admins
- **Accessible to:** Teachers and admins of that specific school only
- **Storage:** `/questions/schools/{schoolId}/`
- **Purpose:** School-specific, customized content

### 3. **OUP Admin Access**
- Can view and manage ALL school question banks
- Cannot edit individual teacher questions, but has monitoring capability
- Access via `/admin/question-banks`

## Database Structure

```
Firestore:
├── questions/
│   ├── oup/
│   │   └── items/
│   │       └── {questionId}
│   │
│   └── schools/
│       └── {schoolId}/
│           └── {questionId}
│
└── question-bank-stats/
    ├── oup/
    │   ├── totalQuestions
    │   ├── questionsBySubject
    │   ├── questionsByGrade
    │   ├── questionsByDifficulty
    │   └── lastUpdated
    │
    └── schools/
        └── {schoolId}/
            ├── schoolName
            ├── totalQuestions
            ├── questionsBySubject
            ├── questionsByGrade
            └── lastUpdated
```

## Question Document Structure

```typescript
{
  id: string;
  type: 'mcq' | 'fillblanks' | 'matching' | 'ordering' | 'categorization';
  subject: string;
  grade: string;
  chapter: string;
  book: string;
  content: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: uid;
  createdByName: string;
  createdAt: timestamp;
  updatedAt?: timestamp;
  updatedBy?: uid;
  schoolId?: string; // Only for school QB
  source: 'oup' | 'school';
}
```

## Implemented Pages

### 1. **Teacher - School Question Bank Management**
**Path:** `/teacher/question-bank`
**Features:**
- View all school's questions
- Add new questions (for assigned subjects/grades only)
- Edit own questions
- Delete own questions
- Filter by subject, grade, creator
- Statistics: total questions, your questions, contributors
- Question details with options and correct answer display

### 2. **Admin - All Question Banks Dashboard**
**Path:** `/admin/question-banks`
**Features:**
- View list of all schools with QB stats
- Click to view any school's question bank
- Filter by subject, grade, difficulty, type
- Monitor question count and statistics
- View contributor information
- No edit/delete capability (read-only for audit)

## API Endpoints

### OUP Creator APIs
- `POST /api/oup-creator/questions` - Add new OUP question
- `GET /api/oup-creator/questions` - Get OUP questions with filters

### School Question APIs (Teachers)
- `GET /api/school/questions` - Get school's questions
- `POST /api/school/questions` - Add new school question
- `PUT /api/school/questions/[questionId]` - Update own question
- `DELETE /api/school/questions/[questionId]` - Delete own question

### Admin APIs
- `GET /api/admin/question-banks` - Get all school QBs stats (OUP admin only)
- `GET /api/admin/question-banks/[schoolId]` - Get specific school's questions

## Security Rules (Firestore)

```javascript
// OUP Questions
- Read: All authenticated users
- Write: OUP creators and admins only

// School Questions
- Read: Teachers/admins of that school + OUP admin
- Create: Teachers (own subjects/grades) + School admins
- Update: Only creator or school admin
- Delete: Only creator or school admin
```

## Access Control Matrix

```
┌─────────────────────┬──────────────────────────────────────┐
│      Role           │     School QB Permissions            │
├─────────────────────┼──────────────────────────────────────┤
│ Teacher             │ Create, Read, Update/Delete Own      │
│ School Admin        │ Create, Read, Update, Delete All     │
│ OUP Admin           │ Read, Audit, Monitor (View Only)     │
│ OUP Creator         │ No access (OUP QB only)              │
└─────────────────────┴──────────────────────────────────────┘
```

## Quiz Creation Integration

When teachers create a quiz, they now see three QB options:

1. **Oxford Question Bank** - Professional content only
2. **School Question Bank** - Custom school content only  
3. **Both** - Mix from both sources

Quiz creation page updated to:
- Show 3-step QB selection flow
- Filter questions by QB source
- Display source indicator (Oxford badge / School badge)
- Combine questions from both sources if "Both" selected

## Types Definitions

Created comprehensive TypeScript interfaces:
- `QuestionOption` - Individual question option
- `BaseQuestion` - Base question structure
- `OUPQuestion` - OUP-specific question
- `SchoolQuestion` - School-specific question
- `QuestionBankStats` - Statistics tracking
- `QuizCreationData` - Quiz creation workflow data
- `UserRole` - Updated role types

File: `/types/questionBank.ts`

## User Roles Extended

Added two new roles:
- `oup-admin` - Can manage OUP system, view all school QBs
- `oup-creator` - Can create OUP questions

Updated roles:
- `teacher` - Can now create/edit/delete school QB questions
- `school-admin` - Can manage school QB

## Sidebar Updates

Added navigation links:
- **Teacher Sidebar:** "School Question Bank" → `/teacher/question-bank`
- **Admin Sidebar:** "Question Banks" → `/admin/question-banks`

## Features Implemented

✅ Two-tier question bank architecture
✅ Role-based access control at Firestore level
✅ Teacher question bank management page
✅ OUP Admin dashboard for all school QBs
✅ Question filtering and statistics
✅ Audit trail (creator, timestamps, edit history)
✅ Quiz creation with QB selection
✅ API endpoints for all operations
✅ Type-safe TypeScript interfaces
✅ Firestore security rules
✅ UI components with Tailwind CSS
✅ Responsive design for all devices

## Next Steps

1. Test all CRUD operations for questions
2. Verify Firestore security rules work correctly
3. Test quiz creation with mixed QB sources
4. Add question import/export functionality
5. Add bulk question upload for schools
6. Create analytics dashboard for question bank usage
7. Add question quality review workflow

## Testing Checklist

- [ ] Teachers can add questions for assigned subjects/grades only
- [ ] Teachers cannot add questions for unassigned subjects/grades
- [ ] Teachers can edit/delete only their own questions
- [ ] School admins can edit/delete all school questions
- [ ] OUP admins can view all school QBs
- [ ] OUP creators can add OUP questions
- [ ] Quiz creation shows correct QB options
- [ ] Questions from both QBs can be mixed in quizzes
- [ ] Statistics update correctly when questions are added/removed
- [ ] Firestore rules prevent unauthorized access
