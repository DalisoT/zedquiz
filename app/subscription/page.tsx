"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Tier {
  id: string;
  name: string;
  price_kwacha: string;
  yearly_price_kwacha: string;
  features: Record<string, boolean>;
  is_active: boolean;
}

interface CurrentSubscription {
  tier_id: string;
  status: string;
  expires_at: string;
}

const featureLabels: Record<string, string> = {
  daily_free_quiz: "1 Free Quiz/Day",
  quizzes_per_day: "Quizzes Per Day",
  quizzes_per_subject_per_day: "1 Quiz/Subject/Day",
  study_materials: "Study Materials",
  ecz_papers: "ECZ Past Papers",
  video_lessons: "Video Lessons",
  audio_lessons: "Audio Lessons",
  topic_quizzes: "Topic-Based Quizzes",
  simulated_exams: "Simulated Exams",
  tutorial_requests: "Request Custom Tutorials",
  online_classes: "Online Classes with Teacher",
};

const tierColors: Record<string, string> = {
  free: "bg-slate-100 border-slate-300",
  starter: "bg-blue-50 border-blue-300",
  pro: "bg-purple-50 border-purple-300",
  premium: "bg-amber-50 border-amber-300",
};

export default function SubscriptionPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentTier, setCurrentTier] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    fetchTiers();
    fetchCurrentSubscription();
  }, []);

  async function fetchTiers() {
    try {
      const res = await fetch("/api/subscription/tiers");
      const data = await res.json();
      if (data.tiers) setTiers(data.tiers);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchCurrentSubscription() {
    try {
      const res = await fetch("/api/subscription/me");
      const data = await res.json();
      if (data.subscription) setCurrentTier(data.subscription);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function subscribe(tierId: string) {
    if (tierId === "free") {
      alert("Free tier is automatically assigned to all users.");
      return;
    }
    // For now, redirect to a placeholder - payment integration would go here
    alert(`Payment integration for ${tierId} tier coming soon. Contact admin to subscribe.`);
  }

  function isCurrentTier(tierId: string) {
    return currentTier?.tier_id === tierId && currentTier?.status === "active";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Subscription Plans</h1>
              <p className="text-primary-200 text-sm">Choose the plan that fits your learning needs</p>
            </div>
            <Link href="/dashboard" className="text-sm bg-white/20 px-3 py-1 rounded">
              Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {currentTier && currentTier.status === "active" && currentTier.tier_id !== "free" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">
                  Current Plan: {tiers.find(t => t.id === currentTier.tier_id)?.name}
                </p>
                {currentTier.expires_at && (
                  <p className="text-sm text-green-600">
                    Expires: {new Date(currentTier.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Link href="/subscription/manage" className="text-sm text-primary-600 hover:underline">
                Manage →
              </Link>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-4">
          <div className="bg-white rounded-lg p-1 inline-flex">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                billingPeriod === "monthly" ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                billingPeriod === "yearly" ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Yearly
              <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">-10%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {tiers.map((tier) => {
            const price = billingPeriod === "yearly" && tier.yearly_price_kwacha
              ? parseFloat(tier.yearly_price_kwacha).toFixed(0)
              : parseFloat(tier.price_kwacha).toFixed(0);
            const monthlyEquivalent = billingPeriod === "yearly" && tier.yearly_price_kwacha
              ? (parseFloat(tier.yearly_price_kwacha) / 12).toFixed(0)
              : null;

            return (
              <div
                key={tier.id}
                className={`rounded-xl border-2 p-6 ${tierColors[tier.id]} ${isCurrentTier(tier.id) ? "ring-2 ring-primary-500" : ""}`}
              >
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-slate-800">{tier.name}</h2>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-slate-800">K{price}</span>
                    {tier.price_kwacha !== "0.00" && (
                      <span className="text-slate-500">/{billingPeriod === "yearly" ? "year" : "month"}</span>
                    )}
                    {monthlyEquivalent && (
                      <p className="text-xs text-slate-400 mt-1">K{monthlyEquivalent}/mo equivalent</p>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {Object.entries(tier.features).map(([key, value]) => (
                    <li key={key} className={`text-sm flex items-center gap-2 ${value ? "text-slate-700" : "text-slate-400"}`}>
                      {value ? (
                        <span className="text-green-500">✓</span>
                      ) : (
                        <span className="text-slate-300">✗</span>
                      )}
                      {featureLabels[key] || key}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => subscribe(tier.id)}
                  disabled={isCurrentTier(tier.id)}
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    isCurrentTier(tier.id)
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : tier.id === "free"
                      ? "bg-slate-600 text-white hover:bg-slate-700"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {isCurrentTier(tier.id) ? "Current Plan" : tier.price_kwacha === "0.00" ? "Get Started" : "Subscribe"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 mb-3">Frequently Asked Questions</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-700">How do I cancel?</p>
              <p>Contact support or go to Manage Subscription. Your access continues until the billing period ends.</p>
            </div>
            <div>
              <p className="font-medium text-slate-700">Can I switch plans?</p>
              <p>Yes! Upgrade or downgrade anytime. Changes take effect on your next billing cycle.</p>
            </div>
            <div>
              <p className="font-medium text-slate-700">How do online classes work?</p>
              <p>Premium users can schedule 1-on-1 sessions with teachers. You'll need parent permission if under 18.</p>
            </div>
          </div>
        </div>

        {/* Referral CTA */}
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl p-6 text-center text-white">
          <div className="text-3xl mb-2">🎁</div>
          <h3 className="text-lg font-bold mb-1">Don't Want to Pay?</h3>
          <p className="text-amber-100 text-sm mb-3">Refer friends and unlock free premium access!</p>
          <Link href="/referral" className="inline-block bg-white text-amber-600 px-6 py-2 rounded-lg font-medium hover:bg-amber-50 transition">
            Get Referral Link →
          </Link>
        </div>
      </main>
    </div>
  );
}
