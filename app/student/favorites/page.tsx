'use client';

import Sidebar from '@/components/Sidebar';
import { useState, useMemo } from 'react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  quizzesTaken: number;
  streak: number;
  badges: string[];
  grade: string;
  avgScore: number;
}

export default function LeaderboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const [gradeFilter, setGradeFilter] = useState('all');
  
  const currentStudentName = 'Jane Doe';
  const currentStudentGrade = 'Grade 10';

  const leaderboardData: LeaderboardEntry[] = [
    {
      rank: 1,
      name: 'Alex Thompson',
      avatar: 'AT',
      score: 2850,
      quizzesTaken: 32,
      streak: 15,
      badges: ['🏆', '⭐', '🔥'],
      grade: 'Grade 10',
      avgScore: 92
    },
    {
      rank: 2,
      name: 'Sarah Chen',
      avatar: 'SC',
      score: 2720,
      quizzesTaken: 28,
      streak: 12,
      badges: ['⭐', '🔥'],
      grade: 'Grade 10',
      avgScore: 89
    },
    {
      rank: 3,
      name: 'Michael Rodriguez',
      avatar: 'MR',
      score: 2680,
      quizzesTaken: 30,
      streak: 10,
      badges: ['⭐', '🎯'],
      grade: 'Grade 10',
      avgScore: 88
    },
    {
      rank: 4,
      name: 'Emma Wilson',
      avatar: 'EW',
      score: 2540,
      quizzesTaken: 25,
      streak: 8,
      badges: ['🎯'],
      grade: 'Grade 10',
      avgScore: 85
    },
    {
      rank: 5,
      name: 'Jane Doe',
      avatar: 'JD',
      score: 2420,
      quizzesTaken: 24,
      streak: 7,
      badges: ['🎯', '📚'],
      grade: 'Grade 10',
      avgScore: 83
    },
    {
      rank: 6,
      name: 'David Kim',
      avatar: 'DK',
      score: 2380,
      quizzesTaken: 23,
      streak: 6,
      badges: ['📚'],
      grade: 'Grade 10',
      avgScore: 81
    },
    {
      rank: 7,
      name: 'Olivia Martinez',
      avatar: 'OM',
      score: 2290,
      quizzesTaken: 22,
      streak: 5,
      badges: ['📚'],
      grade: 'Grade 9',
      avgScore: 79
    },
    {
      rank: 8,
      name: 'James Brown',
      avatar: 'JB',
      score: 2150,
      quizzesTaken: 20,
      streak: 4,
      badges: [],
      grade: 'Grade 10',
      avgScore: 77
    },
    {
      rank: 9,
      name: 'Sophia Lee',
      avatar: 'SL',
      score: 2080,
      quizzesTaken: 19,
      streak: 3,
      badges: [],
      grade: 'Grade 9',
      avgScore: 75
    },
    {
      rank: 10,
      name: 'Ryan Patel',
      avatar: 'RP',
      score: 1950,
      quizzesTaken: 18,
      streak: 2,
      badges: [],
      grade: 'Grade 11',
      avgScore: 72
    }
  ];

  // Filter leaderboard by grade
  const filteredLeaderboard = useMemo(() => {
    if (gradeFilter === 'all') return leaderboardData;
    return leaderboardData.filter(entry => entry.grade === gradeFilter)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }))
      .sort((a, b) => b.score - a.score);
  }, [gradeFilter]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userRole="Student" currentPage="leaderboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">Leaderboard</h1>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome to the Leaderboard!</h2>
            <p className="text-sm sm:text-base text-purple-100">Track your performance, compete with peers in your grade, and earn badges for your achievements.</p>
          </div>

          {/* Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Time Filter */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Time Period</label>
              <div className="flex gap-2 flex-wrap">
                {(['weekly', 'monthly', 'alltime'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimeFilter(period)}
                    className={`min-w-[44px] min-h-[44px] px-4 sm:px-6 py-2 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                      timeFilter === period
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {period === 'weekly' && 'This Week'}
                    {period === 'monthly' && 'This Month'}
                    {period === 'alltime' && 'All Time'}
                  </button>
                ))}
              </div>
            </div>

            {/* Grade Filter */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Grade</label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Grades</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10 (Your Grade)</option>
                <option value="Grade 11">Grade 11</option>
              </select>
            </div>
          </div>

          {/* Top 3 Podium */}
          {filteredLeaderboard.length >= 3 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🏆 Top Performers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 2nd Place */}
                <div className="flex flex-col items-center bg-white rounded-lg p-4 sm:p-6 shadow-md hover:shadow-lg transition">
                  <div className="text-3xl mb-2">🥈</div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white font-bold text-lg mb-3 shadow">
                    {filteredLeaderboard[1].avatar}
                  </div>
                  <h4 className="font-bold text-gray-800 text-center text-sm sm:text-base">{filteredLeaderboard[1].name}</h4>
                  <p className="text-purple-600 font-bold text-lg sm:text-xl mt-1">{filteredLeaderboard[1].score}</p>
                  <p className="text-xs text-gray-500">points</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {filteredLeaderboard[1].badges.map((badge, idx) => (
                      <span key={idx}>{badge}</span>
                    ))}
                  </div>
                </div>

                {/* 1st Place (Larger) */}
                <div className="flex flex-col items-center bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 sm:p-6 shadow-lg border-2 border-yellow-300">
                  <div className="text-4xl sm:text-5xl mb-2">👑</div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-lg ring-4 ring-yellow-200">
                    {filteredLeaderboard[0].avatar}
                  </div>
                  <h4 className="font-bold text-gray-800 text-center text-sm sm:text-base">{filteredLeaderboard[0].name}</h4>
                  <p className="text-purple-600 font-bold text-xl sm:text-2xl mt-1">{filteredLeaderboard[0].score}</p>
                  <p className="text-xs text-gray-500">points</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {filteredLeaderboard[0].badges.map((badge, idx) => (
                      <span key={idx} className="text-lg">{badge}</span>
                    ))}
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center bg-white rounded-lg p-4 sm:p-6 shadow-md hover:shadow-lg transition">
                  <div className="text-3xl mb-2">🥉</div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg mb-3 shadow">
                    {filteredLeaderboard[2].avatar}
                  </div>
                  <h4 className="font-bold text-gray-800 text-center text-sm sm:text-base">{filteredLeaderboard[2].name}</h4>
                  <p className="text-purple-600 font-bold text-lg sm:text-xl mt-1">{filteredLeaderboard[2].score}</p>
                  <p className="text-xs text-gray-500">points</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {filteredLeaderboard[2].badges.map((badge, idx) => (
                      <span key={idx}>{badge}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Rankings List */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Full Rankings {gradeFilter !== 'all' && `- ${gradeFilter}`}</h2>
            </div>

            <div className="overflow-x-auto">
              <div className="divide-y divide-gray-200">
                {filteredLeaderboard.map((entry) => (
                  <div
                    key={`${entry.rank}-${entry.name}`}
                    className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between transition hover:bg-gray-50 ${
                      entry.name === currentStudentName
                        ? 'bg-purple-50 border-l-4 border-purple-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      {/* Rank */}
                      <div
                        className={`min-w-[40px] w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          entry.rank <= 3
                            ? entry.rank === 1
                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white'
                              : entry.rank === 2
                              ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                              : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {entry.rank <= 3 ? ['👑', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                      </div>

                      {/* Avatar */}
                      <div className={`min-w-[40px] w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm text-white flex-shrink-0 ${
                        entry.name === currentStudentName ? 'bg-purple-600' : 'bg-gray-600'
                      }`}>
                        {entry.avatar}
                      </div>

                      {/* Name and Stats */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">
                            {entry.name}
                            {entry.name === currentStudentName && (
                              <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">You</span>
                            )}
                          </h3>
                          <div className="flex gap-0.5 flex-wrap">
                            {entry.badges.slice(0, 2).map((badge, idx) => (
                              <span key={idx} className="text-xs sm:text-sm">{badge}</span>
                            ))}
                            {entry.badges.length > 2 && <span className="text-xs text-gray-500">+{entry.badges.length - 2}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <i className="ri-file-list-line"></i>
                            {entry.quizzesTaken}
                          </span>
                          <span className="flex items-center gap-1">
                            <i className="ri-fire-line text-orange-500"></i>
                            {entry.streak}
                          </span>
                          <span className="hidden sm:flex items-center gap-1">
                            <i className="ri-percent-line"></i>
                            {entry.avgScore}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-lg sm:text-2xl font-bold text-purple-600">{entry.score}</p>
                      <p className="text-xs text-gray-500">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Achievement Legend */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg mt-6">
            <h3 className="font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <span className="text-lg sm:text-xl">Achievement Badges</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              {[
                { icon: '🏆', title: 'Champion', desc: 'Top performer' },
                { icon: '⭐', title: 'Star Student', desc: 'High scores' },
                { icon: '🔥', title: 'On Fire', desc: '10+ day streak' },
                { icon: '🎯', title: 'Accuracy', desc: '90%+ correct' },
                { icon: '📚', title: 'Bookworm', desc: '20+ quizzes' }
              ].map((badge, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 text-center hover:shadow-md transition">
                  <p className="text-2xl sm:text-3xl mb-2">{badge.icon}</p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700">{badge.title}</p>
                  <p className="text-xs text-gray-500">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
