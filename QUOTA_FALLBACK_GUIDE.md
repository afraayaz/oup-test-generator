# Firebase Quota Fallback System Guide

## Overview
Your project now has **automatic quota overflow protection** with fallback to a secondary Firebase account. When the primary Firebase project hits quota limits, the system automatically switches to a backup account and retries the request.

## ✅ What's Already Implemented

### Updated API Routes (12 routes):
- ✅ `/api/admin/subjects` - Auto-retry with fallback
- ✅ `/api/admin/chapters` - Auto-retry with fallback
- ✅ `/api/admin/dashboard-stats` - Auto-retry with fallback
- ✅ `/api/admin/users` - Support for fallback
- ✅ `/api/admin/schools` - Support for fallback
- ✅ `/api/admin/books` - Support for fallback
- ✅ `/api/admin/books-by-subject` - Support for fallback
- ✅ `/api/admin/question-banks` - Support for fallback
- ✅ `/api/admin/question-banks/[schoolId]` - Support for fallback
- ✅ `/api/admin/oup-questions` - Support for fallback
- ✅ `/api/auth/setup` - Support for fallback
- ✅ `/api/auth/check-role` - Support for fallback

### Three ways to handle quota errors:

#### 1. **Auto Retry Wrapper** (Recommended for new routes)
```typescript
import { withQuotaFallback } from '@/lib/firebaseAdmin';

export async function GET() {
  return withQuotaFallback(
    async (db) => {
      const snapshot = await db.collection('users').get();
      return snapshot.docs;
    }
  );
}
```

#### 2. **Manual Fallback** (For complex logic)
```typescript
import { getDb, switchToSecondaryFirebase, resetToPrimaryFirebase, isQuotaError } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const currentDb = await getDb();
    const data = await currentDb.collection('users').get();
    resetToPrimaryFirebase();
    return data;
  } catch (error) {
    if (isQuotaError(error)) {
      switchToSecondaryFirebase();
      const backupDb = await getDb();
      return await backupDb.collection('users').get();
    }
    throw error;
  }
}
```

#### 3. **Detection Helper** (For error checking)
```typescript
import { isQuotaError } from '@/lib/firebaseAdmin';

try {
  // Your operation
} catch (error) {
  if (isQuotaError(error)) {
    console.warn('Quota exceeded');
  }
}
```

## 📋 Setup Second Firebase Account

### Step 1: Create Second Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"**
3. Enter name: `quiz-app-backup` (or any name)
4. Click **"Create project"**

### Step 2: Enable Firestore
1. In new project → **Build** → **Firestore Database**
2. Click **"Create database"**
3. Select **"Production mode"**
4. Choose region and **"Create"**

### Step 3: Get Service Account Key
1. Go to **Project Settings** (⚙️ icon)
2. Click **"Service Accounts"** tab
3. Click **"Generate New Private Key"**
4. JSON file downloads automatically

### Step 4: Add to .env.local
```env
# Secondary Firebase Account (Optional Fallback for Quota)
FIREBASE_PROJECT_ID_2=quiz-app-backup
FIREBASE_CLIENT_EMAIL_2=firebase-adminsdk-xxxx@quiz-app-backup.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY_2=-----BEGIN PRIVATE KEY-----\nMIIEvAIBA...your-key...\n-----END PRIVATE KEY-----
```

### Step 5: Restart Server
```bash
npm run dev
```

You should see in logs:
```
✅ Firebase Admin SDK initialized successfully
🔍 Initializing secondary Firebase Admin SDK...
✅ Secondary Firebase Admin SDK initialized
```

## 🔄 How It Works

1. **Primary Request**: Tries primary Firebase first
2. **Quota Error Detected**: If `RESOURCE_EXHAUSTED` or `quota exceeded` error
3. **Automatic Switch**: Switches to secondary Firebase
4. **Retry Request**: Retries the same operation on secondary
5. **Fallback Success**: Returns data from secondary if successful
6. **Both Failed**: Returns 503 error

## 📊 Quota Error Signals

The system detects quota errors by checking:
- `error.code === 'RESOURCE_EXHAUSTED'`
- `error.message.includes('quota')`
- `error.message.includes('too many requests')`
- `error.message.includes('Quota exceeded')`

## 🧪 Testing

### Test Primary Firebase
```bash
curl http://localhost:3000/api/admin/subjects
```

### Test Fallback (Disable Primary)
Temporarily comment out `FIREBASE_PRIVATE_KEY` in `.env.local`, server should use secondary.

## 📝 Available Functions

In `lib/firebaseAdmin.ts`:

```typescript
// Get current database (primary or secondary if switched)
const db = await getDb();

// Get current auth (primary or secondary if switched)
const auth = await getAuth();

// Check if error is quota-related
isQuotaError(error: any): boolean

// Switch to secondary Firebase
switchToSecondaryFirebase(): boolean

// Reset to primary Firebase
resetToPrimaryFirebase(): void

// Auto-retry wrapper
withQuotaFallback<T>(
  operation: (db: any) => Promise<T>,
  retryOperation?: (db: any) => Promise<T>
): Promise<T>

// Manual initialization of secondary
initializeSecondaryFirebase(): Promise<boolean>
```

## ⚠️ Important Notes

1. **Data Sync**: Make sure both Firebase projects have the same database structure
2. **Auth Users**: Consider replicating critical users to secondary project
3. **Monitoring**: Monitor logs for quota errors to plan upgrades
4. **Temporary**: Fallback is meant for temporary quota overflow, not long-term solution
5. **Read Only**: Fallback works best for read operations; writes should sync carefully

## 🚀 Production Checklist

- [ ] Secondary Firebase project created
- [ ] Service account key generated
- [ ] Environment variables set (.env.local and hosting platform)
- [ ] Server restarted and logs show both Firebase instances initialized
- [ ] Tested fallback by temporarily disabling primary
- [ ] Database sync verified between projects
- [ ] Team notified about quota fallback strategy
- [ ] Monitoring/logging reviewed

## 🆘 Troubleshooting

**"No secondary Firebase configured"**
- Check `FIREBASE_PROJECT_ID_2`, `FIREBASE_PRIVATE_KEY_2`, `FIREBASE_CLIENT_EMAIL_2` in `.env.local`
- Ensure private key uses `\n` for newlines (not actual line breaks)

**Secondary Firebase not initializing**
- Verify service account has Firestore permissions
- Check project ID matches exactly
- Ensure database exists in secondary project

**Still hitting quota after switching**
- Both projects hitting limits - need to upgrade quota on Firebase billing
- Check if fallback is actually being triggered in logs
- Verify retry logic is correctly implemented

## 📞 Support

For issues:
1. Check server logs for "Switching to secondary Firebase" message
2. Verify both projects are properly configured
3. Check .env.local for correct format of credentials
