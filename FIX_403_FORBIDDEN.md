# Fix 403 Forbidden Error - Firestore Security Rules Update

## Problem
You're getting `403 Forbidden` errors when trying to POST to `/api/admin/schools` because Firestore security rules are blocking the writes.

## Solution: Update Firestore Security Rules

### Step-by-Step Guide

#### 1. Go to Firebase Console
- Visit [Firebase Console](https://console.firebase.google.com/)
- Select your project: `quiz-app-ff0ab`

#### 2. Navigate to Firestore Rules
- Go to **Firestore Database** 
- Click on **Rules** tab at the top

#### 3. Replace Current Rules
Delete all existing rules and paste these new rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Allow admin operations (schools, campuses, quizzes, etc.)
    match /schools/{document=**} {
      allow read: if request.auth != null;
      allow create, update, delete: if isAdmin();
    }
    
    match /campuses/{document=**} {
      allow read: if request.auth != null;
      allow create, update, delete: if isAdmin();
    }
    
    // Allow teachers to create and manage quizzes
    match /quizzes/{document=**} {
      allow read: if request.auth != null;
      allow create: if isTeacher() || isAdmin();
      allow update, delete: if isOwnerOrAdmin(resource.data.createdBy);
    }
    
    // Allow students to read quizzes and create attempts
    match /quizAttempts/{document=**} {
      allow read, create: if request.auth.uid == resource.data.studentId || isAdmin();
      allow update: if request.auth.uid == resource.data.studentId;
    }
    
    // Allow questions to be managed by teachers and admins
    match /questions/{document=**} {
      allow read: if request.auth != null;
      allow create: if isTeacher() || isAdmin();
      allow update, delete: if isOwnerOrAdmin(resource.data.createdBy);
    }
    
    // Default deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
    
    // Helper functions
    function isAdmin() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    
    function isTeacher() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Teacher';
    }
    
    function isOwnerOrAdmin(createdBy) {
      return request.auth.uid == createdBy || isAdmin();
    }
  }
}
```

#### 4. Publish the Rules
- Click **Publish** button
- Wait for the rules to deploy (usually takes a few seconds)

---

## What These Rules Do

✅ **Authenticated users** can read schools, campuses, quizzes
✅ **Admins** can create, update, delete schools and campuses
✅ **Teachers** can create quizzes
✅ **Students** can take quiz attempts
✅ **Everyone else** gets denied by default

---

## Code Changes Made

Your API endpoints have been updated to pass the Authorization header:

1. ✅ `app/api/admin/schools/route.ts` - Now includes `Authorization` header
2. ✅ `app/api/admin/campuses/route.ts` - Now includes `Authorization` header

When you make requests from your UI, pass the user's ID token:

```typescript
const idToken = await user.getIdToken();

const response = await fetch('/api/admin/schools', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,  // ← Add this
  },
  body: JSON.stringify(schoolData),
});
```

---

## Expected Results After Fix

✅ Admin login works
✅ Can create schools (POST /api/admin/schools → 200)
✅ Can create campuses (POST /api/admin/campuses → 200)
✅ No more 403 errors
✅ No more Firestore timeout errors

---

## Troubleshooting

### Still getting 403?
1. Verify your admin user has `role: "Admin"` in Firestore
2. Verify the user is properly authenticated
3. Check the Firebase Console logs for detailed error

### Rules not publishing?
1. Check for syntax errors in the rules
2. Try publishing again
3. Clear browser cache and reload

### Still getting timeouts?
1. Check your internet connection
2. Try rebuilding: `npm run build && npm run dev`
3. Restart the development server

---

## Important Notes

⚠️ These rules check if a user has the Admin role by reading from the `users` collection. Make sure your admin user document exists with `role: "Admin"`.

⚠️ The rules use Firestore `exists()` and `get()` functions which perform read operations. If you have many users, this could be slow. Consider using Firebase custom claims for better performance.

---

**Next Step**: Update your Firestore rules now, then test creating a school through the admin panel.
