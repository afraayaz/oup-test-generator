'use client';

import Sidebar from '@/components/Sidebar';
import { useState } from 'react';

interface Notification {
  id: number;
  message: string;
  date: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, message: 'New quiz available for Grade 7 Math!', date: '2025-08-12', read: false },
    { id: 2, message: 'Your Science quiz results are in!', date: '2025-08-11', read: true },
    { id: 3, message: 'Reminder: Complete your English quiz by Friday.', date: '2025-08-10', read: false },
  ]);

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userRole="Student" currentPage="notifications" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600">Stay updated with the latest quiz alerts and results.</p>
          </div>
        </div>

        <ul className="space-y-4">
          {notifications.map((note) => (
            <li
              key={note.id}
              className={`p-4 rounded-lg border ${
                note.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-800">{note.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{note.date}</p>
                </div>
                {!note.read && (
                  <button
                    onClick={() => markAsRead(note.id)}
                    className="min-w-[44px] min-h-[44px] text-xs text-blue-600 hover:underline px-3"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </li>
          ))}
          {notifications.length === 0 && (
            <li className="text-gray-500 text-sm">No notifications at the moment.</li>
          )}
        </ul>
      </main>
    </div>
  );
}
