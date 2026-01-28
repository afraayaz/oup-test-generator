# Image Upload Feature for Questions

## Overview
This feature allows content creators to attach images to questions when creating them individually. Images are uploaded to Firebase Storage and their URLs are stored with the question data in Firestore.

## Implementation Details

### 1. Firebase Storage Setup
- **Location**: `firebase/firebase.ts`
- Firebase Storage is initialized and exported for use throughout the application
- Storage bucket: `quiz-app-ff0ab.firebasestorage.app`

### 2. Image Upload Utility
- **Location**: `lib/uploadImage.ts`
- **Functions**:
  - `uploadQuestionImage(file: File, userId: string)`: Uploads image to Firebase Storage and returns download URL
  - `validateImageFile(file: File)`: Validates image file type and size
- **Storage Path**: `question-images/{userId}/{timestamp}_{filename}`
- **Constraints**:
  - Maximum file size: 5MB
  - Allowed formats: JPEG, JPG, PNG, GIF, WebP

### 3. Question Form Updates
- **Location**: `components/QuestionForm.tsx`
- Added `imageUrl` field to `QuestionFormData` interface
- Added `userId` prop to component for image uploads
- New state variables:
  - `imageFile`: Stores selected file
  - `imagePreview`: Displays preview before upload
  - `imageUploading`: Shows upload status
  - `imageError`: Displays validation errors
- Image upload UI with drag-and-drop interface
- Preview and remove functionality

### 4. API Updates
- **Location**: `app/api/oup-creator/questions/route.ts`
- API endpoint now accepts and stores `imageUrl` field
- Works for both approval queue (content creators) and direct submission (OUP creators/admins)

### 5. Type Definitions
- **Location**: `types/questionBank.ts`
- Added `imageUrl?: string` to `BaseQuestion` interface
- **Location**: `components/QuestionBank.tsx`
- Added `imageUrl?: string` to `Question` interface

### 6. Question Display
- **Location**: `components/QuestionBank.tsx`
- Question cards now display attached images
- Edit modal shows attached images (read-only for now)
- Images are displayed with responsive sizing and proper styling

### 7. Storage Security Rules
- **Location**: `storage.rules`
- Users can only upload to their own folder
- Only authenticated users can read images
- File size limited to 5MB
- Only image file types allowed

## Usage

### For Content Creators:
1. Navigate to "Create Question" → "Individual"
2. Fill in question metadata (Step 1)
3. Enter question text (Step 2)
4. Click "Attach Image (Optional)" section
5. Upload an image by:
   - Clicking the upload area and selecting a file, OR
   - Dragging and dropping an image
6. Preview the image and remove if needed
7. Complete the rest of the form
8. Submit the question

### Image Upload Process:
1. User selects an image file
2. File is validated (type and size)
3. Preview is generated immediately
4. When user submits the form:
   - Image is uploaded to Firebase Storage
   - Download URL is obtained
   - Question data (including imageUrl) is saved to Firestore

### Question Rendering:
- Questions with images show a preview in the question bank
- Images are displayed with proper sizing and styling
- Images are also visible in the edit modal

## Files Modified

1. `firebase/firebase.ts` - Added Firebase Storage initialization
2. `lib/uploadImage.ts` - Created image upload utility
3. `components/QuestionForm.tsx` - Added image upload UI and logic
4. `app/content-creator/create/individual/page.tsx` - Pass userId to QuestionForm
5. `app/api/oup-creator/questions/route.ts` - Handle imageUrl in API
6. `types/questionBank.ts` - Added imageUrl to BaseQuestion type
7. `components/QuestionBank.tsx` - Display images in question cards and edit modal
8. `storage.rules` - Firebase Storage security rules

## Future Enhancements

### Possible improvements:
1. **Multiple Images**: Allow multiple images per question
2. **Image Editing**: Enable cropping, resizing, rotation in-browser
3. **Image in Options**: Allow images in MCQ options
4. **Bulk Upload**: Support images in bulk question upload
5. **Image Library**: Reusable image library for common diagrams
6. **Edit Image**: Allow replacing/removing images when editing questions
7. **Image Annotations**: Add drawing/annotation tools for images
8. **Image Compression**: Automatic compression before upload
9. **OCR**: Extract text from images for accessibility

## Security Considerations

1. **Authentication Required**: Only authenticated users can upload
2. **User Isolation**: Users can only write to their own folder
3. **File Type Validation**: Only image types allowed
4. **Size Limits**: 5MB maximum per image
5. **Read Access**: All authenticated users can read (for viewing questions)

## Testing Checklist

- [ ] Upload valid image (JPEG, PNG, GIF, WebP)
- [ ] Try uploading file > 5MB (should fail)
- [ ] Try uploading non-image file (should fail)
- [ ] Preview image before submission
- [ ] Remove image after selection
- [ ] Submit question with image
- [ ] View question with image in question bank
- [ ] View question with image in edit modal
- [ ] Verify image URL in Firestore
- [ ] Verify image stored in Firebase Storage
- [ ] Test with different image sizes and formats
- [ ] Test without image (optional field)

## Deployment Notes

### Before deploying to production:
1. Deploy Firebase Storage security rules:
   ```bash
   firebase deploy --only storage
   ```

2. Verify Firebase Storage is enabled in Firebase Console

3. Check storage quotas and pricing

4. Test image uploads in production environment

5. Monitor storage usage and costs

## Support

For questions or issues with the image upload feature, please refer to:
- Firebase Storage documentation
- Project documentation
- Development team
