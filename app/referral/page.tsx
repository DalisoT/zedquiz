"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ReferralStats {
  code: string;
  referrals_count: number;
  tier_earned: string | null;
  referrals: {
    id: string;
    referred_name: string;
    tier_at_signup: string;
    created_at: string;
  }[];
}

export default function ReferralPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  async function fetchReferralStats() {
    try {
      const res = await fetch("/api/referral/me");
      const data = await res.json();
      if (data.referral) setStats(data.referral);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!stats?.code) return;
    const link = `${window.location.origin}/signup?ref=${stats.code}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  const referralsNeeded = 5 - (stats?.referrals_count || 0);
  const progress = Math.min((stats?.referrals_count || 0) / 5, 1) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Referral Program</h1>
            <Link href="/dashboard" className="text-sm bg-white/20 px-3 py-1 rounded">Back</Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white text-center">
          <div className="text-4xl mb-2">🎁</div>
          <h2 className="text-xl font-bold mb-2">Unlock Free Premium!</h2>
          <p className="text-primary-100 text-sm">
            Refer 5 friends and get free access to the next tier
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Progress</span>
            <span className="font-medium">{stats?.referrals_count || 0}/5 referrals</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-primary-600 h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {referralsNeeded > 0 ? (
            <p className="text-xs text-slate-500 mt-2">
              {referralsNeeded} more referral{referralsNeeded > 1 ? "s" : ""} to unlock free tier
            </p>
          ) : (
            <p className="text-xs text-green-600 mt-2 font-medium">🎉 Reward unlocked! Check your subscription.</p>
          )}
        </div>

        {/* Share Link */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-3">Your Referral Link</h3>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${stats?.code || '...'}`}
              className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-sm"
            />
            <button
              onClick={copyLink}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
            >
              {copySuccess ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Share this link with friends. They'll get free access too!
          </p>
        </div>

        {/* Tier Rewards */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-3">How It Works</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <div>
                <p className="font-medium">Share your link</p>
                <p className="text-slate-500 text-xs">Copy your unique referral link and share it with friends</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <div>
                <p className="font-medium">Friends sign up</p>
                <p className="text-slate-500 text-xs">When they create an account using your link</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <div>
                <p className="font-medium">You unlock rewards</p>
                <p className="text-slate-500 text-xs">After 5 referrals, you get free access to the next tier!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Referrals */}
        {stats?.referrals && stats.referrals.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3">Your Referrals</h3>
            <div className="space-y-2">
              {stats.referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{ref.referred_name || "New User"}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(ref.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    ref.tier_at_signup === 'free' ? 'bg-slate-100 text-slate-600' :
                    ref.tier_at_signup === 'starter' ? 'bg-blue-100 text-blue-600' :
                    ref.tier_at_signup === 'pro' ? 'bg-purple-100 text-purple-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {ref.tier_at_signup}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="text-center text-xs text-slate-500">
          <p>Rewards are credited once 5 unique users sign up using your link.</p>
          <p>Users must confirm their email to count as a referral.</p>
          <p>Admin reserves the right to verify legitimate referrals.</p>
        </div>
      </main>
    </div>
  );
}
