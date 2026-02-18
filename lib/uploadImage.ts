/**
 * Uploads an image file to ImgBB and returns the download URL
 * @param file - The image file to upload
 * @param userId - The user ID creating the question (for tracking, not used in ImgBB)
 * @param onProgress - Optional callback to track upload progress (0-100)
 * @returns Promise resolving to the download URL of the uploaded image
 */
export async function uploadQuestionImage(
  file: File, 
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // Access the environment variable - Next.js inlines this at build time
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || '';
    
    
    if (!apiKey) {
      throw new Error('ImgBB API key is not configured. Please add NEXT_PUBLIC_IMGBB_API_KEY to your .env.local file.');
    }

    // Create form data - DO NOT include the key here
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', `question_${userId}_${Date.now()}`);

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });
      
      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.data && response.data.url) {
              resolve(response.data.url);
            } else {
              reject(new Error('Invalid response from ImgBB'));
            }
          } catch (error) {
            reject(new Error('Failed to parse ImgBB response'));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });
      
      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });
      
      // Send request - API key goes in the URL as a query parameter
      xhr.open('POST', `https://api.imgbb.com/1/upload?key=${apiKey}`);
      xhr.send(formData);
    });
  } catch (error) {
    throw new Error('Failed to upload image. Please try again.');
  }
}

/**
 * Validates if the file is a valid image
 * @param file - The file to validate
 * @returns true if valid, false otherwise
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.',
    };
  }
  
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 5MB.',
    };
  }
  
  return { valid: true };
}
