"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setMessage({ type: "success", text: "Password reset email sent! Check your inbox." });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to send reset email" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">Check Your Email</h1>
            <p className="text-slate-500 text-sm mb-6">
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-slate-500 text-xs mb-6">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button onClick={() => { setSubmitted(false); setMessage(null); }}
                className="text-primary-600 font-medium">
                try again
              </button>
            </p>
            <Link href="/login" className="text-primary-600 font-medium text-sm">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔑</div>
            <h1 className="text-2xl font-bold text-slate-800">Reset Password</h1>
            <p className="text-slate-500 text-sm mt-2">Enter your email to receive a reset link</p>
          </div>

          {message && (
            <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-600"
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:outline-none"
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-4">
            Remember your password?{" "}
            <Link href="/login" className="text-primary-600 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
