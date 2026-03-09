'use client';

import { useEffect, useMemo, useState } from 'react';
import UsersClient, { type UserData } from './UsersClient';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function UsersPage() {
  const { user, loading: profileLoading } = useUserProfile();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.schoolId) {
        setUsers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/admin/users?schoolId=${encodeURIComponent(user.schoolId)}`, {
          headers: {
            'x-user-role': (user.role || 'school_admin').toLowerCase().replace(/\s+/g, '_'),
            'x-school-id': user.schoolId,
          },
          cache: 'no-store',
        });
        if (!response.ok) {
          setUsers([]);
          return;
        }
        const payload = await response.json();
        setUsers(Array.isArray(payload?.users) ? payload.users : []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.schoolId]);

  const students = useMemo(() => users.filter((u: any) => u.role === 'student'), [users]);
  const teachers = useMemo(() => users.filter((u: any) => u.role === 'teacher'), [users]);
  const contentManagers = useMemo(
    () =>
      users.filter(
        (u: any) =>
          u.role === 'content_manager' ||
          u.role === 'content-manager' ||
          u.role === 'contentManager'
      ),
    [users]
  );

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <i className="ri-loader-4-line text-3xl text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <UsersClient
      students={students}
      teachers={teachers}
      contentManagers={contentManagers}
      schoolId={user?.schoolId}
      availableSchools={user?.schoolId ? [user.schoolId] : []}
      isSchoolAdmin={true}
    />
  );
}
