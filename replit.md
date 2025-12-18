# Quiz Application - Test Generator

## Overview
A modern educational platform built with Next.js for creating, managing, and analyzing quizzes with role-based access for administrators, teachers, and students. The platform aims to provide a comprehensive solution for educational institutions, supporting various user roles including School Admins, Moderators, and Content Creators. It focuses on intuitive UI, advanced question types, and robust analytics to enhance the learning and teaching experience, including a visual formula builder for math questions and professional data visualization.

## User Preferences
I prefer iterative development with a focus on high-level features before diving into granular details. Please ensure consistent UI/UX across all new features, adhering to modern design principles. I like clean, well-structured code. Do not make changes to the folder `public/`.

## System Architecture
The application is built on Next.js 15.5.2 with TypeScript and Tailwind CSS for the frontend. Firebase (Firestore) serves as the backend for data storage and authentication. The UI incorporates React components with drag-and-drop functionality, charts, and math rendering.

**UI/UX Decisions:**
- **Theming:** Distinct color themes for different user panels (e.g., Admin: emerald, Teacher: Oxford-branded orange, Student: purple, School Admin: indigo, Moderator: teal, Content Creator: violet).
- **Design Patterns:** Modern white surfaces with accent colors, consistent spacing, shadow elevation, and rounded corners.
- **Data Visualization:** Extensive use of the Recharts library for professional and interactive charts (AreaChart, PieChart, BarChart, LineChart) across all dashboards.
- **Responsiveness:** Mobile-first responsive design with touch-friendly navigation (≥44x44px touch targets) and proper layout adjustments for all interfaces.

**Technical Implementations & Feature Specifications:**
- **Role-Based Access:** Comprehensive role-based access control for Admin, Teacher, Student, School Admin, Moderator, and Content Creator with respective dashboards and navigation.
- **Enhanced Login System:** Role selection dropdown with automatic redirection to specific dashboards.
- **Formula Builder:** Visual formula builder modal for Math questions with click-to-insert symbol buttons, live preview, and automatic LaTeX-to-Unicode conversion for human-readable display.
- **Urdu Language Support:** Full RTL (right-to-left) text support with Noto Nastaliq Urdu font rendering. Includes an integrated on-screen Urdu keyboard for typing.
- **Bulk Question Upload with Metadata Validation:** CSV/Excel template system with embedded metadata for validating uploaded questions against selected course parameters.
- **Interactive Question Types:** A comprehensive drag-and-drop system supporting five distinct question types: Drag & Drop, Diagram Labeling, Textual Matching, Fill-in-the-Blanks, Column Sorting, and Sequence Ordering.
- **Document Generation:** Enhanced PDF and Word exports with comprehensive headers and proper formatting for various question types, including LaTeX formula rendering using MathJax and human-readable LaTeX-to-Unicode conversion for Word.
- **Dashboard Redesigns:** Complete UI overhauls for Admin, Teacher, and Student dashboards, and new panels for School Admin, Moderator, and Content Creator, all featuring KPI cards, growth indicators, and data visualizations.
- **Learning & Gamification:** Engaging leaderboard system with podium display, time period filters, achievement badges, and streak tracking. Consolidated quiz history into the student dashboard.
- **Content Management:** Redesigned Books & Chapters management UI with full edit/delete functionality.

**System Design Choices:**
- Next.js App Router structure for organized routing.
- Reusable React components for UI consistency.
- Firebase integration for real-time data updates.
- MathLive for advanced mathematical content input and rendering.

## External Dependencies
- **Frontend Framework:** React 19.1.1 with Next.js 15.5.2
- **Styling:** Tailwind CSS
- **Backend/Database/Authentication:** Firebase (Firestore)
- **Mathematical Content:** MathLive (for equation editor), MathJax (for rendering)
- **Data Visualization:** Recharts
- **Animations:** GSAP
- **Icons:** react-icons

## Recent Changes (December 1, 2025)

**OUP Admin Dynamic User Management with Database Integration:**
- Made OUP Admin user creation fully dynamic with Firebase Firestore integration
- API Routes Created:
  - `/api/admin/schools` - GET/POST for school management
  - `/api/admin/campuses` - GET/POST for campus management with school filtering
  - `/api/admin/users` - GET/POST/PUT/DELETE for user CRUD operations
- User creation follows structured flow:
  1. Select role (School Admin, Teacher, Student, Content Manager)
  2. Select school from dropdown
  3. Select campus (if school has campuses, optional step)
  4. Enter user details (name, email, role-specific fields)
- Role-specific fields:
  - Students: grade, section, roll number
  - Teachers: subjects, assigned grades
  - Content Managers: subjects
- Users saved to Firestore with schoolId, campusId, schoolName, campusName

**Organization Setup Page Redesigned:**
- Removed departments/subjects view
- Now shows all schools with expandable campus list
- Displays user counts per school (students, teachers, total)
- Displays user counts per campus when expanded
- Add School button opens modal with name, address, city, contact fields
- Add Campus button opens modal with school selection and campus details
- Summary cards show totals: Schools, Campuses, Total Users, Students, Teachers

**School Admin User Management - Unified User View:**
- Consolidated separate "Teacher Management" and "Student Management" into single "User Management" feature
- Created Server Component (page.tsx) for database data fetching
- Created Client Component (UsersClient.tsx) for interactive UI
- Features:
  - Three tabs: Students, Teachers, Content Managers (with counts)
  - Students tab: Grade dropdown filter, table view with name, email, grade, section, roll number, status
  - Teachers tab: Card view showing assigned subjects, classes, and grades
  - Content Managers tab: Card view with contact info and creator details
  - Search functionality across all tabs (by name, email, subjects)
  - School filter buttons when multiple schools exist in database
  - Summary cards showing totals for each user type
- School-scoped filtering: Users filtered by schoolId (via URL parameter or session)
- Proper empty states for when no users exist
- Note: For production, integrate with Firebase Admin SDK for secure authentication

## Recent Changes (November 28, 2025)

**Teacher Books & Chapters Page - Dynamic Database Integration:**
- Converted Books & Chapters page from static mock data to real-time Firestore data
- Uses Server Component pattern (page.tsx) for data fetching, Client Component (BooksClient.tsx) for UI
- Aggregates questions by grade, subject, book, and chapter with counts
- Replaced static "Topics" count with dynamic "SLOs" (Student Learning Outcomes) count
- Each chapter displays:
  - Number of SLOs (Student Learning Outcomes) 
  - Number of questions available
  - Actual SLO names as purple tags
- Grade filter buttons for easy navigation
- Subject-specific icons and colors (English: blue, Math: purple, Urdu: green, Science: orange, Computer: cyan)
- Quick link to generate quiz from selected book
- Robust error handling and empty states

**Student Dashboard Real-Time Data Integration:**
- Fixed project ID mismatch across API routes (corrected to `quiz-app-f197b`)
- Converted student dashboard from client-side to server-side data fetching
- Created `app/student/dashboard/page.tsx` as Server Component for data fetching
- Created `app/student/dashboard/DashboardClient.tsx` as Client Component for UI
- Dashboard now displays real-time data from Firestore:
  - Average Score: Calculated from all quiz attempts
  - Quizzes Attempted: Actual count from quizAttempts collection
  - Upcoming Quizzes: Filtered by future start dates
  - Last Quiz Score: Most recent quiz attempt
  - Recent Scores: Color-coded badges with percentage and marks
  - Quiz History: Full history table with retake functionality
- Fixed Firestore doubleValue parsing bug: Now properly parsed with parseFloat() to prevent string concatenation in calculations
- Numeric fields now default to 0 when absent to prevent calculation errors

**Student Dashboard Animations:**
- Added engaging CSS animations for student engagement:
  - Animated number counters that smoothly count up from 0
  - Animated circular progress rings that fill progressively
  - Staggered fade-in animations for sections (delayed entrance effects)
  - Scale and slide-in animations for stat cards
  - Hover effects with scale transforms, shadows, and shimmer overlays
  - Gradient score badges with color coding (green for 80%+, yellow for 60%+, red below)
  - Pulsing animations on empty state icons
  - Smooth transitions on interactive elements

## Recent Changes (November 27, 2025)

**Fixed Firebase Data Fetching for Student Pages:**
- Resolved critical Firebase SDK blocking issue in Replit/Next.js 15 environment
- Root cause: CORS restrictions prevent browser-side fetch to Firestore REST API
- Solution: Implemented server-side data fetching pattern using Next.js API routes
- Created `/api/quizzes` API route for fetching quiz lists (server-side REST calls)
- Created `/api/quizzes/[id]` API route for fetching individual quizzes
- Created `/api/quiz-attempts` API route for saving quiz attempt results
- Student Assigned Quizzes page now uses Server Components for data fetching
- Quiz Attempt page updated to use internal API routes instead of Firebase SDK
- Architecture: Server Components fetch data → pass to Client Components as props

**Interactive Quiz and Quiz Generator Data Mapping:**
- Unified data structure between Interactive Quiz tab and Quiz Generator tab
- Both tabs now use the same Grade, Subject, Book, Chapter, SLO, and Difficulty fields
- Interactive questions created in Interactive Quiz tab now appear in Quiz Generator when matching criteria are selected
- Updated QuizMeta type to include book, slo, and difficulty fields
- Interactive Quiz saves questions to Firebase with proper field mapping (grade, class, subject, book, chapter, slo, difficulty, type, questionType, isInteractive, interactiveData)
- Quiz Generator fetches and counts interactive questions correctly
- Added dynamic chapter and SLO suggestions based on existing questions in database

**Quiz Format Selection System:**
- Added format selection modal that appears when teachers access the quiz generation page
- Two format options available:
  - **Online Quiz**: Interactive quizzes with all question types and student assignment capability
  - **Offline (Printable)**: Printable quizzes with basic question types for paper-based assessments
- Format is displayed in the page header with a "Change Format" option
- Configuration steps (Course Selection, Chapters, SLOs, Questions) only appear after format is selected
- Quiz format is saved to Firestore with each quiz for tracking and filtering

## Recent Changes (November 25, 2025)

**Made Teacher Dashboard Fully Responsive:**
- Implemented mobile-first responsive design for all screen sizes
- Stat cards: 2-column grid on mobile, 4-column on desktop
- Progress indicator: Circular on desktop, linear progress bar on mobile
- Assigned Books cards: Stacked layout on mobile, horizontal on desktop
- To-Do items: Properly sized touch targets (minimum 44x44px)
- Typography scales smoothly from mobile to desktop
- Added hamburger menu button for mobile navigation
- All buttons have touch-manipulation for better mobile interaction

**Enhanced Quiz Configuration with Multi-Select Difficulty Levels:**
- Replaced single difficulty dropdown with multi-select checkbox interface
- Teachers can select one or more difficulty levels (Easy, Medium, Hard) for each question type
- Available question count updates in real-time based on selected difficulties
- All three difficulties selected by default for maximum flexibility
- Validation prevents deselecting all difficulties (at least one required)