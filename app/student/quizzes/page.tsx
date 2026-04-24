"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  description: string;
  class_id: string;
  subject_id: string;
  time_limit_seconds: number;
  question_count: number;
  is_published: boolean;
  created_at: string;
  classes: { name: string };
  subjects: { name: string };
}

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGrade, setUserGrade] = useState<string | null>(null);

  useEffect(() => {
    // Get user's grade level
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile?.grade_level) {
          setUserGrade(data.profile.grade_level);
        }
      })
      .catch(() => {});

    // Fetch all published quizzes
    fetch("/api/quizzes")
      .then((res) => res.json())
      .then((data) => {
        setQuizzes(data.quizzes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const publishedQuizzes = quizzes.filter((q) => q.is_published);

  // Filter by user's grade level if they have one
  const filteredQuizzes = userGrade
    ? publishedQuizzes.filter((q) => q.class_id === userGrade)
    : publishedQuizzes;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">Available Quizzes</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {loading ? (
          <p className="text-slate-500 text-center">Loading...</p>
        ) : filteredQuizzes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No quizzes available yet.</p>
            <p className="text-slate-400 text-sm mt-2">Check back soon!</p>
          </div>
        ) : (
          filteredQuizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/quiz/${quiz.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-800">{quiz.title}</p>
                  {quiz.description && (
                    <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                      {quiz.classes?.name}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {quiz.subjects?.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {quiz.question_count} questions • {Math.floor(quiz.time_limit_seconds / 60)} min
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
