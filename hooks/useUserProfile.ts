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
  subjects?: string[];
  assignedGrades?: string[];
  assignedBooks?: { id: string; title: string; subject: string; grade: string; chapters: number }[];
  subjectGradePairs?: { id: string; subject: string; grade: string; assignedBooks: { id: string; title: string; subject: string; grade: string; chapters: number }[] }[];
}

export function useUserProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch and update user profile from Firestore
  const refreshUserProfile = async (authUser: any) => {
    try {
      console.log('🔄 Refreshing user profile for:', authUser.email);
      
      const usersResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/quiz-app-ff0ab/databases/(default)/documents/users`
      );
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        
        const userDoc = (usersData.documents || []).find((doc: any) =>
          doc.fields?.email?.stringValue === authUser.email
        );

        if (userDoc) {
          console.log('✅ Updated user doc found, parsing...');
          
          // Parse subjects array
          let subjects: string[] = [];
          if (userDoc.fields?.subjects?.arrayValue?.values) {
            subjects = userDoc.fields.subjects.arrayValue.values.map((value: any) => 
              value.stringValue || ''
            ).filter(Boolean);
            console.log('✅ Updated subjects:', subjects);
          }

          // Parse assignedGrades array
          let assignedGrades: string[] = [];
          if (userDoc.fields?.assignedGrades?.arrayValue?.values) {
            assignedGrades = userDoc.fields.assignedGrades.arrayValue.values.map((value: any) => 
              value.stringValue || ''
            ).filter(Boolean);
            console.log('✅ Updated assignedGrades:', assignedGrades);
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
            console.log('✅ Updated assignedBooks:', assignedBooks);
          }

          // Parse subjectGradePairs array - TRY TO PARSE FROM DATABASE FIRST
          let subjectGradePairs: { id: string; subject: string; grade: string; assignedBooks: { id: string; title: string; subject: string; grade: string; chapters: number }[] }[] = [];
          
          console.log('🔍 Checking if subjectGradePairs exists in database...');
          console.log('  userDoc.fields?.subjectGradePairs:', userDoc.fields?.subjectGradePairs);
          
          if (userDoc.fields?.subjectGradePairs?.arrayValue?.values && userDoc.fields.subjectGradePairs.arrayValue.values.length > 0) {
            console.log('✅ Found subjectGradePairs in database! Parsing...');
            try {
              subjectGradePairs = userDoc.fields.subjectGradePairs.arrayValue.values.map((pairValue: any, idx: number) => {
                console.log(`  Parsing pair ${idx}:`, pairValue);
                
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
                
                console.log(`    ✅ Parsed pair: subject="${pair.subject}", grade="${pair.grade}", books=${pair.assignedBooks.length}`);
                return pair;
              });
              console.log('✅ Successfully parsed subjectGradePairs from database:', subjectGradePairs);
            } catch (err) {
              console.error('❌ Error parsing subjectGradePairs:', err);
            }
          }
          
          // Fallback: If we couldn't parse from database, rebuild from subjects/grades/books
          if (subjectGradePairs.length === 0) {
            console.log('🔧 No valid subjectGradePairs from database. Rebuilding from subjects/grades/books...');
            console.log('  subjects:', subjects);
            console.log('  assignedGrades:', assignedGrades);
            console.log('  assignedBooks:', assignedBooks);
            
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
                
                console.log(`  Pair ${idx}: subject="${subject}", grade="${normalizedGrade}", books=${booksForThisGrade.length}`);
                
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
              console.log('✅ Rebuilt subjectGradePairs:', subjectGradePairs);
            } else {
              console.log('⚠️ Not enough data to build subjectGradePairs. subjects:', subjects.length, 'grades:', assignedGrades.length);
            }
          }

          const userProfile: UserProfile = {
            name: userDoc.fields?.name?.stringValue || 'User',
            email: userDoc.fields?.email?.stringValue || authUser.email || '',
            role: userDoc.fields?.role?.stringValue || 'User',
            schoolId: userDoc.fields?.schoolId?.stringValue || '',
            schoolName: userDoc.fields?.schoolName?.stringValue || '',
            uid: authUser.uid,
            subjects: subjects.length > 0 ? subjects : undefined,
            assignedGrades: assignedGrades.length > 0 ? assignedGrades : undefined,
            assignedBooks: assignedBooks,
            subjectGradePairs: subjectGradePairs && subjectGradePairs.length > 0 ? subjectGradePairs : [],
          };
          
          console.log('🎓 Creating userProfile with:', {
            name: userProfile.name,
            email: userProfile.email,
            role: userProfile.role,
            subjectGradePairsLength: subjectGradePairs.length,
            subjectGradePairs: subjectGradePairs,
            assignedBooksLength: assignedBooks.length,
            subjects: subjects,
            assignedGrades: assignedGrades
          });
          console.log('✅ Updated user profile:', userProfile);
          console.log('🔥 About to call setUser with:', userProfile);
          setUser(userProfile);
          saveTabSession(userProfile);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('❌ Error refreshing user profile:', err);
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
          console.error('Error processing storage change:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Handle visibility change - refresh when tab becomes visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        console.log('👁️ Page became visible - refreshing user profile...');
        await refreshUserProfile(auth.currentUser);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log('🔥 Firebase Auth State Changed:', authUser);
      console.log('🔥 Auth User Email:', authUser?.email);
      console.log('🔥 Auth User UID:', authUser?.uid);
      console.log('🔥 Auth User exists:', !!authUser);
      
      try {
        if (!authUser) {
          console.log('🔥 No auth user, clearing session');
          setUser(null);
          clearTabSession();
          setLoading(false);
          return;
        }

        // Initial fetch
        const success = await refreshUserProfile(authUser);
        
        if (!success) {
          console.log('🔥 No matching user document found for email:', authUser.email);
          setUser(null);
          setError('User account not found in database');
        }
      } catch (err) {
        console.error('🔥 Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        console.log('🔥 Setting loading to false');
        setLoading(false);
      }
    });

    // Set up periodic refresh every 30 seconds when user is active
    const refreshInterval = setInterval(async () => {
      if (auth.currentUser && document.visibilityState === 'visible') {
        console.log('⏱️ Periodic refresh - checking for updates...');
        await refreshUserProfile(auth.currentUser);
      }
    }, 30000); // Refresh every 30 seconds

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, []);

  return { user, loading, error };
}
