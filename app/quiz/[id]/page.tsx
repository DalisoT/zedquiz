"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  answer_type: string;
  marks: number;
  difficulty: string;
}

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    fetch(`/api/quizzes/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.quiz) {
          setQuiz(data.quiz);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const startQuiz = async () => {
    if (!quiz) return;
    setStarting(true);
    // Fetch random questions for this quiz's class/subject
    try {
      const res = await fetch(`/api/questions/random?class_id=${quiz.class_id}&subject_id=${quiz.subject_id}&limit=${quiz.question_count}`);
      const data = await res.json();
      if (data.questions?.length > 0) {
        sessionStorage.setItem('currentQuiz', JSON.stringify(data.questions));
        router.push(`/quiz/${quiz.id}/active`);
      } else {
        alert('No questions available for this quiz yet.');
        setStarting(false);
      }
    } catch {
      alert('Failed to load questions');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Quiz not found</p>
          <Link href="/student/quizzes" className="text-primary-600 mt-2 inline-block">← Back to Quizzes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <Link href="/student/quizzes" className="text-white text-sm">← Back</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <h1 className="text-xl font-bold text-slate-800 mb-2">{quiz.title}</h1>
          {quiz.description && <p className="text-slate-500 mb-4">{quiz.description}</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">{quiz.classes?.name}</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">{quiz.subjects?.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-primary-600">{quiz.question_count}</div>
              <div className="text-xs text-slate-500">Questions</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-primary-600">{Math.floor(quiz.time_limit_seconds / 60)}</div>
              <div className="text-xs text-slate-500">Minutes</div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-amber-800 text-sm">⏱️ This is a timed quiz. Once you start, the timer will run until you complete all questions or time runs out.</p>
        </div>

        <button
          onClick={startQuiz}
          disabled={starting}
          className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl disabled:opacity-50"
        >
          {starting ? 'Loading...' : 'Start Quiz'}
        </button>
      </main>
    </div>
  );
}