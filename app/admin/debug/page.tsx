'use client';

import { useEffect, useState } from 'react';

interface FirestoreUser {
  id: string;
  fields: any;
}

export default function FirestoreDebugPage() {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllUsers() {
      try {
        console.log('🔍 Fetching all users from Firestore...');
        const response = await fetch(
          `https://firestore.googleapis.com/v1/projects/quiz-app-ff0ab/databases/(default)/documents/users`
        );

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Raw Firestore response:', data);
          
          if (data.documents) {
            const formattedUsers = data.documents.map((doc: any) => {
              const pathParts = doc.name.split('/');
              return {
                id: pathParts[pathParts.length - 1],
                fields: doc.fields
              };
            });
            setUsers(formattedUsers);
          }
        } else {
          setError(`Failed to fetch users: ${response.status}`);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAllUsers();
  }, []);

  if (loading) return <div className="p-4">Loading users...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Firestore Users Debug</h1>
      <div className="mb-4">
        <p><strong>Total Users:</strong> {users.length}</p>
      </div>
      
      {users.map((user) => (
        <div key={user.id} className="border p-4 mb-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">User ID: {user.id}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Name:</strong> {user.fields?.name?.stringValue || 'N/A'}</p>
              <p><strong>Email:</strong> {user.fields?.email?.stringValue || 'N/A'}</p>
              <p><strong>Role:</strong> {user.fields?.role?.stringValue || 'N/A'}</p>
              <p><strong>Status:</strong> {user.fields?.status?.stringValue || 'N/A'}</p>
              <p><strong>School ID:</strong> {user.fields?.schoolId?.stringValue || 'N/A'}</p>
            </div>
            <div>
              <p><strong>Subjects:</strong> {
                user.fields?.subjects?.arrayValue?.values?.map((v: any) => v.stringValue).join(', ') || 'None'
              }</p>
              <p><strong>Assigned Grades:</strong> {
                user.fields?.assignedGrades?.arrayValue?.values?.map((v: any) => v.stringValue).join(', ') || 'None'
              }</p>
              <p><strong>Assigned Books Count:</strong> {
                user.fields?.assignedBooks?.arrayValue?.values?.length || 0
              }</p>
            </div>
          </div>
          
          {user.fields?.assignedBooks?.arrayValue?.values && (
            <div className="mt-4">
              <h3 className="font-semibold">Assigned Books:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {JSON.stringify(user.fields.assignedBooks.arrayValue.values, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="font-semibold">Raw Fields:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
              {JSON.stringify(user.fields, null, 2)}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}