'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase';

/**
 * Hook to protect routes - ensures user is authenticated before allowing access
 * If user is not authenticated or session is cleared, redirects to login
 */
export function useAuthGuard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log('🔐 Auth Guard - User state:', !!authUser ? `${authUser.email}` : 'null');
      
      if (!authUser) {
        console.log('🔐 Auth Guard - No authenticated user, clearing and redirecting to login');
        setIsAuthenticated(false);
        setIsLoading(false);
        
        // Clear any stored session data
        sessionStorage.clear();
        localStorage.removeItem('multitab_sessions');
        
        // Redirect to login after a short delay to allow cleanup
        const redirectTimer = setTimeout(() => {
          router.push('/login');
        }, 100);
        
        return () => clearTimeout(redirectTimer);
      } else {
        console.log('🔐 Auth Guard - User authenticated');
        setIsAuthenticated(true);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return { isAuthenticated, isLoading };
}

/**
 * Component to protect routes
 */
export function AuthGuardWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthGuard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

  return <>{children}</>;
}
