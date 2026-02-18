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

export function useUserProfile(): { user: UserProfile | null; loading: boolean; error: string | null } {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Function to fetch and update user profile from Firestore
  const refreshUserProfile = async (authUser: any, forceRefresh = false) => {
    try {
      // Check cache first - only refresh if > 5 minutes old or forced
      const now = Date.now();
      if (!forceRefresh && (now - lastFetchTime) < CACHE_DURATION && user) {
        return true;
      }
      
      
      // Query by email field instead of fetching all users - this is MUCH more efficient
      const usersResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/quiz-app-ff0ab/databases/(default)/documents:runQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'users' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'email' },
                  op: 'EQUAL',
                  value: { stringValue: authUser.email }
                }
              },
              limit: 1
            }
          })
        }
      );
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const userDoc = usersData[0]?.document;

        if (userDoc) {
          
          // Parse subjects array
          let subjects: string[] = [];
          if (userDoc.fields?.subjects?.arrayValue?.values) {
            subjects = userDoc.fields.subjects.arrayValue.values.map((value: any) => 
              value.stringValue || ''
            ).filter(Boolean);
          }

          // Parse assignedGrades array
          let assignedGrades: string[] = [];
          if (userDoc.fields?.assignedGrades?.arrayValue?.values) {
            assignedGrades = userDoc.fields.assignedGrades.arrayValue.values.map((value: any) => 
              value.stringValue || ''
            ).filter(Boolean);
          }
          
          // Parse assignedBooks array
          let assignedBooks: { id: string; title: string; subject: string; grade: string; chapters: number }[] = [];
          if (userDoc.fields?.assignedBooks?.arrayValue?.values) {
            assignedBooks = userDoc.fields.assignedBooks.arrayValue.values.map((bookValue: any) => {
              const book = {
                id: bookValue.mapValue?.fields?.id?.stringValue || '',
                title: bookValue.mapValue?.fields?.title?.stringValue || '',
                subject: bookValue.mapValue?.fields?.subject?.stringValue || '',
                grade: bookValue.mapValue?.fields?.grade?.stringValue || '',
                chapters: parseInt(bookValue.mapValue?.fields?.chapters?.integerValue || '0')
              };
              return book;
            }).filter((book: any) => book.id);
          }

          // Parse subjectGradePairs array - TRY TO PARSE FROM DATABASE FIRST
          let subjectGradePairs: { id: string; subject: string; grade: string; assignedBooks: { id: string; title: string; subject: string; grade: string; chapters: number }[] }[] = [];
          
          
          if (userDoc.fields?.subjectGradePairs?.arrayValue?.values && userDoc.fields.subjectGradePairs.arrayValue.values.length > 0) {
            try {
              subjectGradePairs = userDoc.fields.subjectGradePairs.arrayValue.values.map((pairValue: any, idx: number) => {
                
                // Parse books in this pair
                const pairBooks = (pairValue.mapValue?.fields?.assignedBooks?.arrayValue?.values || []).map((bookValue: any) => {
                  return {
                    id: bookValue.mapValue?.fields?.id?.stringValue || '',
                    title: bookValue.mapValue?.fields?.title?.stringValue || '',
                    subject: bookValue.mapValue?.fields?.subject?.stringValue || '',
                    grade: bookValue.mapValue?.fields?.grade?.stringValue || '',
                    chapters: parseInt(bookValue.mapValue?.fields?.chapters?.integerValue || '0')
                  };
                }).filter((book: any) => book.id && book.title);
                
                const pair = {
                  id: pairValue.mapValue?.fields?.id?.stringValue || `pair-${idx}`,
                  subject: pairValue.mapValue?.fields?.subject?.stringValue || '',
                  grade: pairValue.mapValue?.fields?.grade?.stringValue || '',
                  assignedBooks: pairBooks
                };
                
                return pair;
              });
            } catch (err) {
            }
          }
          
          // Fallback: If we couldn't parse from database, rebuild from subjects/grades/books
          if (subjectGradePairs.length === 0) {
            
            if (subjects.length > 0 && assignedGrades.length > 0) {
              // Create one pair per subject-grade combination
              subjectGradePairs = subjects.map((subject, idx) => {
                const grade = assignedGrades[idx] || assignedGrades[0];
                const normalizedGrade = grade.startsWith('Grade') ? grade : `Grade ${grade}`;
                
                // Find all books that match this grade
                const booksForThisGrade = assignedBooks.filter(book => {
                  const bookGrade = book.grade.replace('Grade ', '').trim();
                  const gradeNum = grade.replace('Grade ', '').trim();
                  return bookGrade === gradeNum;
                });
                
                
                return {
                  id: `${subject.toLowerCase()}-${grade.replace('Grade ', '').trim()}-${Date.now()}`,
                  subject: subject,
                  grade: normalizedGrade,
                  assignedBooks: booksForThisGrade.map(book => ({
                    ...book,
                    subject: subject // Ensure subject is always set
                  }))
                };
              });
            } else {
            }
          }

          const userProfile: UserProfile = {
            name: userDoc.fields?.name?.stringValue || 'User',
            email: userDoc.fields?.email?.stringValue || authUser.email || '',
            role: userDoc.fields?.role?.stringValue || 'User',
            schoolId: userDoc.fields?.schoolId?.stringValue || '',
            schoolName: userDoc.fields?.schoolName?.stringValue || '',
            uid: authUser.uid,
            class: userDoc.fields?.class?.stringValue || userDoc.fields?.grade?.stringValue || '',
            grade: userDoc.fields?.grade?.stringValue || userDoc.fields?.class?.stringValue || '',
            subjects: subjects.length > 0 ? subjects : undefined,
            assignedGrades: assignedGrades.length > 0 ? assignedGrades : undefined,
            assignedBooks: assignedBooks,
            subjectGradePairs: subjectGradePairs && subjectGradePairs.length > 0 ? subjectGradePairs : [],
          };
          
          setUser(userProfile);
          saveTabSession(userProfile);
          setLastFetchTime(Date.now());
          return true;
        }
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
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

    // Handle visibility change - refresh when tab becomes visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        await refreshUserProfile(auth.currentUser);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      
      try {
        if (!authUser) {
          setUser(null);
          clearTabSession();
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { user, loading, error };
}
