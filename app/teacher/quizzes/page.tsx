"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  class_id: string;
  subject_id: string;
  time_limit_seconds: number;
  question_count: number;
  is_published: boolean;
  created_at: string;
  classes?: { name: string };
  subjects?: { name: string };
}

export default function TeacherQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    fetchQuizzes();
  }, []);

  async function fetchQuizzes() {
    setLoading(true);
    try {
      const res = await fetch("/api/quizzes");
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch {
      setQuizzes([]);
    }
    setLoading(false);
  }

  const filteredQuizzes = quizzes.filter(q => {
    if (filter === "published") return q.is_published;
    if (filter === "draft") return !q.is_published;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/teacher/dashboard" className="text-white">← Back</Link>
            <h1 className="text-lg font-semibold">My Quizzes</h1>
            <Link href="/teacher/quizzes/new" className="text-white bg-white/20 px-3 py-1 rounded">
              + New
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          {(["all", "published", "draft"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === f ? "bg-primary-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Quizzes List */}
        {loading ? (
          <p className="text-slate-500 text-center">Loading...</p>
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">No quizzes found</p>
            <Link href="/teacher/quizzes/new" className="text-primary-600 text-sm mt-2 inline-block">
              Create your first quiz
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuizzes.map(quiz => (
              <div key={quiz.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{quiz.title}</h3>
                    <p className="text-sm text-slate-500">
                      {quiz.classes?.name} · {quiz.subjects?.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {quiz.question_count} questions · {quiz.time_limit_seconds / 60} min
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    quiz.is_published
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {quiz.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <Link
                  href={`/teacher/quizzes/${quiz.id}/edit`}
                  className="block w-full mt-3 bg-primary-600 text-white text-center py-2 rounded-lg text-sm font-medium"
                >
                  Edit Quiz
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
