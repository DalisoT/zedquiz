"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "super_admin" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // First signup via public signup endpoint
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        setMessage({ type: "error", text: signupData.error || "Failed to signup" });
        setLoading(false);
        return;
      }

      // Then update role to admin using admin API
      const updateRes = await fetch("/api/admin/setup-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: signupData.user?.id, role: form.role }),
      });

      if (updateRes.ok) {
        setMessage({ type: "success", text: "Admin account created! Redirecting to login..." });
        setTimeout(() => router.push("/login"), 1500);
      } else {
        const updateData = await updateRes.json();
        setMessage({ type: "error", text: updateData.error || "Failed to set admin role" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to create admin account" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">ZedQuiz</h1>
          <p className="text-slate-600 mt-2">Initial Admin Setup</p>
        </div>

        {message && (
          <div className={`rounded-lg p-3 text-sm mb-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500"
              placeholder="Admin User"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500"
              placeholder="admin@zedquiz.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500"
              placeholder="Min. 6 characters"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            This account will be created as <strong>SUPER ADMIN</strong> with full access.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {loading ? "Creating..." : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
