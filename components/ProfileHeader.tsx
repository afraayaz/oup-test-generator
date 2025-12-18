'use client';

import { useUserProfile } from '@/hooks/useUserProfile';

export default function ProfileHeader() {
  const { user, loading } = useUserProfile();

  if (loading || !user) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center space-x-4">
        {/* Avatar */}
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
          {(user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
        </div>
        
        {/* User Info */}
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm truncate">{user.name || 'User'}</p>
          <p className="text-blue-100 text-xs truncate capitalize">{user.role || 'User'}</p>
        </div>
      </div>
    </div>
  );
}
