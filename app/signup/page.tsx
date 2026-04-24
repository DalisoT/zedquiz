"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [levels, setLevels] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; level_id: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailConfirmationNeeded, setEmailConfirmationNeeded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/levels")
      .then((res) => res.json())
      .then((data) => {
        if (data.levels?.length > 0) {
          setLevels(data.levels);
          setSelectedLevel(data.levels[0].id);
          fetchClasses(data.levels[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchClasses = (levelId: string) => {
    fetch(`/api/classes?level_id=${levelId}`)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes || []);
        if (data.classes?.length > 0) {
          setSelectedClass(data.classes[0].id);
        }
      })
      .catch(() => {});
  };

  const handleLevelChange = (levelId: string) => {
    setSelectedLevel(levelId);
    fetchClasses(levelId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!selectedClass) {
      setError("Please select your grade level");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          grade_level: selectedClass
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      // If no session returned, email confirmation is required
      if (!data.session) {
        setEmailConfirmationNeeded(true);
        setLoading(false);
        return;
      }

      // Auto login after signup
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.ok) {
        router.push("/dashboard");
      } else {
        router.push("/login");
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
            <h1 className="text-2xl font-bold text-slate-800">Join ZedQuiz</h1>
            <p className="text-slate-500 text-sm">ECZ Exam Preparation</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {emailConfirmationNeeded && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <p className="font-medium mb-1">📧 Check your email</p>
              <p>We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account, then sign in.</p>
            </div>
          )}

          {!emailConfirmationNeeded && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:outline-none"
                placeholder="John Banda"
                required
              />
            </div>

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
              <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:outline-none"
                required
              >
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Grade/Form</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:outline-none"
                required
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:outline-none"
                placeholder="Min. 6 characters"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
          )}

          {emailConfirmationNeeded && (
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ full_name: fullName, email, password, grade_level: selectedClass }),
                  });
                  if (res.ok) {
                    setEmailConfirmationNeeded(true);
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full text-primary-600 font-semibold py-3 rounded-xl border border-primary-600 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Resend confirmation email"}
            </button>
          )}

          <p className="text-center text-sm text-slate-600 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-600 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
