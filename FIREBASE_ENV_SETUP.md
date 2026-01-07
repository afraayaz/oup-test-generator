# 🔐 Firebase Admin SDK - Complete Setup Guide

## Quick Setup (3 Steps)

### Step 1: Get Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select **quiz-app-ff0ab** project
3. Click Settings ⚙️ (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. A JSON file will download (e.g., `quiz-app-ff0ab-xxxxx.json`)

### Step 2: Run the Setup Script

**Option A: Automatic (Recommended)**
```bash
# Copy your service account JSON file to the project folder, then:
node setup-firebase-env.js ./quiz-app-ff0ab-xxxxx.json

# This will automatically create/update .env.local with proper formatting
```

**Option B: Manual Setup**

1. Open the downloaded JSON file
2. Copy the entire content of the `"private_key"` field (including newlines)
3. Edit `.env.local` and update:
   ```bash
   FIREBASE_PROJECT_ID=quiz-app-ff0ab
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@quiz-app-ff0ab.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   YOUR_KEY_CONTENT_HERE
   -----END PRIVATE KEY-----"
   ```

### Step 3: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then start it again
npm run dev

# You should see: ✅ Firebase Admin SDK initialized
```

---

## 🔍 Troubleshooting

### Error: "error:1E08010C:DECODER routines::unsupported"

**Cause:** Private key format is incorrect

**Fix:**
```bash
# Use the automatic setup script:
node setup-firebase-env.js ./your-service-account.json

# This ensures proper formatting
```

### Error: "Firebase Admin SDK not initialized"

**Check:**
1. `.env.local` file exists in project root
2. All three variables are set:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. Private key includes `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### Test It Works

```bash
# In a new terminal:
curl http://localhost:3000/api/admin/subjects

# Should return: { "subjects": [...] }
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `npm run dev` starts without errors
- [ ] Console shows: `✅ Firebase Admin SDK initialized`
- [ ] `curl http://localhost:3000/api/admin/users` returns data
- [ ] `curl http://localhost:3000/api/admin/subjects` returns data
- [ ] No 500 errors in console

---

## 🔒 Security Notes

### DO
✅ Keep `.env.local` secure and private
✅ Add `.env.local` to `.gitignore`
✅ Use different service accounts for dev/staging/prod
✅ Rotate service account keys periodically
✅ Monitor Firebase console for unusual activity

### DON'T
❌ Commit `.env.local` to git
❌ Share service account keys
❌ Log credentials in console
❌ Use in client-side code
❌ Hardcode credentials in source files

---

## 📝 Manual .env.local Example

If you want to set it up manually, here's the correct format:

```bash
# .env.local
FIREBASE_PROJECT_ID=quiz-app-ff0ab
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abcde@quiz-app-ff0ab.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+zN5Q/...
...
VERY_LONG_KEY_CONTENT_HERE
...
jK0qX0zKXyX0yK1zL1mM2nN3oO4pP5qQ6rR7sS8tT9uU0vV1wW2xX3yY4zZ
-----END PRIVATE KEY-----"
```

**Key points:**
- The `private_key` field already contains `\n` characters
- Just paste the entire value as-is (with quotes)
- Include the BEGIN and END lines

---

## 🚀 Test Your Setup

Once configured, test with:

```bash
# Test 1: Check if SDK initialized
npm run dev
# Look for: ✅ Firebase Admin SDK initialized

# Test 2: Test GET endpoint
curl http://localhost:3000/api/admin/users
# Should return: { "users": [] } or with data

# Test 3: Test POST endpoint
curl -X POST http://localhost:3000/api/admin/subjects \
  -H "Content-Type: application/json" \
  -d '{"name":"Mathematics"}'
# Should return: { "subject": { "id": "...", "name": "Mathematics" } }
```

---

## 📚 Additional Resources

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Service Account Setup](https://firebase.google.com/docs/admin/setup#initialize_the_sdk)
- [Firestore Admin Guide](https://firebase.google.com/docs/firestore/quickstart#admin)

---

## ❓ Still Having Issues?

1. **Verify file permissions** - ensure `.env.local` is readable
2. **Check Node version** - requires Node 14+: `node --version`
3. **Clear node_modules** - sometimes helps with caching:
   ```bash
   rm -r node_modules package-lock.json
   npm install
   npm run dev
   ```
4. **Check Firebase Console** - ensure project exists and is accessible
5. **Verify credentials** - ensure the service account has Firestore permissions

---

**Setup completed! Your Firebase Admin SDK is now ready to use.** ✨
