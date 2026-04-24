"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  streak_days: number;
  total_points: number;
  grade_level: { name: string } | null;
}

interface Stats {
  totalQuizzes: number;
  totalQuestions: number;
  accuracy: number;
  streak: number;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ totalQuizzes: 0, totalQuestions: 0, accuracy: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (!meData.user) {
        router.push("/login");
        return;
      }

      setProfile(meData.profile);

      if (meData.profile?.role === 'admin' || meData.profile?.role === 'super_admin') {
        router.push('/admin/dashboard');
      } else if (meData.profile?.role === 'teacher') {
        router.push('/teacher/dashboard');
      }

      // Fetch stats
      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Hello, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋</h1>
              {profile?.grade_level && (
                <p className="text-primary-200 text-sm">{profile.grade_level.name}</p>
              )}
            </div>
            <button onClick={handleLogout} className="text-white/80 text-sm hover:text-white">
              Logout
            </button>
          </div>

          {/* Streak Banner */}
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="font-bold text-xl">{profile?.streak_days || 0} day streak</p>
                <p className="text-primary-200 text-sm">Keep it going!</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-xl">{profile?.total_points || 0}</p>
              <p className="text-primary-200 text-sm">Points</p>
            </div>
          </div>

          {/* Subscription Banner */}
          <Link href="/subscription" className="block bg-amber-500 rounded-xl p-3 hover:bg-amber-600 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <div>
                  <p className="font-medium text-sm">Upgrade Your Plan</p>
                  <p className="text-amber-100 text-xs">Unlock more features</p>
                </div>
              </div>
              <span className="text-amber-100">→</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-primary-600">{stats.totalQuizzes}</div>
            <div className="text-xs text-slate-500">Quizzes</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.totalQuestions}</div>
            <div className="text-xs text-slate-500">Questions</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-500">{stats.accuracy}%</div>
            <div className="text-xs text-slate-500">Accuracy</div>
          </div>
        </div>

        {/* Practice Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">📝 Practice</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/practice" className="bg-primary-50 text-primary-700 p-4 rounded-xl text-center">
              <div className="text-2xl mb-1">🎯</div>
              <p className="font-semibold text-sm">Practice</p>
              <p className="text-xs text-primary-600">By topic</p>
            </Link>
            <Link href="/student/quizzes" className="bg-green-50 text-green-700 p-4 rounded-xl text-center">
              <div className="text-2xl mb-1">📝</div>
              <p className="font-semibold text-sm">Quizzes</p>
              <p className="text-xs text-green-600">Timed tests</p>
            </Link>
            <Link href="/student/exams" className="bg-red-50 text-red-700 p-4 rounded-xl text-center">
              <div className="text-2xl mb-1">📋</div>
              <p className="font-semibold text-sm">Exams</p>
              <p className="text-xs text-red-600">Full simulation</p>
            </Link>
            <Link href="/student/downloads" className="bg-blue-50 text-blue-700 p-4 rounded-xl text-center">
              <div className="text-2xl mb-1">📥</div>
              <p className="font-semibold text-sm">Downloads</p>
              <p className="text-xs text-blue-600">Offline packs</p>
            </Link>
            <Link href="/student/practice" className="bg-purple-50 text-purple-700 p-4 rounded-xl text-center">
              <div className="text-2xl mb-1">📚</div>
              <p className="font-semibold text-sm">ECZ Papers</p>
              <p className="text-xs text-purple-600">Past exams</p>
            </Link>
            <Link href="/student/tutorials" className="bg-red-50 text-red-700 p-4 rounded-xl text-center">
              <div className="text-2xl mb-1">🎬</div>
              <p className="font-semibold text-sm">Video & Audio</p>
              <p className="text-xs text-red-600">Lessons & tutorials</p>
            </Link>
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-800">🏆 Leaderboard</h2>
            <Link href="/leaderboard" className="text-primary-600 text-sm font-medium">View all</Link>
          </div>
          <div className="text-center py-6 text-slate-500">
            <div className="text-3xl mb-2">🚧</div>
            <p className="text-sm">Coming soon!</p>
            <p className="text-xs">Compete with students across Zambia</p>
          </div>
        </div>

        {/* Badges Preview */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-800">⭐ My Badges</h2>
            <Link href="/badges" className="text-primary-600 text-sm font-medium">View all</Link>
          </div>
          <div className="text-center py-6 text-slate-500">
            <div className="text-3xl mb-2">🎖️</div>
            <p className="text-sm">Complete quizzes to earn badges!</p>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">📈 Progress</h2>
          <div className="text-center py-6 text-slate-500">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm">Track your learning journey</p>
          </div>
        </div>
      </main>
    </div>
  );
}
