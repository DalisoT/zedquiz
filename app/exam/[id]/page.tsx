"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Exam {
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

export default function ExamDetailPage() {
  const params = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    fetch(`/api/exams/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.exam) {
          setExam(data.exam);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const startExam = async () => {
    if (!exam) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/questions/random?class_id=${exam.class_id}&subject_id=${exam.subject_id}&limit=${exam.question_count}`);
      const data = await res.json();
      if (data.questions?.length > 0) {
        sessionStorage.setItem('currentExam', JSON.stringify(data.questions));
        sessionStorage.setItem('examTimeLeft', exam.time_limit_seconds.toString());
        window.location.href = `/exam/${exam.id}/active`;
      } else {
        alert('No questions available for this exam yet.');
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

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Exam not found</p>
          <Link href="/student/exams" className="text-primary-600 mt-2 inline-block">← Back to Exams</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <Link href="/student/exams" className="text-white text-sm">← Back</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <h1 className="text-xl font-bold text-slate-800 mb-2">{exam.title}</h1>
          {exam.description && <p className="text-slate-500 mb-4">{exam.description}</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">{exam.classes?.name}</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">{exam.subjects?.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-primary-600">{exam.question_count}</div>
              <div className="text-xs text-slate-500">Questions</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-primary-600">{Math.floor(exam.time_limit_seconds / 60)}</div>
              <div className="text-xs text-slate-500">Minutes</div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-800 text-sm">⚠️ This is a full exam simulation. You must submit all answers at once when time runs out. No going back to previous questions!</p>
        </div>

        <button
          onClick={startExam}
          disabled={starting}
          className="w-full bg-red-600 text-white font-bold py-4 rounded-xl disabled:opacity-50"
        >
          {starting ? 'Loading...' : 'Start Exam'}
        </button>
      </main>
    </div>
  );
}