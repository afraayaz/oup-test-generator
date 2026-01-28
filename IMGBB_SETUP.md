# ImgBB Setup Guide

## ✅ Implementation Complete

The image upload feature now uses **ImgBB** (free image hosting) instead of Firebase Storage.

---

## 🔑 Get Your Free ImgBB API Key

### Step 1: Sign Up
1. Go to: https://imgbb.com/
2. Click **"Sign up"** (top right)
3. Create a free account (no credit card required)

### Step 2: Get API Key
1. After logging in, go to: https://api.imgbb.com/
2. Click **"Get API key"**
3. Copy your API key (looks like: `a1b2c3d4e5f6g7h8i9j0`)

### Step 3: Add to Your Project
1. Open file: `.env.local`
2. Find this line:
   ```
   NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key_here
   ```
3. Replace `your_imgbb_api_key_here` with your actual API key:
   ```
   NEXT_PUBLIC_IMGBB_API_KEY=a1b2c3d4e5f6g7h8i9j0
   ```
4. Save the file

### Step 4: Restart Your Dev Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 📊 ImgBB Free Tier Limits

- **Unlimited images** ✅
- **Unlimited bandwidth** ✅
- **Permanent hosting** ✅
- **No credit card required** ✅
- Max file size: **32MB** per image (we limit to 5MB)

---

## ✨ What Changed

### Files Modified:
1. **lib/uploadImage.ts** - Now uses ImgBB API instead of Firebase Storage
2. **firebase/firebase.ts** - Removed Firebase Storage imports
3. **.env.local** - Added ImgBB API key configuration

### Features Kept:
- ✅ Progress bar (0-100%)
- ✅ File validation (type & size)
- ✅ Image preview
- ✅ All existing UI

### No Longer Needed:
- ❌ Firebase Storage upgrade
- ❌ storage.rules file
- ❌ Firebase Storage billing

---

## 🧪 Test It

1. Get your ImgBB API key (steps above)
2. Add it to `.env.local`
3. Restart dev server
4. Go to: Content Creator → Create Question → Individual
5. Upload an image
6. Submit the question
7. Check Question Bank - image should display!

---

## ❓ Troubleshooting

### Error: "ImgBB API key is not configured"
- Make sure you added the key to `.env.local`
- Make sure you restarted the dev server
- Key must start with `NEXT_PUBLIC_`

### Image upload fails
- Verify your API key is correct (check ImgBB dashboard)
- Check file size is under 5MB
- Check file is an image (JPEG, PNG, GIF, WebP)

### Image doesn't display
- Check browser console for errors
- Verify imageUrl is saved in Firestore
- Check image URL is accessible in browser

---

## 🎉 You're Done!

No Firebase Storage upgrade needed. Your image upload feature is ready to use with ImgBB's free service!
