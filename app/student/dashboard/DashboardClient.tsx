'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import OnboardingTour from '@/components/OnboardingTour';
import { studentTourSteps } from '@/components/tours/studentTourSteps';

interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  subject: string;
  class: string;
  score: number;
  totalMarks: number;
  percentage: number;
  isMarked: boolean;
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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [badges, setBadges] = useState<Badge[]>(ACHIEVEMENT_BADGES);
  const [previousBadgeCount, setPreviousBadgeCount] = useState(0);
  const quizHistory = initialQuizHistory;
  const upcomingQuizzes = initialUpcomingQuizzes;
  const stats = initialStats;

  useEffect(() => {
    const calculatedBadges = calculateBadges(quizHistory);
    const earnedCount = calculatedBadges.filter(b => b.earned).length;
    
    setPreviousBadgeCount(earnedCount);
    setBadges(calculatedBadges);
  }, [quizHistory, previousBadgeCount]);

  const recentScores = quizHistory.slice(0, 5);
  const earnedBadges = badges.filter(b => b.earned);

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

  const scoreTrendSource = quizHistory.length > 0 ? [...quizHistory].slice(0, 8) : [];
  const fallbackTrend = [65, 70, 78, 75, 82, 85, 88, 90];
  const subjectPalette = ['#00A86B', '#1E88E5', '#4A148C', '#FFB300', '#FF7043', '#D32F2F', '#7B1FA2', '#00897B'];

  const trendData = scoreTrendSource.length > 0
    ? scoreTrendSource.map((attempt, index) => {
        const completedDate = attempt.completedAt ? new Date(attempt.completedAt) : null;
        const label = completedDate && !Number.isNaN(completedDate.getTime())
          ? completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : `Q${index + 1}`;

        return {
          value: Math.round(attempt.percentage),
          label,
          subject: String(attempt.subject || 'Overall'),
        };
      })
    : fallbackTrend.map((value, index) => ({ value, label: `Q${index + 1}`, subject: 'Overall' }));

  const trendValues = trendData.map((point) => point.value);
  const trendLabels = trendData.map((point) => point.label);

  const subjectNames = Array.from(new Set(trendData.map((point) => point.subject).filter(Boolean)));
  const subjectColorMap = new Map(subjectNames.map((name, index) => [name, subjectPalette[index % subjectPalette.length]]));
  const dynamicSubjectLegend = subjectNames.map((name) => ({
    name,
    color: subjectColorMap.get(name) || '#1f8b4c',
  }));

  const trendPoints = trendValues
    .map((value, index) => {
      const x = (index / (trendValues.length - 1 || 1)) * 100;
      const y = 100 - Math.min(100, Math.max(0, value));
      return `${x},${y}`;
    })
    .join(' ');

  const latestQuiz = upcomingQuizzes[0];
  const avgScore = Math.round(stats.averageScore || 0);
  const pendingCount = stats.pendingQuizzes ?? upcomingQuizzes.length ?? 0;
  const statCards = [
    {
      label: 'Quizzes Attempted',
      value: stats.quizzesAttempted ?? 0,
      subtext: 'All-time practice sessions',
      icon: 'ri-file-list-3-line',
      color: '#1f6fb2',
      className: 'stat-card-attempted'
    },
    {
      label: 'Pending Quizzes',
      value: pendingCount,
      subtext: '',
      icon: 'ri-timer-line',
      color: '#14b8a6',
      className: 'stat-card-pending'
    },
    {
      label: 'Latest Score',
      value: `${Math.round(stats.lastQuizScore || 0)}%`,
      subtext: 'Most recent attempt',
      icon: 'ri-line-chart-line',
      color: '#f59e0b',
      className: 'stat-card-latest'
    },
    {
      label: 'Average Score',
      value: `${avgScore}%`,
      subtext: 'Overall performance',
      icon: 'ri-trophy-line',
      color: '#8b5cf6',
      className: 'stat-card-average'
    }
  ];
  const openHistoryModal = () => setShowHistoryModal(true);
  const closeHistoryModal = () => setShowHistoryModal(false);

  return (
    <div className="flex min-h-screen bg-[#e6efff]">
      <Sidebar
        userRole="Student"
        currentPage="dashboard"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:ml-[256px] bg-[#f2f6ff] min-h-screen">
        {/* Top Bar */}
        <div className="bg-white/90 backdrop-blur px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-20 border-b border-white/70">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg bg-[#eef3ff] text-[#1f2667]"
            aria-label="Open menu"
          >
            <i className="ri-menu-fill text-2xl"></i>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b45d8] tracking-tight">Student Dashboard</h1>
          <div className="w-11" />
        </div>

        {/* Content */}
        <div className="px-4 sm:px-8 py-6 space-y-6">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-r from-[#dff5ff] via-[#f4ecff] to-[#fff4de] p-4 sm:p-6 shadow-xl">
            <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-b from-white/40 to-transparent blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="flex-1">
                <p className="text-sm leading-6 font-semibold tracking-[0.35em] uppercase text-[#0c5573]">Learning Journey</p>
                <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-[#0c223f] leading-tight">Welcome back, {studentName || 'Student'}!</h2>
                <p className="mt-2 text-sm text-[#173b52] max-w-2xl">
                  Ready to challenge yourself with a new quiz today?
                  {latestQuiz
                    ? ` Your next quiz "${latestQuiz.title}" opens ${formatDate(latestQuiz.schedule?.startAt || '')}.`
                    : ' Explore assignments to keep your streak alive.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push('/student/assigned')}
                    className="px-4 py-2 rounded-full bg-[#1b45d8] text-white text-sm font-semibold shadow-md hover:bg-[#1537ab] transition-colors"
                  >
                    Start Next Quiz
                  </button>
                  <button
                    onClick={openHistoryModal}
                    className="px-4 py-2 rounded-full border border-[#1b45d8]/40 text-sm font-semibold text-[#1b45d8] hover:bg-white/60 transition-colors"
                  >
                    Review History
                  </button>
                </div>
              </div>
              <div className="w-full max-w-lg">
                <div className="bg-white/85 border border-white/70 rounded-[24px] p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Keep earning</p>
                      <h3 className="text-sm font-bold text-[#1b45d8]">Achievement Badges</h3>
                    </div>
                    <span className="text-xs text-gray-500">{earnedBadges.length}/{badges.length} unlocked</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {badges.map((badge) => (
                      <div
                        key={badge.id}
                        className={`rounded-xl px-2 py-3 text-center transition-all duration-300 ${badge.earned ? 'border border-amber-400/40 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm hover:-translate-y-0.5 hover:shadow-md' : 'border border-dashed border-gray-300 bg-white'}`}
                      >
                        <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-lg mb-1 transition-all duration-300 ${badge.earned ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                          {badge.icon}
                        </div>
                        <p className={`text-xs font-semibold truncate transition-colors duration-300 ${badge.earned ? 'text-orange-700' : 'text-[#1f2667]'}`}>{badge.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((item, index) => (
              <div
                key={item.label}
                className={`rounded-2xl px-5 py-4 shadow-lg text-white relative overflow-hidden border border-white/25 min-h-[150px] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer ${item.className || ''}`}
                style={{ backgroundColor: item.color }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 pointer-events-none transition-opacity duration-300 hover:opacity-80" />
                <div className={`${index === 1 ? 'text-5xl' : 'text-4xl'} font-semibold leading-none`}>{item.value}</div>
                <div className="absolute bottom-6 left-5 right-20">
                  <p className="text-lg font-semibold tracking-wide leading-6 text-white/95">{item.label}</p>
                </div>
                <div className="absolute bottom-4 right-4 w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/30">
                  <i className={item.icon}></i>
                </div>
              </div>
            ))}
          </div>

          {/* Score Trend + History */}
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="bg-gradient-to-br from-white via-white to-blue-50/30 border border-white/70 rounded-[26px] shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Subject performance</p>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-[#1b45d8] to-[#4f7bff] bg-clip-text text-transparent">Performance Overview</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Target: 80%</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="space-y-6">
                  {/* Bullet Graphs */}
                  {(() => {
                    // Group scores by subject and calculate average
                    const subjectScores = new Map<string, number[]>();
                    trendData.forEach(point => {
                      const subject = point.subject;
                      if (!subjectScores.has(subject)) {
                        subjectScores.set(subject, []);
                      }
                      subjectScores.get(subject)!.push(point.value);
                    });

                    const bulletData = Array.from(subjectScores.entries()).map(([subject, scores]) => {
                      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                      const recentScore = scores[scores.length - 1];
                      const color = subjectColorMap.get(subject) || '#1b45d8';
                      return { subject, avgScore, recentScore, color };
                    });

                    return bulletData.map((data, index) => (
                      <div key={index} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></span>
                            <span className="font-semibold text-gray-700 text-sm">{data.subject}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-500">Latest: <span className="font-semibold text-gray-700">{data.recentScore}%</span></span>
                            <span className="text-xs text-gray-500">Avg: <span className="font-semibold text-gray-700">{data.avgScore}%</span></span>
                          </div>
                        </div>
                        
                        {/* Bullet Graph */}
                        <div className="relative h-10 rounded-lg overflow-hidden">
                          {/* Qualitative ranges (background bands) */}
                          <div className="absolute inset-0 flex">
                            <div className="h-full bg-red-100" style={{ width: '50%' }}></div>
                            <div className="h-full bg-amber-100" style={{ width: '25%' }}></div>
                            <div className="h-full bg-emerald-100" style={{ width: '25%' }}></div>
                          </div>
                          
                          {/* Average score bar (darker) */}
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 h-6 rounded transition-all duration-500 group-hover:brightness-90"
                            style={{ 
                              width: `${data.avgScore}%`,
                              backgroundColor: data.color,
                              opacity: 0.5
                            }}
                          ></div>
                          
                          {/* Recent score bar (brighter) */}
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 h-4 rounded shadow-sm transition-all duration-500 group-hover:shadow-md group-hover:scale-x-[1.01] origin-left"
                            style={{ 
                              width: `${data.recentScore}%`,
                              backgroundColor: data.color
                            }}
                          ></div>
                          
                          {/* Target marker (80%) */}
                          <div 
                            className="absolute top-0 bottom-0 w-1 bg-gray-800"
                            style={{ left: '80%' }}
                          >
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-gray-800"></div>
                          </div>
                          
                          {/* Grid lines */}
                          <div className="absolute inset-0 flex">
                            {[25, 50, 75].map(val => (
                              <div 
                                key={val}
                                className="absolute top-0 bottom-0 w-px bg-white/60"
                                style={{ left: `${val}%` }}
                              ></div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Scale labels */}
                        {index === bulletData.length - 1 && (
                          <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                  
                  {/* Legend */}
                  <div className="pt-4 border-t border-gray-200 flex items-center justify-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-3 bg-gray-400 rounded opacity-50"></div>
                      <span className="text-gray-600">Average</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-2 bg-gray-600 rounded"></div>
                      <span className="text-gray-600">Latest</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-gray-800"></div>
                      <span className="text-gray-600">Target (80%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div id="quiz-history" className="bg-white/90 border border-white/70 rounded-[26px] shadow-xl p-6 flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">Latest attempts</p>
                <h3 className="text-xl font-bold text-[#1b45d8]">Quiz History</h3>
              </div>
              <div className="space-y-3">
                {recentScores.length > 0 ? (
                  recentScores.map((attempt) => (
                    <div key={attempt.id} className="border-2 border-gray-200 rounded-2xl p-4 flex items-center justify-between bg-white hover:-translate-y-0.5 hover:border-blue-300 transition-all shadow-sm">
                      <div>
                        <p className="font-semibold text-[#1f2667]">{attempt.quizTitle || 'Quiz'}</p>
                        <p className="text-xs text-gray-500">{formatDate(attempt.completedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#1f2667]">{Math.round(attempt.percentage)}%</p>
                        <p className="text-xs text-gray-500">{attempt.subject || 'Subject'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center">No quiz history yet</p>
                )}
              </div>
              <button
                onClick={() => router.push('/student/assigned')}
                className="w-full bg-gradient-to-r from-[#1b45d8] to-[#4f7bff] text-white rounded-full py-2.5 font-semibold hover:shadow-lg transition"
              >
                Go to Assigned Quizzes
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-6 lg:grid-cols-1">
            <div className="bg-white/90 border border-white/70 rounded-[26px] shadow-xl p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Performance snapshot</p>
                <h3 className="text-xl font-bold text-[#1b45d8]">Quick Stats</h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[{
                  label: 'Best Score',
                  value: quizHistory.length > 0 ? `${Math.round(Math.max(...quizHistory.map((q) => q.percentage)))}%` : '-',
                  color: '#00a75d'
                }, {
                  label: 'Total Marks',
                  value: quizHistory.reduce((sum, q) => sum + (q.score || 0), 0),
                  color: '#1f2667'
                }, {
                  label: 'Improvement',
                  value: quizHistory.length >= 2 ? `${Math.round(quizHistory[0].percentage - quizHistory[quizHistory.length - 1].percentage)}%` : '-',
                  color: '#ff8c00'
                }, {
                  label: 'Upcoming Quizzes',
                  value: upcomingQuizzes.length,
                  color: '#1f2667'
                }].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
                    <p className="text-gray-500">{stat.label}</p>
                    <p className="font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#1b45d8]">Attempted Quiz History</h3>
              <button
                onClick={closeHistoryModal}
                className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Close history"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4">
              {quizHistory.length > 0 ? (
                <div className="space-y-3">
                  {quizHistory.map((attempt) => (
                    <div key={attempt.id} className="rounded-xl border border-[#e7ecff] p-4 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Quiz Name</p>
                          <p className="font-semibold text-[#1f2667]">{attempt.quizTitle || 'Quiz'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Subject</p>
                          <p className="font-medium text-gray-700">{attempt.subject || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Marks</p>
                          <p className="font-medium text-gray-700">{attempt.score}/{attempt.totalMarks}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Attempted Date</p>
                          <p className="font-medium text-gray-700">{formatDate(attempt.completedAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No attempted quiz history found.</p>
              )}
            </div>
          </div>
        </div>
      )}
      <OnboardingTour steps={studentTourSteps} storageKey="student-tour-completed" />
    </div>
  );
}
