'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function AdminSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Admin');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setMessage('Account authenticated. Set your role below.');
      } else {
        setMessage('Not logged in. Please login first at /login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateUserRecord = async () => {
    if (!user) {
      setMessage('No user logged in');
      return;
    }

    try {
      setLoading(true);
      setMessage('Creating user record...');

      // Get the user's ID token for authentication
      const idToken = await user.getIdToken();

      // Call the backend API with the ID token
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          role: selectedRole,
          displayName: user.displayName || selectedRole + ' User',
          idToken: idToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user record');
      }

      setSuccess(true);
      setMessage(`✓ ${selectedRole} user record created successfully!`);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        if (selectedRole === 'Admin') {
          router.push('/admin/dashboard');
        } else if (selectedRole === 'Teacher') {
          router.push('/teacher/dashboard');
        } else if (selectedRole === 'Student') {
          router.push('/student/dashboard');
        } else if (selectedRole === 'School Admin') {
          router.push('/school-admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      }, 1500);
    } catch (error: any) {
      setSuccess(false);
      setMessage('Error: ' + (error.message || 'Failed to create user record'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002147] to-[#003d7a] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-[#002147] mb-2">User Setup</h1>
        <p className="text-gray-600 text-sm mb-6">Configure your user role in the system</p>
        
        {loading && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002147] mx-auto mb-3"></div>
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        )}

        {!loading && (
          <>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {user ? (
                <>
                  <p className="text-xs text-gray-600 mb-1">Logged in as:</p>
                  <p className="font-semibold text-gray-900 break-all text-sm">{user.email}</p>
                </>
              ) : (
                <p className="text-red-600 text-sm">Not authenticated</p>
              )}
            </div>

            {!success && user && (
              <>
                <div className="mb-6">
                  <label htmlFor="role" className="block text-sm font-medium text-[#002147] mb-2">
                    Select Your Role
                  </label>
                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002147] focus:outline-none text-sm"
                  >
                    <option value="Admin">Admin (OUP)</option>
                    <option value="School Admin">School Admin</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Student">Student</option>
                    <option value="Moderator">Moderator</option>
                    <option value="Content Creator">Content Creator</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateUserRecord}
                  disabled={loading || !user}
                  className="w-full bg-[#002147] hover:bg-[#1e3a8a] text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 text-sm"
                >
                  {loading ? 'Creating...' : 'Create User Record'}
                </button>
              </>
            )}

            {success && (
              <div className="text-center">
                <div className="mb-4 text-5xl">✓</div>
                <p className="text-green-600 font-semibold mb-2">Success!</p>
                <p className="text-gray-600 text-sm">Redirecting to dashboard...</p>
              </div>
            )}

            <div className={`mt-6 p-4 rounded-lg ${success ? 'bg-green-50' : 'bg-blue-50'}`}>
              <p className={`text-xs ${success ? 'text-green-700' : 'text-blue-700'}`}>
                {message}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
