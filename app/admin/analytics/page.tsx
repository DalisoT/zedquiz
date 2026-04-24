"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalTutorials: number;
  totalViews: number;
  totalCompletions: number;
  newUsersThisMonth: number;
  topTeachers: TeacherStats[];
  popularContent: ContentStats[];
}

interface TeacherStats {
  id: string;
  full_name: string;
  tutorials_count: number;
  total_views: number;
  total_earnings: number;
  avg_rating: number;
}

interface ContentStats {
  id: string;
  title: string;
  type: string;
  views: number;
  completions: number;
  avg_rating: number;
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");

  useEffect(() => {
    fetchStats();
  }, [period]);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch {
      console.error("Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  }

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-amber-600 text-white p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Analytics Dashboard</h1>
              <Link href="/admin/dashboard" className="text-sm bg-white/20 px-3 py-1 rounded">Back</Link>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-amber-600 text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold">Super Admin Analytics</h1>
            <Link href="/admin/dashboard" className="text-sm bg-white/20 px-3 py-1 rounded">Back</Link>
          </div>
          <div className="flex gap-2">
            {(["week", "month", "all"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded text-sm ${period === p ? "bg-white text-amber-600" : "bg-white/20"}`}>
                {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-slate-500 text-sm">Total Users</div>
            <div className="text-3xl font-bold text-slate-800">{stats.totalUsers}</div>
            <div className="text-xs text-green-600">+{stats.newUsersThisMonth} this month</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-slate-500 text-sm">Students</div>
            <div className="text-3xl font-bold text-blue-600">{stats.totalStudents}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-slate-500 text-sm">Teachers</div>
            <div className="text-3xl font-bold text-green-600">{stats.totalTeachers}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-slate-500 text-sm">Admins</div>
            <div className="text-3xl font-bold text-purple-600">{stats.totalAdmins}</div>
          </div>
        </div>

        {/* Content Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-slate-500 text-sm">Total Tutorials</div>
            <div className="text-3xl font-bold text-slate-800">{stats.totalTutorials}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-slate-500 text-sm">Total Views</div>
            <div className="text-3xl font-bold text-slate-800">{stats.totalViews.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-slate-500 text-sm">Completions</div>
            <div className="text-3xl font-bold text-slate-800">{stats.totalCompletions.toLocaleString()}</div>
          </div>
        </div>

        {/* Top Teachers */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Top Teachers by Earnings</h2>
          {stats.topTeachers.length === 0 ? (
            <p className="text-slate-500 text-sm">No teacher data yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="pb-2">Teacher</th>
                  <th className="pb-2">Tutorials</th>
                  <th className="pb-2">Views</th>
                  <th className="pb-2">Avg Rating</th>
                  <th className="pb-2 text-right">Earnings (K)</th>
                </tr>
              </thead>
              <tbody>
                {stats.topTeachers.map((teacher, i) => (
                  <tr key={teacher.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="font-medium">{teacher.full_name}</div>
                    </td>
                    <td className="py-3">{teacher.tutorials_count}</td>
                    <td className="py-3">{teacher.total_views}</td>
                    <td className="py-3">
                      <span className="text-amber-500">★</span> {teacher.avg_rating?.toFixed(1) || "N/A"}
                    </td>
                    <td className="py-3 text-right font-medium text-green-600">
                      K{teacher.total_earnings?.toFixed(2) || "0.00"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Popular Content */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Most Viewed Content</h2>
          {stats.popularContent.length === 0 ? (
            <p className="text-slate-500 text-sm">No content data yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="pb-2">Content</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Views</th>
                  <th className="pb-2">Completions</th>
                  <th className="pb-2">Rating</th>
                </tr>
              </thead>
              <tbody>
                {stats.popularContent.map((content, i) => (
                  <tr key={content.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{content.title}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        content.type === 'youtube' ? 'bg-red-100 text-red-700' :
                        content.type === 'video' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {content.type}
                      </span>
                    </td>
                    <td className="py-3">{content.views}</td>
                    <td className="py-3">{content.completions}</td>
                    <td className="py-3">
                      <span className="text-amber-500">★</span> {content.avg_rating?.toFixed(1) || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pay Teachers Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Teacher Payouts</h2>
            <Link href="/admin/earnings" className="text-sm text-primary-600 hover:underline">
              Manage Payouts →
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            Calculate and process monthly payments for teachers based on content created and engagement.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Pending Payouts</div>
              <div className="text-xl font-bold">K{stats.topTeachers.reduce((sum, t) => sum + (t.total_earnings || 0), 0).toFixed(2)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-green-600">Paid This Month</div>
              <div className="text-xl font-bold text-green-600">K0.00</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-600">Total Earnings Ever</div>
              <div className="text-xl font-bold text-blue-600">K{stats.topTeachers.reduce((sum, t) => sum + (t.total_earnings || 0), 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
