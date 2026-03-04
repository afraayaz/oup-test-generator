import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebase';
import { saveTabSession, getTabSession, clearTabSession } from '@/lib/multiTabAuth';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  schoolId: string;
  schoolName: string;
  uid?: string;
  class?: string; // Student's grade/class
  grade?: string; // Alias for class
  subjects?: string[];
  assignedGrades?: string[];
  assignedBooks?: { id: string; title: string; subject: string; grade: string; chapters: number }[];
  subjectGradePairs?: { id: string; subject: string; grade: string; assignedBooks: { id: string; title: string; subject: string; grade: string; chapters: number }[] }[];
}

export function useUserProfile(options?: { disabled?: boolean }): { user: UserProfile | null; loading: boolean; error: string | null; refresh: () => Promise<void> } {
  const disabled = !!options?.disabled;
  const cachedSession = typeof window !== 'undefined' ? getTabSession() : null;
  const [user, setUser] = useState<UserProfile | null>((cachedSession?.user as UserProfile) || null);
  const [loading, setLoading] = useState<boolean>(!cachedSession?.user);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(cachedSession?.loginTime || 0);
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache (reduced from 5 for better sync)

  // Function to fetch and update user profile from Firestore
  const refreshUserProfile = async (authUser: any, forceRefresh = false) => {
    try {
      // Check cache first - only refresh if > 5 minutes old or forced
      const now = Date.now();
      if (!forceRefresh && (now - lastFetchTime) < CACHE_DURATION && user) {
        return true;
      }
      const response = await fetch('/api/auth/check-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: authUser.uid, email: authUser.email }),
      });

      if (!response.ok) return false;

      const payload = await response.json();
      const dbUser = payload?.user;
      if (!dbUser) return false;

      const subjects = Array.isArray(dbUser.subjects) ? dbUser.subjects.filter(Boolean) : [];
      const assignedGrades = Array.isArray(dbUser.assignedGrades) ? dbUser.assignedGrades.filter(Boolean) : [];
      const assignedBooks = Array.isArray(dbUser.assignedBooks) ? dbUser.assignedBooks.filter((b: any) => b?.id) : [];

      let subjectGradePairs = Array.isArray(dbUser.subjectGradePairs) ? dbUser.subjectGradePairs : [];

      if (subjectGradePairs.length === 0 && subjects.length > 0 && assignedGrades.length > 0) {
        subjectGradePairs = subjects.map((subject: string, idx: number) => {
          const grade = assignedGrades[idx] || assignedGrades[0];
          const normalizedGrade = String(grade || '').startsWith('Grade') ? grade : `Grade ${grade}`;
          const gradeNum = String(grade || '').replace('Grade ', '').trim();

          const booksForThisGrade = assignedBooks.filter((book: any) => {
            const bookGrade = String(book?.grade || '').replace('Grade ', '').trim();
            return bookGrade === gradeNum;
          });

          return {
            id: `${String(subject || '').toLowerCase()}-${gradeNum || idx}-${Date.now()}`,
            subject: String(subject || ''),
            grade: normalizedGrade,
            assignedBooks: booksForThisGrade.map((book: any) => ({
              ...book,
              subject: String(subject || ''),
            })),
          };
        });
      }

      const userProfile: UserProfile = {
        name: dbUser.name || dbUser.displayName || 'User',
        email: dbUser.email || authUser.email || '',
        role: dbUser.role || payload?.role || 'User',
        schoolId: dbUser.schoolId || '',
        schoolName: dbUser.schoolName || '',
        uid: authUser.uid,
        class: dbUser.class || dbUser.grade || '',
        grade: dbUser.grade || dbUser.class || '',
        subjects: subjects.length > 0 ? subjects : undefined,
        assignedGrades: assignedGrades.length > 0 ? assignedGrades : undefined,
        assignedBooks,
        subjectGradePairs,
      };

      setUser(userProfile);
      saveTabSession(userProfile);
      setLastFetchTime(Date.now());
      return true;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    if (disabled) {
      setLoading(false);
      return;
    }

    // Listen to localStorage changes from OTHER tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'multitab_sessions' && e.newValue) {
        try {
          const sessions = JSON.parse(e.newValue);
          const tabId = sessionStorage.getItem('tab_id');
          const currentTabSession = sessions.find((s: any) => s.tabId === tabId);
          if (currentTabSession?.user) {
            setUser(currentTabSession.user);
          }
        } catch (err) {
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Listen to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      
      try {
        if (!authUser) {
          setUser(null);
          clearTabSession();
          setLoading(false);
          return;
        }

        // Use cached session immediately when still fresh for same auth user
        const tabSession = getTabSession();
        const now = Date.now();
        const cachedUser = tabSession?.user as UserProfile | null;
        const isFreshCache = !!tabSession?.loginTime && (now - tabSession.loginTime) < CACHE_DURATION;
        const isSameUser = !!cachedUser?.email && !!authUser.email && cachedUser.email === authUser.email;
        if (isFreshCache && isSameUser) {
          setUser(cachedUser);
          setLastFetchTime(tabSession!.loginTime);
          setLoading(false);
          return;
        }

        // Initial fetch
        const success = await refreshUserProfile(authUser);
        
        if (!success) {
          setUser(null);
          setError('User account not found in database');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [disabled]);

  // Expose a manual refresh function that forces a profile update
  const refresh = async () => {
    if (disabled) return;
    const authUser = auth.currentUser;
    if (!authUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const success = await refreshUserProfile(authUser, true); // Force refresh
      if (!success) {
        setError('Failed to refresh profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, refresh };
}
