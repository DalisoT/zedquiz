"use client";

import { useState, useEffect } from "react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points?: number;
  earned: boolean;
  earned_at: string | null;
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/badges")
      .then(res => res.json())
      .then(data => {
        setBadges(data.badges || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const earnedBadges = badges.filter(b => b.earned);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">My Badges</h1>
          <p className="text-primary-200 text-sm">{earnedBadges.length} of {badges.length} earned</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {loading ? (
          <p className="text-slate-500 text-center">Loading...</p>
        ) : (
          <div className="space-y-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`bg-white rounded-xl p-4 flex items-center gap-4 ${
                  badge.earned ? '' : 'opacity-50'
                }`}
              >
                <div className="text-4xl">{badge.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{badge.name}</p>
                  <p className="text-sm text-slate-500">{badge.description}</p>
                  {badge.earned && badge.earned_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Earned {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {badge.earned ? (
                  <span className="text-green-600 text-2xl">✓</span>
                ) : (
                  <span className="text-slate-300 text-2xl">🔒</span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}