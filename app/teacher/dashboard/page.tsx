"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  class_id: string;
  subject_id: string;
  is_published: boolean;
  question_count: number;
  created_at: string;
  classes?: { name: string };
  subjects?: { name: string };
}

interface Exam {
  id: string;
  title: string;
  class_id: string;
  subject_id: string;
  is_published: boolean;
  question_count: number;
  created_at: string;
  classes?: { name: string };
  subjects?: { name: string };
}

interface TeacherStats {
  totalQuizzes: number;
  publishedQuizzes: number;
  draftQuizzes: number;
  totalExams: number;
  publishedExams: number;
  totalStudents: number;
  totalAttempts: number;
  avgScore: number;
}

interface User {
  id: string;
  email: string;
  profile?: { role: string; full_name: string };
}

export default function TeacherDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch auth user
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      if (!userData.user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      setUser(userData.user);

      // Fetch quizzes and exams in parallel
      const [quizzesRes, examsRes] = await Promise.all([
        fetch("/api/quizzes"),
        fetch("/api/exams"),
      ]);

      const quizzesData = await quizzesRes.json();
      const examsData = await examsRes.json();

      setQuizzes(quizzesData.quizzes || []);
      setExams(examsData.exams || []);

      // Calculate basic stats
      const publishedQuizzes = (quizzesData.quizzes || []).filter((q: Quiz) => q.is_published).length;
      const draftQuizzes = (quizzesData.quizzes || []).filter((q: Quiz) => !q.is_published).length;
      const publishedExams = (examsData.exams || []).filter((e: Exam) => e.is_published).length;

      setStats({
        totalQuizzes: (quizzesData.quizzes || []).length,
        publishedQuizzes,
        draftQuizzes,
        totalExams: (examsData.exams || []).length,
        publishedExams,
        totalStudents: 0, // Would need separate API call
        totalAttempts: 0,
        avgScore: 0,
      });

      setLastRefresh(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold">Teacher Dashboard</h1>
              <p className="text-primary-200 text-sm">
                Welcome, {user?.profile?.full_name || "Teacher"}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="bg-white/20 px-3 py-1 rounded text-sm hover:bg-white/30 transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm text-red-600 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-8 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.totalQuizzes}</div>
              <div className="text-xs text-slate-500">Total Quizzes</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.publishedQuizzes}</div>
              <div className="text-xs text-slate-500">Published</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.draftQuizzes}</div>
              <div className="text-xs text-slate-500">Drafts</div>
            </div>
          </div>
        )}

        {/* Last updated */}
        {!loading && !error && (
          <p className="text-xs text-slate-400 text-center">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        )}

        {/* Quick Actions - Organized */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Quick Actions</h2>

          {/* Assessments */}
          <div className="mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Assessments</p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/teacher/quizzes/new"
                className="bg-primary-600 text-white text-center py-3 rounded-xl font-medium text-sm"
              >
                + New Quiz
              </Link>
              <Link
                href="/teacher/exams/new"
                className="bg-slate-100 text-slate-800 text-center py-3 rounded-xl font-medium text-sm"
              >
                + New Exam
              </Link>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Content</p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/teacher/question-bank"
                className="bg-blue-600 text-white text-center py-3 rounded-xl font-medium text-sm"
              >
                📚 Questions
              </Link>
              <Link
                href="/teacher/papers"
                className="bg-orange-500 text-white text-center py-3 rounded-xl font-medium text-sm"
              >
                📚 ECZ Papers
              </Link>
            </div>
          </div>

          {/* Management */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Management</p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/teacher/subjects"
                className="bg-slate-100 text-slate-800 text-center py-3 rounded-xl font-medium text-sm"
              >
                📚 Subjects
              </Link>
              <Link
                href="/teacher/downloads"
                className="bg-blue-500 text-white text-center py-3 rounded-xl font-medium text-sm"
              >
                📥 Downloads
              </Link>
            </div>
          </div>
        </div>

        {/* My Quizzes */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-slate-800">My Quizzes</h2>
            <Link href="/teacher/quizzes" className="text-primary-600 text-sm hover:underline">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse p-3 bg-slate-50 rounded-lg">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-slate-500 text-sm">No quizzes yet</p>
              <Link
                href="/teacher/quizzes/new"
                className="mt-2 inline-block text-primary-600 text-sm hover:underline"
              >
                Create your first quiz →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {quizzes.slice(0, 5).map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/teacher/quizzes/${quiz.id}/edit`}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                >
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{quiz.title}</p>
                    <p className="text-xs text-slate-500">
                      {quiz.question_count} questions • {quiz.classes?.name || "No class"} • {quiz.subjects?.name || "No subject"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      quiz.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {quiz.is_published ? "Live" : "Draft"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Exams */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-slate-800">My Exams</h2>
            <Link href="/teacher/exams" className="text-primary-600 text-sm hover:underline">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse p-3 bg-slate-50 rounded-lg">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-slate-500 text-sm">No exams yet</p>
              <Link
                href="/teacher/exams/new"
                className="mt-2 inline-block text-primary-600 text-sm hover:underline"
              >
                Create your first exam →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {exams.slice(0, 5).map((exam) => (
                <Link
                  key={exam.id}
                  href={`/teacher/exams/${exam.id}/edit`}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                >
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{exam.title}</p>
                    <p className="text-xs text-slate-500">
                      {exam.question_count} questions • {exam.classes?.name || "No class"} • {exam.subjects?.name || "No subject"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      exam.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {exam.is_published ? "Live" : "Draft"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Profile Link */}
        <Link
          href="/teacher/profile"
          className="block w-full bg-slate-100 text-slate-800 text-center py-3 rounded-xl font-medium"
        >
          Edit My Profile
        </Link>
      </main>
    </div>
  );
}
