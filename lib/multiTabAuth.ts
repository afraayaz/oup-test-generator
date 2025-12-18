/**
 * Multi-Tab Authentication System
 * Allows different users to be "logged in" per tab independently
 */

export interface TabSession {
  tabId: string;
  user: {
    name: string;
    email: string;
    role: string;
    schoolId: string;
    schoolName: string;
    uid?: string;
    subjects?: string[];
    assignedGrades?: string[];
    assignedBooks?: { id: string; title: string; subject: string; grade: string; chapters: number }[];
  } | null;
  loginTime: number;
}

const SESSIONS_KEY = 'multitab_sessions';
const TAB_ID_KEY = 'tab_id';

// Get or create unique tab ID
export const getTabId = (): string => {
  if (typeof window === 'undefined') return 'tab_default';
  
  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }
  return tabId;
};

// Get all sessions across tabs
export const getAllSessions = (): TabSession[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading sessions:', e);
    return [];
  }
};

// Save user session for this tab
export const saveTabSession = (user: any): void => {
  if (typeof window === 'undefined') return;
  
  const tabId = getTabId();
  const sessions = getAllSessions();
  
  // Remove old session for this tab if exists
  const filteredSessions = sessions.filter(s => s.tabId !== tabId);
  
  // Add new session
  filteredSessions.push({
    tabId,
    user: user ? {
      name: user.name || 'User',
      email: user.email || '',
      role: user.role || 'User',
      schoolId: user.schoolId || '',
      schoolName: user.schoolName || '',
      uid: user.uid || '',
      subjects: user.subjects || [],
      assignedGrades: user.assignedGrades || [],
      assignedBooks: user.assignedBooks || [],
    } : null,
    loginTime: Date.now(),
  });
  
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filteredSessions));
    // Notify other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: SESSIONS_KEY,
      newValue: JSON.stringify(filteredSessions),
      oldValue: null,
    }));
  } catch (e) {
    console.error('Error saving session:', e);
  }
};

// Get session for this tab
export const getTabSession = () => {
  if (typeof window === 'undefined') return null;
  
  const tabId = getTabId();
  const sessions = getAllSessions();
  return sessions.find(s => s.tabId === tabId);
};

// Clear session for this tab
export const clearTabSession = (): void => {
  if (typeof window === 'undefined') return;
  
  const tabId = getTabId();
  const sessions = getAllSessions();
  const filteredSessions = sessions.filter(s => s.tabId !== tabId);
  
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filteredSessions));
  } catch (e) {
    console.error('Error clearing session:', e);
  }
};

// Listen for session changes in other tabs
export const onSessionChange = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === SESSIONS_KEY) {
      callback();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};
