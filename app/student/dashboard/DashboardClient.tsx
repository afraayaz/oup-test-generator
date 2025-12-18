'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  subject: string;
  class: string;
  score: number;
  totalMarks: number;
  percentage: number;
  completedAt: string;
}

interface UpcomingQuiz {
  id: string;
  title: string;
  subject: string;
  class: string;
  timeLimitMinutes: number;
  totalQuestions: number;
  schedule: { startAt: string; endAt: string };
}

interface Stats {
  averageScore: number;
  quizzesAttempted: number;
  pendingQuizzes: number;
  lastQuizScore: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
}

interface Props {
  initialQuizHistory: QuizAttempt[];
  initialUpcomingQuizzes: UpcomingQuiz[];
  initialStats: Stats;
  studentName?: string;
}

const ACHIEVEMENT_BADGES: Badge[] = [
  {
    id: 'first-quiz',
    name: 'First Step',
    icon: '🎯',
    color: 'from-blue-400 to-blue-600',
    description: 'Complete your first quiz',
    earned: false
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    icon: '💯',
    color: 'from-yellow-400 to-yellow-600',
    description: 'Score 100% on any quiz',
    earned: false
  },
  {
    id: 'streak-5',
    name: '5-Quiz Streak',
    icon: '🔥',
    color: 'from-red-400 to-red-600',
    description: 'Complete 5 quizzes',
    earned: false
  },
  {
    id: 'streak-10',
    name: '10-Quiz Streak',
    icon: '⚡',
    color: 'from-purple-400 to-purple-600',
    description: 'Complete 10 quizzes',
    earned: false
  },
  {
    id: 'high-achiever',
    name: 'High Achiever',
    icon: '⭐',
    color: 'from-indigo-400 to-indigo-600',
    description: 'Maintain 80%+ average',
    earned: false
  },
  {
    id: 'master',
    name: 'Quiz Master',
    icon: '👑',
    color: 'from-pink-400 to-pink-600',
    description: 'Complete 20 quizzes',
    earned: false
  },
  {
    id: 'consistent',
    name: 'Consistent Performer',
    icon: '📈',
    color: 'from-green-400 to-green-600',
    description: '90%+ average on 5+ quizzes',
    earned: false
  },
  {
    id: 'speedster',
    name: 'Speedster',
    icon: '🚀',
    color: 'from-cyan-400 to-cyan-600',
    description: 'Complete quiz in half the time limit',
    earned: false
  },
];

function calculateBadges(quizHistory: QuizAttempt[]): Badge[] {
  const badges = ACHIEVEMENT_BADGES.map(badge => ({ ...badge }));
  
  if (quizHistory.length === 0) return badges;

  // First Quiz
  if (quizHistory.length >= 1) {
    const badge = badges.find(b => b.id === 'first-quiz');
    if (badge) badge.earned = true;
  }

  // Perfect Score
  if (quizHistory.some(q => q.percentage === 100)) {
    const badge = badges.find(b => b.id === 'perfect-score');
    if (badge) badge.earned = true;
  }

  // 5 Quiz Streak
  if (quizHistory.length >= 5) {
    const badge = badges.find(b => b.id === 'streak-5');
    if (badge) badge.earned = true;
  }

  // 10 Quiz Streak
  if (quizHistory.length >= 10) {
    const badge = badges.find(b => b.id === 'streak-10');
    if (badge) badge.earned = true;
  }

  // High Achiever (80%+ average)
  const avgScore = quizHistory.reduce((sum, q) => sum + q.percentage, 0) / quizHistory.length;
  if (avgScore >= 80) {
    const badge = badges.find(b => b.id === 'high-achiever');
    if (badge) badge.earned = true;
  }

  // Quiz Master (20+ quizzes)
  if (quizHistory.length >= 20) {
    const badge = badges.find(b => b.id === 'master');
    if (badge) badge.earned = true;
  }

  // Consistent Performer (90%+ average on 5+ quizzes)
  if (quizHistory.length >= 5) {
    const high90s = quizHistory.filter(q => q.percentage >= 90).length;
    if (high90s >= 5) {
      const badge = badges.find(b => b.id === 'consistent');
      if (badge) badge.earned = true;
    }
  }

  return badges;
}

export default function DashboardClient({ initialQuizHistory, initialUpcomingQuizzes, initialStats, studentName = 'Student' }: Props) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState<Badge[]>(ACHIEVEMENT_BADGES);
  const [previousBadgeCount, setPreviousBadgeCount] = useState(0);
  const [newlyEarnedBadge, setNewlyEarnedBadge] = useState<Badge | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const quizHistory = initialQuizHistory;
  const upcomingQuizzes = initialUpcomingQuizzes;
  const stats = initialStats;

  useEffect(() => {
    const calculatedBadges = calculateBadges(quizHistory);
    const earnedCount = calculatedBadges.filter(b => b.earned).length;
    
    // Detect if a new badge was earned
    if (earnedCount > previousBadgeCount) {
      // Find the newly earned badge
      const newBadge = calculatedBadges.find(b => 
        b.earned && !badges.find(oldB => oldB.id === b.id && oldB.earned)
      );
      
      if (newBadge) {
        setNewlyEarnedBadge(newBadge);
        setShowCelebration(true);
        // Auto-hide after 3 seconds
        const timer = setTimeout(() => setShowCelebration(false), 3000);
        return () => clearTimeout(timer);
      }
      
      setPreviousBadgeCount(earnedCount);
    }
    
    setBadges(calculatedBadges);
  }, [quizHistory, badges, previousBadgeCount]);

  const recentScores = quizHistory.slice(0, 5);
  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  const getScoreGradient = (percentage: number) => {
    if (percentage >= 80) return 'from-green-500 to-emerald-600';
    if (percentage >= 60) return 'from-blue-500 to-indigo-600';
    if (percentage >= 40) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <>
      {/* Celebration Modal */}
      {showCelebration && newlyEarnedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Party Popper Effect */}
          <div className="relative w-full h-full">
            {/* Confetti pieces */}
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  animation: `fall ${2 + Math.random() * 1}s linear forwards`,
                  fontSize: ['🎉', '🎊', '✨', '🌟'][Math.floor(Math.random() * 4)],
                  opacity: Math.random() * 0.8 + 0.2,
                }}
              >
                {['🎉', '🎊', '✨', '🌟'][Math.floor(Math.random() * 4)]}
              </div>
            ))}
          </div>

          {/* Main Badge Modal */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform scale-100 animate-bounce">
              {/* Celebration Header */}
              <div className="text-center mb-6">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  Badge Unlocked!
                </h2>
                <p className="text-gray-600">Congratulations! You earned a new achievement</p>
              </div>

              {/* Badge Display */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 text-center">
                <div className={`w-24 h-24 mx-auto mb-4 bg-gradient-to-br ${newlyEarnedBadge.color} rounded-full flex items-center justify-center text-6xl shadow-lg`}>
                  {newlyEarnedBadge.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{newlyEarnedBadge.name}</h3>
                <p className="text-gray-600 text-sm">{newlyEarnedBadge.description}</p>
              </div>

              {/* Celebration Message */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6 text-center">
                <p className="text-purple-800 font-semibold">🌟 Keep up the amazing work! 🌟</p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowCelebration(false)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all duration-300 text-lg"
              >
                Awesome! 🚀
              </button>
            </div>
          </div>

          {/* CSS Animation for falling confetti */}
          <style>{`
            @keyframes fall {
              to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      )}

      <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Student" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-[256px]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">Student Dashboard</h1>
          <div className="w-11 h-11"></div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Welcome Banner */}
          <div className="mb-6 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome back, {studentName}! 👋</h2>
            <p className="text-sm sm:text-base text-purple-100">Ready to challenge yourself with a new quiz today?</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
            {[
              { label: 'Average Score', value: stats.averageScore, suffix: '%', color: 'from-purple-500 to-purple-600' },
              { label: 'Quizzes Attempted', value: stats.quizzesAttempted, suffix: '', color: 'from-blue-500 to-blue-600' },
              { label: 'Badges Earned', value: earnedBadges.length, suffix: '', color: 'from-yellow-500 to-yellow-600' },
              { label: 'Last Quiz Score', value: stats.lastQuizScore, suffix: '%', color: 'from-pink-500 to-pink-600' }
            ].map((stat, idx) => (
              <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-lg sm:rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow`}>
                <div className="text-2xl sm:text-3xl font-bold mb-1">{stat.value}{stat.suffix}</div>
                <div className="text-xs sm:text-sm text-white/90">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Achievement Badges Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <i className="ri-trophy-line text-2xl text-yellow-500"></i>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Achievement Badges</h2>
              <span className="ml-auto text-sm text-gray-600">{earnedBadges.length}/{badges.length} unlocked</span>
            </div>
            
            {earnedBadges.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
                {earnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    title={`${badge.name} - ${badge.description}`}
                    className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer text-center"
                  >
                    <div className={`w-12 h-12 mx-auto mb-2 bg-gradient-to-br ${badge.color} rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                      {badge.icon}
                    </div>
                    <h3 className="text-xs font-bold text-gray-800 line-clamp-2">{badge.name}</h3>
                  </div>
                ))}
              </div>
            )}

            {lockedBadges.length > 0 && (
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                  <i className="ri-lock-line"></i> Next Badges to Unlock
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                  {lockedBadges.slice(0, 6).map((badge) => (
                    <div
                      key={badge.id}
                      title={`${badge.name} - ${badge.description}`}
                      className="bg-gray-200 rounded-lg p-3 shadow-sm opacity-50 cursor-not-allowed text-center"
                    >
                      <div className={`w-12 h-12 mx-auto mb-2 bg-gradient-to-br ${badge.color} rounded-full flex items-center justify-center text-2xl opacity-40`}>
                        {badge.icon}
                      </div>
                      <h3 className="text-xs font-bold text-gray-600 line-clamp-2">{badge.name}</h3>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Upcoming Quizzes */}
            <div className="lg:col-span-2 bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-800">Upcoming Quizzes</h3>
                <button 
                  onClick={() => router.push('/student/assigned')}
                  className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {upcomingQuizzes.length > 0 ? (
                  upcomingQuizzes.slice(0, 3).map((quiz) => (
                    <div key={quiz.id} className="border-l-4 border-purple-500 bg-gray-50 rounded p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{quiz.title}</h4>
                        <p className="text-xs sm:text-sm text-purple-600 mb-1">{quiz.subject}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                          <span><i className="ri-time-line"></i> {quiz.timeLimitMinutes}min</span>
                          <span><i className="ri-edit-line"></i> {quiz.totalQuestions}Qs</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => router.push(`/student/attempt?id=${quiz.id}`)}
                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        Start
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <i className="ri-calendar-line text-3xl text-purple-400 mb-2"></i>
                    <p className="text-gray-600 text-sm">No upcoming quizzes scheduled</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Recent Scores & Quick Stats */}
            <div className="space-y-4">
              {/* Recent Scores */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Recent Scores</h3>
                <div className="space-y-2">
                  {recentScores.length > 0 ? (
                    recentScores.map((attempt) => (
                      <div key={attempt.id} className="bg-white rounded p-2 sm:p-3 flex items-center justify-between text-xs sm:text-sm">
                        <span className="truncate">{attempt.quizTitle || 'Quiz'}</span>
                        <span className={`px-2 py-1 bg-gradient-to-r ${getScoreGradient(attempt.percentage)} text-white rounded text-xs font-bold whitespace-nowrap ml-2`}>
                          {Math.round(attempt.percentage)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-center text-xs">No scores yet</p>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Quick Stats</h3>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="bg-white rounded p-2 flex justify-between">
                    <span>Best Score</span>
                    <span className="font-bold text-green-600">
                      {quizHistory.length > 0 ? `${Math.round(Math.max(...quizHistory.map(q => q.percentage)))}%` : '-'}
                    </span>
                  </div>
                  <div className="bg-white rounded p-2 flex justify-between">
                    <span>Total Marks</span>
                    <span className="font-bold text-purple-600">
                      {quizHistory.reduce((sum, q) => sum + (q.score || 0), 0)}
                    </span>
                  </div>
                  <div className="bg-white rounded p-2 flex justify-between">
                    <span>Improvement</span>
                    <span className="font-bold text-blue-600">
                      {quizHistory.length >= 2 ? `${Math.round(quizHistory[0].percentage - quizHistory[quizHistory.length - 1].percentage)}%` : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quiz History Table */}
          <div className="mt-6 bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Quiz History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700">Quiz</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 hidden sm:table-cell">Subject</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700">Score</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 hidden md:table-cell">Date</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quizHistory.slice(0, 10).map((attempt) => (
                    <tr key={attempt.id} className="border-t hover:bg-purple-50 transition-colors">
                      <td className="px-2 sm:px-4 py-3 font-medium truncate">{attempt.quizTitle || 'Quiz'}</td>
                      <td className="px-2 sm:px-4 py-3 text-gray-600 hidden sm:table-cell">{attempt.subject || '-'}</td>
                      <td className="px-2 sm:px-4 py-3">
                        <span className={`px-2 py-1 bg-gradient-to-r ${getScoreGradient(attempt.percentage)} text-white rounded text-xs font-bold`}>
                          {attempt.score}/{attempt.totalMarks}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 hidden md:table-cell text-gray-600">{formatDate(attempt.completedAt)}</td>
                      <td className="px-2 sm:px-4 py-3">
                        <button
                          onClick={() => router.push(`/student/attempt?id=${attempt.quizId}`)}
                          className="text-purple-600 hover:text-purple-700 font-medium text-xs whitespace-nowrap"
                        >
                          Retake
                        </button>
                      </td>
                    </tr>
                  ))}
                  {quizHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        <p className="font-medium mb-2">No quiz history available yet</p>
                        <button 
                          onClick={() => router.push('/student/assigned')}
                          className="text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Take a Quiz
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
