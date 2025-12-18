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
}

export function useUserProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        console.log('🔥 Fetching user data from Firestore...');
        // Fetch fresh user data from Firestore
        const usersResponse = await fetch(
          `https://firestore.googleapis.com/v1/projects/quiz-app-ff0ab/databases/(default)/documents/users`
        );

        console.log('🔥 Firestore response status:', usersResponse.status);
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log('🔥 Firestore users data:', usersData);
          console.log('🔥 Number of user documents:', usersData.documents?.length || 0);
          
          if (usersData.documents) {
            console.log('🔥 All user emails in Firestore:', 
              usersData.documents.map((doc: any) => doc.fields?.email?.stringValue)
            );
          }
          
          const userDoc = (usersData.documents || []).find((doc: any) =>
            doc.fields?.email?.stringValue === authUser.email
          );
          
          console.log('🔥 Found matching user doc:', !!userDoc);
          console.log('🔥 Matching user doc data:', userDoc);

          if (userDoc) {
            // Debug logging
            console.log('useUserProfile - userDoc:', userDoc);
            console.log('useUserProfile - all fields:', userDoc.fields);
            
            // Parse subjects array if it exists
            let subjects: string[] = [];
            if (userDoc.fields?.subjects?.arrayValue?.values) {
              subjects = userDoc.fields.subjects.arrayValue.values.map((value: any) => 
                value.stringValue || ''
              ).filter(Boolean);
              console.log('useUserProfile - parsed subjects:', subjects);
            }

            // Parse assignedGrades array if it exists  
            let assignedGrades: string[] = [];
            if (userDoc.fields?.assignedGrades?.arrayValue?.values) {
              assignedGrades = userDoc.fields.assignedGrades.arrayValue.values.map((value: any) => 
                value.stringValue || ''
              ).filter(Boolean);
              console.log('useUserProfile - parsed assignedGrades:', assignedGrades);
            }
            
            // Parse assignedBooks array if it exists
            let assignedBooks: { id: string; title: string; subject: string; grade: string; chapters: number }[] = [];
            console.log('🔥 Checking assignedBooks field...');
            console.log('🔥 userDoc.fields:', userDoc.fields);
            console.log('🔥 userDoc.fields?.assignedBooks:', userDoc.fields?.assignedBooks);
            
            if (userDoc.fields?.assignedBooks?.arrayValue?.values) {
              console.log('🔥 useUserProfile - parsing assignedBooks:', userDoc.fields.assignedBooks.arrayValue.values);
              assignedBooks = userDoc.fields.assignedBooks.arrayValue.values.map((bookValue: any) => {
                console.log('🔥 Processing book value:', bookValue);
                const book = {
                  id: bookValue.mapValue?.fields?.id?.stringValue || '',
                  title: bookValue.mapValue?.fields?.title?.stringValue || '',
                  subject: bookValue.mapValue?.fields?.subject?.stringValue || '',
                  grade: bookValue.mapValue?.fields?.grade?.stringValue || '',
                  chapters: parseInt(bookValue.mapValue?.fields?.chapters?.integerValue || '0')
                };
                console.log('🔥 Parsed book:', book);
                return book;
              }).filter((book: any) => book.id); // Filter out books without valid IDs
              console.log('🔥 useUserProfile - final parsed assignedBooks:', assignedBooks);
            } else {
              console.log('🔥 No assignedBooks found in userDoc.fields');
              console.log('🔥 assignedBooks path check:', {
                hasField: !!userDoc.fields?.assignedBooks,
                hasArrayValue: !!userDoc.fields?.assignedBooks?.arrayValue,
                hasValues: !!userDoc.fields?.assignedBooks?.arrayValue?.values
              });
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
              assignedBooks: assignedBooks, // Always provide the array, even if empty
            };
            
            console.log('🔥 Final user profile object:', userProfile);
            console.log('🔥 User profile subjects:', userProfile.subjects);
            console.log('🔥 User profile assignedGrades:', userProfile.assignedGrades);
            console.log('🔥 User profile assignedBooks:', userProfile.assignedBooks);
            console.log('🔥 Setting user in state...');
            setUser(userProfile);
            // Save to this tab's session storage
            saveTabSession(userProfile);
            console.log('🔥 User profile set successfully');
          } else {
            console.log('🔥 No matching user document found for email:', authUser.email);
            console.log('🔥 This means the user account was not created in Firestore');
            setUser(null);
            setError('User account not found in database');
          }
        } else {
          console.log('🔥 Failed to fetch Firestore data:', usersResponse.status);
          setError('Failed to fetch user data from database');
        }
      } catch (err) {
        console.error('🔥 Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        console.log('🔥 Setting loading to false');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { user, loading, error };
}
