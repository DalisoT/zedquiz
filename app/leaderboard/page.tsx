"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  total_points: number;
  streak_days: number;
  rank?: number;
  class_name?: string;
  level_name?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  total_points: number;
  streak_days: number;
  grade_level: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "week" | "month">("all");

  useEffect(() => {
    fetchUserAndLeaderboard();
  }, [filter]);

  async function fetchUserAndLeaderboard() {
    setLoading(true);

    // Fetch current user
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.profile) {
        setUser({
          id: meData.user.id,
          full_name: meData.profile.full_name,
          total_points: meData.profile.total_points || 0,
          streak_days: meData.profile.streak_days || 0,
          grade_level: meData.profile.grade_level
        });
      }
    } catch {}

    // Fetch leaderboard
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("period", filter);

      const res = await fetch(`/api/leaderboard?${params}`);
      const data = await res.json();
      setEntries(data.leaderboard || []);

      // Find user's rank
      if (user && data.leaderboard) {
        const rank = data.leaderboard.findIndex((e: any) => e.id === user.id);
        if (rank !== -1) {
          setUserRank(rank + 1);
        }
      }
    } catch {}

    setLoading(false);
  }

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Link href="/dashboard" className="text-white">← Back</Link>
            <h1 className="text-lg font-semibold">Leaderboard</h1>
            <div className="w-12" />
          </div>
          <p className="text-primary-200 text-sm text-center">Top students across Zambia</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Period Filter */}
        <div className="flex gap-2">
          {(["all", "week", "month"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                filter === f
                  ? "bg-primary-600 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              {f === "all" ? "🏆 All Time" : f === "week" ? "📅 This Week" : "📆 This Month"}
            </button>
          ))}
        </div>

        {/* User's Rank Card */}
        {user && userRank && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
            <p className="text-sm text-primary-600 font-medium">Your Ranking</p>
            <div className="flex items-center justify-between mt-1">
              <div>
                <span className="text-2xl font-bold text-primary-700">#{userRank}</span>
                <span className="text-slate-600 ml-2">{user.full_name}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary-600">{user.total_points.toLocaleString()}</p>
                <p className="text-xs text-primary-500">🔥 {user.streak_days} day streak</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading/Empty State */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-4xl mb-2">🏆</p>
            <p className="text-slate-500">No rankings yet</p>
            <p className="text-slate-400 text-sm mt-2">Be the first to top the leaderboard!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <div className="flex items-end justify-center gap-2 py-4">
                {/* 2nd Place */}
                {topThree[1] && (
                  <div className="flex-1 bg-slate-100 rounded-t-xl p-3 text-center order-2">
                    <div className="w-10 h-10 mx-auto bg-slate-400 rounded-full flex items-center justify-center text-white font-bold text-lg mb-1">
                      2
                    </div>
                    <p className="font-semibold text-slate-700 text-sm truncate">{topThree[1].full_name?.split(' ')[0]}</p>
                    <p className="text-lg font-bold text-slate-600">{topThree[1].total_points.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">🔥 {topThree[1].streak_days}</p>
                  </div>
                )}
                {/* 1st Place */}
                {topThree[0] && (
                  <div className="flex-1 bg-amber-50 rounded-t-xl p-4 text-center border-2 border-amber-300 order-1">
                    <div className="text-3xl mb-1">👑</div>
                    <div className="w-12 h-12 mx-auto bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-1">
                      1
                    </div>
                    <p className="font-bold text-amber-700 text-sm truncate">{topThree[0].full_name?.split(' ')[0]}</p>
                    <p className="text-2xl font-bold text-amber-600">{topThree[0].total_points.toLocaleString()}</p>
                    <p className="text-xs text-amber-600">🔥 {topThree[0].streak_days} streak</p>
                  </div>
                )}
                {/* 3rd Place */}
                {topThree[2] && (
                  <div className="flex-1 bg-orange-50 rounded-t-xl p-3 text-center order-3">
                    <div className="w-10 h-10 mx-auto bg-orange-400 rounded-full flex items-center justify-center text-white font-bold text-lg mb-1">
                      3
                    </div>
                    <p className="font-semibold text-orange-700 text-sm truncate">{topThree[2].full_name?.split(' ')[0]}</p>
                    <p className="text-lg font-bold text-orange-600">{topThree[2].total_points.toLocaleString()}</p>
                    <p className="text-xs text-orange-500">🔥 {topThree[2].streak_days}</p>
                  </div>
                )}
              </div>
            )}

            {/* Rest of Leaderboard */}
            {rest.length > 0 && (
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {rest.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                        {entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{entry.full_name}</p>
                        {entry.level_name && (
                          <p className="text-xs text-slate-500">{entry.level_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-700">{entry.total_points.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">🔥 {entry.streak_days}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="bg-primary-50 rounded-xl p-4 text-center">
          <p className="text-primary-700 font-medium">Want to climb the ranks?</p>
          <Link href="/dashboard" className="text-primary-600 text-sm hover:underline">
            Take a quiz to earn points →
          </Link>
        </div>
      </main>
    </div>
  );
}