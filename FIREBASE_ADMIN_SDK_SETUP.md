# Firebase Admin SDK Migration - Setup Guide

## ✅ Completed Migrations

The following API routes have been updated to use **Firebase Admin SDK** instead of REST API:

### Admin Routes
- `app/api/admin/subjects/route.ts` - CRUD operations for subjects
- `app/api/admin/users/route.ts` - User management (GET, POST, PUT, DELETE)
- `app/api/admin/schools/route.ts` - School management
- `app/api/admin/question-banks/route.ts` - Question bank stats
- `app/api/admin/question-banks/[schoolId]/route.ts` - School-specific questions
- `app/api/admin/books/route.ts` - Book management (POST, PUT, DELETE)
- `app/api/admin/books-by-subject/route.ts` - Books by subject

### Auth Routes
- `app/api/auth/setup/route.ts` - User setup after registration
- `app/api/auth/check-role/route.ts` - Check user role from database

### Library Updates
- `lib/firebaseAdmin.ts` - Updated with full Admin SDK implementation

---

## 🔧 Setup Instructions

### Step 1: Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (quiz-app-ff0ab)
3. Go to **Settings** (gear icon) → **Project Settings**
4. Navigate to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file securely (do NOT commit to git)

### Step 3: Add Environment Variables

Create or update `.env.local` with:

```bash
FIREBASE_PROJECT_ID=quiz-app-ff0ab
FIREBASE_CLIENT_EMAIL=<copy from service account JSON>
FIREBASE_PRIVATE_KEY=<copy from service account JSON>
```

**Important:** The private key has literal `\n` characters. Your `.env.local` should look like:
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n"
```

### Step 4: Update .gitignore

Make sure these are in your `.gitignore`:
```
.env.local
.env*.local
firebase-key.json
service-account-key.json
```

---

## 📊 Benefits of Admin SDK Migration

| Aspect | REST API (Old) | Admin SDK (New) |
|--------|---|---|
| **Performance** | Slower (HTTP overhead) | ⚡ Direct SDK calls |
| **Data Parsing** | Complex manual parsing | ✨ Automatic conversion |
| **Error Handling** | Limited error info | 🔍 Better error messages |
| **Security** | Service account exposed | 🔒 Credentials on server only |
| **Auth Operations** | Limited | ✅ Full Firebase Auth support |
| **Reliability** | Network errors common | 🛡️ Built-in retries |
| **Code Maintainability** | Verbose (parsing functions) | 📝 Clean, simple code |

---

## 🔐 Security Notes

### What Changed
- ❌ **Old:** API keys visible in requests, REST endpoints public
- ✅ **New:** Service account credentials secured on server, requests use Admin SDK

### Best Practices
1. **Never** commit `.env.local` to git
2. **Never** log credentials
3. **Use** different service accounts for different environments (dev, staging, prod)
4. **Rotate** service account keys periodically
5. **Monitor** Firebase console for unusual activity

---

## 🧪 Testing the Migration

### Test Subject Endpoint
```bash
curl -X GET http://localhost:3000/api/admin/subjects
```

Expected response:
```json
{
  "subjects": [
    {
      "id": "subject123",
      "name": "Mathematics",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "books": []
    }
  ]
}
```

### Test User Endpoint
```bash
curl -X GET http://localhost:3000/api/admin/users?schoolId=school123
```

Expected response:
```json
{
  "users": [
    {
      "id": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "teacher"
    }
  ]
}
```

---

## 📝 API Route Examples

### Getting Data (No REST API parsing needed)
```typescript
// OLD - Complex parsing required
const response = await fetch(FIRESTORE_URL);
const data = await response.json();
const subjects = data.documents.map(doc => ({
  id: doc.name.split('/').pop(),
  name: doc.fields.name.stringValue,
  ...
}));

// NEW - Direct SDK access
const snapshot = await db.collection('subjects').get();
const subjects = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data(),
}));
```

### Creating Data
```typescript
// OLD - Manual Firestore format
const fields = { name: { stringValue: 'Math' } };
await fetch(FIRESTORE_URL, {
  method: 'POST',
  body: JSON.stringify({ fields })
});

// NEW - Natural JavaScript objects
await db.collection('subjects').add({ name: 'Math' });
```

### Querying with Filters
```typescript
// OLD - Fetch all, then filter in code
const allUsers = await fetch(FIRESTORE_URL).then(r => r.json());
const filtered = allUsers.documents.filter(...);

// NEW - Query at database level
const snapshot = await db.collection('users')
  .where('role', '==', 'teacher')
  .where('schoolId', '==', schoolId)
  .get();
```

---

## 🚨 Remaining Routes to Migrate

The following routes still use REST API and should be migrated:

- `app/api/quizzes/route.ts`
- `app/api/quiz-attempts/route.ts`
- `app/api/teacher/questions/route.ts`
- `app/api/oup-creator/questions/route.ts`
- `app/api/admin/campuses/route.ts`
- `app/api/admin/reset-password/route.ts`

You can use the same pattern from the migrated routes above.

---

## 🆘 Troubleshooting

### Error: "Firebase Admin SDK not initialized"
- Check that environment variables are set correctly
- Ensure the private key is properly escaped with `\n` characters
- Verify the service account has permissions in Firebase

### Error: "Permission denied" on Firestore operations
- Check Firestore security rules
- Ensure service account has Editor role in Firebase project
- Try setting temporary permissive rules for testing:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
  ```

### Error: "User not found" during auth operations
- Ensure `FIREBASE_PRIVATE_KEY` is properly formatted
- Check that the user exists in Firebase Authentication
- Verify the UID matches the one in Firestore

---

## 📚 References

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Admin SDK Guide](https://firebase.google.com/docs/firestore/quickstart#admin)
- [Firebase Auth Admin SDK](https://firebase.google.com/docs/auth/admin-setup)
- [Service Account Key Setup](https://firebase.google.com/docs/admin/setup#initialize_the_sdk)

---

## ✨ Summary

All major admin and auth routes have been migrated to Firebase Admin SDK. This provides:
- **Better security** - credentials on server only
- **Cleaner code** - no more manual parsing
- **Better performance** - direct SDK calls
- **Easier maintenance** - standard Firebase patterns

Keep your `.env.local` file secure and never commit it to version control!
