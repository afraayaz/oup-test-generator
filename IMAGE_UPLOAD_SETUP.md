# Quick Setup Guide - Image Upload Feature

## Prerequisites
- Firebase project already configured
- Firebase Storage enabled in Firebase Console

## Setup Steps

### 1. Deploy Storage Security Rules
```bash
firebase deploy --only storage
```

Alternatively, manually update rules in Firebase Console:
1. Go to Firebase Console → Storage → Rules
2. Copy contents from `storage.rules` file
3. Publish the rules

### 2. Verify Firebase Storage Configuration
1. Open Firebase Console
2. Navigate to Storage section
3. Ensure Storage is enabled
4. Verify bucket name matches: `quiz-app-ff0ab.firebasestorage.app`

### 3. Test the Feature

#### As a Content Creator:
1. Log in as a content creator user
2. Navigate to: Content Creator → Create Question → Individual
3. Fill in question details
4. In Step 2, look for "Attach Image (Optional)" section
5. Upload a test image (JPEG/PNG under 5MB)
6. Preview should appear immediately
7. Complete and submit the question
8. Check Question Bank to see the image displayed

#### Verify in Firebase Console:
1. Go to Firebase Console → Storage
2. Navigate to `question-images/{userId}/`
3. Verify uploaded image appears
4. Go to Firestore → questions collection
5. Find the created question
6. Verify `imageUrl` field contains the Firebase Storage URL

### 4. Common Issues & Solutions

#### Issue: "Failed to upload image"
- **Solution**: Check Firebase Storage is enabled in console
- **Solution**: Verify storage rules are deployed correctly
- **Solution**: Check user authentication status

#### Issue: Image not displaying
- **Solution**: Verify imageUrl is saved in Firestore
- **Solution**: Check browser console for CORS errors
- **Solution**: Verify Firebase Storage CORS configuration

#### Issue: "Invalid file" error
- **Solution**: Ensure file is an image (JPEG, PNG, GIF, WebP)
- **Solution**: Check file size is under 5MB
- **Solution**: Try a different image file

### 5. Development Testing

Run the app locally:
```bash
npm run dev
```

Access at: `http://localhost:3000`

### 6. Monitoring

After deployment, monitor:
- Storage usage in Firebase Console
- Upload success/failure rates
- Storage costs

### 7. Next Steps

Once verified working:
- Test with various image formats
- Test with edge cases (very large/small images)
- Gather user feedback
- Consider implementing enhancements (see IMAGE_UPLOAD_FEATURE.md)
