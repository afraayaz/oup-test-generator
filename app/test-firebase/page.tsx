'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function TestFirebasePage() {
  const [status, setStatus] = useState('Initializing...');
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const testQuery = async () => {
      try {
        setStatus('Getting Firestore instance...');
        console.log('Test page: Got db instance');
        setStatus('Fetching documents...');
        
        const ref = collection(db, 'questions');
        console.log('Test page: Collection ref created, fetching...');
        
        const snapshot = await getDocs(ref);
        console.log('Test page: Query completed, count:', snapshot.size);
        
        setCount(snapshot.size);
        setStatus('Query completed successfully!');
      } catch (err: any) {
        console.error('Test page error:', err);
        setStatus('Error: ' + err.message);
      }
    };
    
    testQuery();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase SDK Test</h1>
      <p className="mb-2">Status: {status}</p>
      {count !== null && <p className="text-green-600 font-bold">Documents found: {count}</p>}
    </div>
  );
}
