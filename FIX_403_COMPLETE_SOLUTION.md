# Fix 403 Forbidden Error - Complete Solution

## Quick Fix (Two Steps)

### Step 1: Update Firestore Security Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `quiz-app-ff0ab`
3. Go to **Firestore Database** → **Rules**
4. **Choose ONE of the two options below:**

#### Option A: Simple Rules (Recommended for Development) ✅
Use this for faster testing and development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all authenticated users to read everything
    match /{document=**} {
      allow read: if request.auth != null;
    }
    
    // Allow authenticated users to write their own user document
    match /users/{userId} {
      allow write: if request.auth.uid == userId;
    }
    
    // Allow authenticated admins to manage schools, campuses, quizzes
    match /schools/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /campuses/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /quizzes/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /quizAttempts/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /questions/{document=**} {
      allow write: if request.auth != null;
    }
  }
}
```

#### Option B: Strict Rules (Better for Production)
Use this for role-based access control:
- See `FIRESTORE_SECURITY_RULES.txt` in the project folder

### Step 2: Restart Your Development Server

```bash
npm run dev
```

---

## Code Changes Made ✅

The frontend has been updated to pass the user's ID token when creating schools/campuses:

**Updated Files:**
- ✅ `app/admin/organization/OrganizationClient.tsx` - Now passes Authorization header

**How it works:**
1. User clicks "Add School"
2. Frontend gets user's ID token from Firebase
3. Frontend sends token in Authorization header
4. Backend receives token and passes it to Firestore
5. Firestore verifies authentication and allows write
6. School is created ✅

---

## Expected Results

After applying the fix:

**Before** ❌
```
POST /api/admin/schools 403 in 1922ms
Firestore error: 403
```

**After** ✅
```
POST /api/admin/schools 201 in 500ms
School created successfully!
```

---

## Testing

1. Login as admin
2. Go to Admin → Organization
3. Click "Add New School"
4. Enter school name and click submit
5. Should see "School created successfully!" message

---

## Troubleshooting

### Still getting 403?
1. **Verify Firestore Rules were updated:**
   - Go to Firebase Console
   - Check that the new rules are published (not just in preview)
   - Rules should show "Deployed" status

2. **Verify user is authenticated:**
   - Make sure you're logged in as admin
   - Check browser console for any auth errors

3. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Clear all browser data
   - Try again

### Rules syntax error?
1. Firebase will show a syntax error in red
2. Copy-paste the rules again carefully
3. Make sure there are no extra spaces or special characters

### Still having issues?
1. Restart dev server: `npm run dev`
2. Clear `.next` folder: `rm -rf .next`
3. Rebuild: `npm run build`

---

## Next Steps

Once this is working:
1. Test creating multiple schools
2. Test creating campuses within schools
3. Test all other admin operations
4. Monitor Firestore for data consistency

---

**Status**: Ready to deploy ✅
