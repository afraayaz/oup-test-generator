/**
 * Network helper utilities for handling connectivity issues
 */

export const isNetworkConnected = async (): Promise<boolean> => {
  try {
    // Try to fetch a small resource to check connectivity
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store'
    });
    return true;
  } catch (error) {
    console.error('❌ Network connectivity check failed:', error);
    return false;
  }
};

export const checkFirebaseConnectivity = async (): Promise<boolean> => {
  try {
    // Check if we can reach Firebase
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDdsApeXM5WsHTcx4sLVJ37dAwxOjBMTu8`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'test' })
    });
    // We just need the network to respond, doesn't matter if it's an error
    console.log('✅ Firebase connectivity check passed');
    return true;
  } catch (error) {
    console.error('❌ Firebase connectivity check failed:', error);
    return false;
  }
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt + 1}/${maxRetries}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors that aren't network-related
      if (error.code && !error.code.includes('network') && error.code !== 'auth/network-request-failed') {
        throw error;
      }
      
      // Calculate exponential backoff delay
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      console.log(`⏳ Retry attempt ${attempt + 1} failed, waiting ${delayMs}ms before retry...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error('❌ All retry attempts failed');
  throw lastError;
};

export const getNetworkErrorMessage = (error: any): string => {
  if (error.code === 'auth/network-request-failed') {
    return '🌐 Network error detected. Please check your internet connection and try again.';
  }
  
  if (error.message?.includes('NETWORK') || error.message?.includes('Failed to fetch')) {
    return '🌐 Network connectivity issue. Please ensure you have a stable internet connection.';
  }
  
  if (error.message?.includes('CORS')) {
    return '🔒 Security configuration issue. Please contact support.';
  }
  
  return error.message || 'An error occurred. Please try again.';
};
