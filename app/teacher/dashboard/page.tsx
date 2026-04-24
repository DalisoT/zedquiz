"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  class_id: string;
  subject_id: string;
  is_published: boolean;
  question_count: number;
  created_at: string;
}

interface Exam {
  id: string;
  title: string;
  class_id: string;
  subject_id: string;
  is_published: boolean;
  question_count: number;
  created_at: string;
}

export default function TeacherDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUserName(data.profile?.full_name || "Teacher");
      })
      .catch(() => setUserName("Teacher"));

    fetch("/api/quizzes")
      .then((res) => res.json())
      .then((data) => setQuizzes(data.quizzes || []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));

    fetch("/api/exams")
      .then((res) => res.json())
      .then((data) => setExams(data.exams || []))
      .catch(() => setExams([]));
  }, []);

  const publishedQuizzes = quizzes.filter((q) => q.is_published).length;
  const draftQuizzes = quizzes.filter((q) => !q.is_published).length;
  const publishedExams = exams.filter((e) => e.is_published).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">Teacher Dashboard</h1>
          <p className="text-primary-200 text-sm">Welcome, {userName}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">{quizzes.length}</div>
            <div className="text-xs text-slate-500">Total Quizzes</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{publishedQuizzes}</div>
            <div className="text-xs text-slate-500">Published</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{draftQuizzes}</div>
            <div className="text-xs text-slate-500">Drafts</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-slate-800">Create New</h2>
          <Link
            href="/teacher/question-bank"
            className="block w-full bg-blue-600 text-white text-center py-3 rounded-xl font-medium"
          >
            📚 Question Bank
          </Link>
          <Link
            href="/teacher/quizzes/new"
            className="block w-full bg-primary-600 text-white text-center py-3 rounded-xl font-medium"
          >
            + New Quiz
          </Link>
          <Link
            href="/teacher/exams/new"
            className="block w-full bg-slate-100 text-slate-800 text-center py-3 rounded-xl font-medium"
          >
            + New Exam
          </Link>
          <Link
            href="/teacher/subjects"
            className="block w-full bg-slate-100 text-slate-800 text-center py-3 rounded-xl font-medium"
          >
            📚 Manage Subjects
          </Link>
          <Link
            href="/teacher/marking-keys/new"
            className="block w-full bg-slate-100 text-slate-800 text-center py-3 rounded-xl font-medium"
          >
            + Submit Marking Key
          </Link>
          <Link
            href="/teacher/papers"
            className="block w-full bg-orange-500 text-white text-center py-3 rounded-xl font-medium"
          >
            📚 Import ECZ Papers
          </Link>
          <Link
            href="/teacher/downloads"
            className="block w-full bg-blue-500 text-white text-center py-3 rounded-xl font-medium"
          >
            📥 Upload Past Papers (PDF)
          </Link>
          <Link
            href="/teacher/practice-papers"
            className="block w-full bg-purple-600 text-white text-center py-3 rounded-xl font-medium"
          >
            📝 Practice Papers
          </Link>
        </div>

        {/* My Quizzes */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-slate-800">My Quizzes</h2>
            <Link href="/teacher/quizzes" className="text-primary-600 text-sm">
              View all
            </Link>
          </div>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : quizzes.length === 0 ? (
            <p className="text-slate-500 text-sm">No quizzes yet. Create your first!</p>
          ) : (
            <div className="space-y-2">
              {quizzes.slice(0, 3).map((quiz) => (
                <div key={quiz.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{quiz.title}</p>
                    <p className="text-xs text-slate-500">
                      {quiz.question_count} questions • {quiz.is_published ? "Published" : "Draft"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      quiz.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {quiz.is_published ? "Live" : "Draft"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Exams */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-slate-800">My Exams</h2>
            <Link href="/teacher/exams" className="text-primary-600 text-sm">
              View all
            </Link>
          </div>
          {exams.length === 0 ? (
            <p className="text-slate-500 text-sm">No exams yet. Create your first!</p>
          ) : (
            <div className="space-y-2">
              {exams.slice(0, 3).map((exam) => (
                <div key={exam.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{exam.title}</p>
                    <p className="text-xs text-slate-500">
                      {exam.question_count} questions • {exam.is_published ? "Published" : "Draft"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      exam.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {exam.is_published ? "Live" : "Draft"}
                  </span>
                </div>
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
