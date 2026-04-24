"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Small delay to ensure cookies are set
      await new Promise(r => setTimeout(r, 100));

      // Redirect based on role
      if (data.user) {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        const role = meData.profile?.role || "student";

        if (role === "admin" || role === "super_admin") {
          router.push("/admin/dashboard");
        } else if (role === "teacher") {
          router.push("/teacher/dashboard");
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📚</div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
            <p className="text-slate-500 text-sm">Sign in to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary-600 font-medium">
              Sign up
            </Link>
          </p>

          <p className="text-center text-sm text-slate-500 mt-2">
            Forgot your password?{" "}
            <Link href="/forgot-password" className="text-primary-600 font-medium">
              Reset it
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
