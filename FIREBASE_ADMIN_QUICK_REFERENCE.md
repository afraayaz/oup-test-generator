# Firebase Admin SDK - Quick Reference Guide

## Installation
```bash
npm install firebase-admin
```

## Basic Setup (Already Done in lib/firebaseAdmin.ts)
```typescript
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
```

---

## Common Operations

### READ Operations

#### Get all documents
```typescript
const snapshot = await db.collection('users').get();
const users = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data(),
}));
```

#### Get single document
```typescript
const doc = await db.collection('users').doc('userId').get();
if (doc.exists) {
  const user = { id: doc.id, ...doc.data() };
}
```

#### Query with filters
```typescript
const snapshot = await db.collection('users')
  .where('role', '==', 'teacher')
  .where('schoolId', '==', 'school123')
  .limit(10)
  .get();
```

#### Query with ordering and pagination
```typescript
const snapshot = await db.collection('quizzes')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();
```

---

### WRITE Operations

#### Create document
```typescript
const docRef = await db.collection('users').add({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'teacher',
  createdAt: new Date().toISOString(),
});
console.log('Created:', docRef.id);
```

#### Create with specific ID
```typescript
await db.collection('users').doc('userId123').set({
  name: 'John Doe',
  email: 'john@example.com',
}, { merge: false }); // set to true to merge with existing
```

#### Update document
```typescript
await db.collection('users').doc('userId').update({
  name: 'Jane Doe',
  updatedAt: new Date().toISOString(),
});
```

#### Update multiple fields
```typescript
const updateData = {
  role: 'admin',
  status: 'active',
  lastLogin: new Date().toISOString(),
};
await db.collection('users').doc('userId').update(updateData);
```

#### Delete document
```typescript
await db.collection('users').doc('userId').delete();
```

#### Delete field
```typescript
await db.collection('users').doc('userId').update({
  tempField: admin.firestore.FieldValue.delete(),
});
```

---

### Subcollections

#### Get subcollection
```typescript
const snapshot = await db
  .collection('subjects')
  .doc('subjectId')
  .collection('books')
  .get();

const books = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data(),
}));
```

#### Add to subcollection
```typescript
const docRef = await db
  .collection('subjects')
  .doc('subjectId')
  .collection('books')
  .add({
    title: 'Mathematics',
    grade: '10',
    chapters: 12,
  });
```

#### Query subcollection
```typescript
const snapshot = await db
  .collectionGroup('books')
  .where('grade', '==', '10')
  .get();
```

---

## Firebase Authentication Operations

### Create user
```typescript
import { auth } from '@/lib/firebaseAdmin';

const userRecord = await auth.createUser({
  email: 'user@example.com',
  password: 'password123',
  displayName: 'User Name',
});
console.log('Created:', userRecord.uid);
```

### Get user by email
```typescript
const userRecord = await auth.getUserByEmail('user@example.com');
console.log('UID:', userRecord.uid);
```

### Get user by UID
```typescript
const userRecord = await auth.getUser('userId');
console.log('Email:', userRecord.email);
```

### Update user
```typescript
await auth.updateUser('userId', {
  email: 'newemail@example.com',
  password: 'newpassword123',
});
```

### Delete user
```typescript
await auth.deleteUser('userId');
```

### Set custom claims
```typescript
await auth.setCustomUserClaims('userId', {
  role: 'admin',
  schoolId: 'school123',
});
```

### Create custom token
```typescript
const customToken = await auth.createCustomToken('userId', {
  role: 'teacher',
  schoolId: 'school123',
});
```

---

## API Route Pattern

### GET Multiple
```typescript
import { db } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let query = db.collection('users');
    if (role) {
      query = query.where('role', '==', role);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
```

### POST Create
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const docRef = await db.collection('users').add({
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      user: { id: docRef.id, name, email, role } 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

### PUT Update
```typescript
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    await db.collection('users').doc(id).update({
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    const updated = await db.collection('users').doc(id).get();

    return NextResponse.json({ 
      success: true, 
      user: { id: updated.id, ...updated.data() } 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}
```

### DELETE
```typescript
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    await db.collection('users').doc(id).delete();

    return NextResponse.json({ 
      success: true, 
      message: 'Deleted successfully' 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}
```

---

## Advanced Queries

### AND conditions
```typescript
const snapshot = await db.collection('users')
  .where('role', '==', 'teacher')
  .where('schoolId', '==', 'school123')
  .where('status', '==', 'active')
  .get();
```

### IN query
```typescript
const snapshot = await db.collection('users')
  .where('role', 'in', ['teacher', 'admin', 'moderator'])
  .get();
```

### Array contains
```typescript
const snapshot = await db.collection('users')
  .where('subjects', 'array-contains', 'Mathematics')
  .get();
```

### Comparison operators
```typescript
// Greater than
await db.collection('quizzes')
  .where('createdAt', '>', timestamp)
  .get();

// Less than or equal
await db.collection('marks')
  .where('score', '<=', 80)
  .get();
```

### Ordering
```typescript
const snapshot = await db.collection('users')
  .orderBy('createdAt', 'desc')
  .orderBy('name', 'asc')
  .limit(10)
  .get();
```

### Pagination
```typescript
const first = await db.collection('users')
  .orderBy('createdAt')
  .limit(10)
  .get();

const lastVisible = first.docs[first.docs.length - 1];

const next = await db.collection('users')
  .orderBy('createdAt')
  .startAfter(lastVisible)
  .limit(10)
  .get();
```

---

## Batch Operations

### Batch write
```typescript
const batch = db.batch();

batch.set(db.collection('users').doc('user1'), { name: 'User 1' });
batch.update(db.collection('users').doc('user2'), { status: 'active' });
batch.delete(db.collection('users').doc('user3'));

await batch.commit();
```

### Transaction
```typescript
await db.runTransaction(async (transaction) => {
  const doc = await transaction.get(
    db.collection('users').doc('userId')
  );
  
  const currentCount = doc.data()?.count || 0;
  
  transaction.update(
    db.collection('users').doc('userId'),
    { count: currentCount + 1 }
  );
});
```

---

## Error Handling

```typescript
import { db } from '@/lib/firebaseAdmin';

try {
  const snapshot = await db.collection('users').get();
} catch (error: any) {
  if (error.code === 'permission-denied') {
    console.error('Permission denied - check security rules');
  } else if (error.code === 'not-found') {
    console.error('Collection/document not found');
  } else if (error.code === 'resource-exhausted') {
    console.error('Too many requests - rate limited');
  } else {
    console.error('Error:', error.message);
  }
}
```

---

## Performance Tips

1. **Use queries instead of fetching all:**
   ```typescript
   // Bad: Fetch all and filter
   const all = await db.collection('users').get();
   const teachers = all.docs.filter(d => d.data().role === 'teacher');
   
   // Good: Query at database level
   const teachers = await db.collection('users')
     .where('role', '==', 'teacher')
     .get();
   ```

2. **Index your queries:**
   - Firebase automatically creates indexes for simple queries
   - Use composite indexes for complex WHERE + ORDER BY queries

3. **Paginate large result sets:**
   ```typescript
   const snapshot = await db.collection('users')
     .limit(50)  // Don't fetch all
     .get();
   ```

4. **Use batch operations for multiple writes:**
   ```typescript
   const batch = db.batch();
   // Add multiple operations
   await batch.commit(); // Single transaction
   ```

5. **Select fields you need:**
   ```typescript
   const snapshot = await db.collection('users')
     .select('name', 'email')  // Don't fetch all fields
     .get();
   ```

---

**Last Updated:** December 28, 2025
