"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Exam {
  id: string;
  title: string;
  class_id: string;
  subject_id: string;
  time_limit_seconds: number;
  question_count: number;
  is_published: boolean;
  requires_marking_key: boolean;
  created_at: string;
  classes?: { name: string };
  subjects?: { name: string };
}

export default function TeacherExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    fetchExams();
  }, []);

  async function fetchExams() {
    setLoading(true);
    try {
      const res = await fetch("/api/exams");
      const data = await res.json();
      setExams(data.exams || []);
    } catch {
      setExams([]);
    }
    setLoading(false);
  }

  const filteredExams = exams.filter(e => {
    if (filter === "published") return e.is_published;
    if (filter === "draft") return !e.is_published;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-red-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/teacher/dashboard" className="text-white">← Back</Link>
            <h1 className="text-lg font-semibold">My Exams</h1>
            <Link href="/teacher/exams/new" className="text-white bg-white/20 px-3 py-1 rounded">
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
                filter === f ? "bg-red-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700">
            ⚠️ Exams require a marking key for marking. Submit one after publishing.
          </p>
        </div>

        {/* Exams List */}
        {loading ? (
          <p className="text-slate-500 text-center">Loading...</p>
        ) : filteredExams.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">No exams found</p>
            <Link href="/teacher/exams/new" className="text-red-600 text-sm mt-2 inline-block">
              Create your first exam
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExams.map(exam => (
              <div key={exam.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{exam.title}</h3>
                    <p className="text-sm text-slate-500">
                      {exam.classes?.name} · {exam.subjects?.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {exam.question_count} questions · {exam.time_limit_seconds / 60} min
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    exam.is_published
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {exam.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <Link
                  href={`/teacher/exams/${exam.id}/edit`}
                  className="block w-full mt-3 bg-red-600 text-white text-center py-2 rounded-lg text-sm font-medium"
                >
                  Edit Exam
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
