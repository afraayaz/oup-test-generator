'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  userRole?: string;
}

export function ProtectedRoute({ children, allowedRoles, userRole }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log('🔐 ProtectedRoute - Auth state changed:', !!authUser);
      
      if (!authUser) {
        console.log('🔐 ProtectedRoute - No user, redirecting to login');
        setIsAuthorized(false);
        setIsLoading(false);
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 100);
      } else {
        // User is logged in, check role if needed
        if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
          console.log('🔐 ProtectedRoute - User role not allowed:', userRole);
          setIsAuthorized(false);
          setIsLoading(false);
          setTimeout(() => {
            router.push('/login');
          }, 100);
        } else {
          console.log('🔐 ProtectedRoute - User authorized');
          setIsAuthorized(true);
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [router, allowedRoles, userRole]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not authorized, don't render children
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
