"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface PracticePaper {
  id: string;
  title: string;
  description: string;
  class_id: string;
  subject_id: string;
  time_limit_minutes: number;
  question_count: number;
  difficulty: string;
  is_exam_simulation: boolean;
  status: string;
  classes: { name: string };
  subjects: { name: string };
  teacher: { full_name: string };
}

export default function PracticePaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [paper, setPaper] = useState<PracticePaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    fetch(`/api/practice-papers/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.paper) {
          setPaper(data.paper);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const startPractice = async () => {
    if (!paper) return;
    setStarting(true);

    try {
      // Fetch the practice paper with its questions
      const res = await fetch(`/api/practice-papers/${paper.id}`);
      const data = await res.json();

      if (data.questions?.length > 0) {
        // Store questions in sessionStorage
        const questionsForPractice = data.questions.map((pq: any) => ({
          id: pq.question.id,
          question_text: pq.question.question_text,
          options: pq.question.options,
          image_url: pq.question.image_url,
          difficulty: pq.question.difficulty,
          topic: pq.question.topics?.name,
          source_paper: pq.source_paper,
        }));
        sessionStorage.setItem('currentPractice', JSON.stringify(questionsForPractice));
        sessionStorage.setItem('practicePaperId', paper.id);
        sessionStorage.setItem('practiceExamMode', paper.is_exam_simulation ? 'true' : 'false');
        router.push(`/practice/${paper.id}/active`);
      } else {
        alert('No questions found in this practice paper.');
        setStarting(false);
      }
    } catch {
      alert('Failed to load practice paper');
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

  if (!paper) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Practice paper not found</p>
          <Link href="/student/practice" className="text-primary-600 mt-2 inline-block">← Back to Practice</Link>
        </div>
      </div>
    );
  }

  if (paper.status !== 'published') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">This practice paper is not available yet.</p>
          <Link href="/student/practice" className="text-primary-600 mt-2 inline-block">← Back to Practice</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-purple-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <Link href="/student/practice" className="text-white text-sm">← Back</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <h1 className="text-xl font-bold text-slate-800 mb-2">{paper.title}</h1>
          {paper.description && <p className="text-slate-500 mb-4">{paper.description}</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">{paper.classes?.name}</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">{paper.subjects?.name}</span>
            {paper.is_exam_simulation && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">Exam Simulation</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{paper.question_count}</div>
              <div className="text-xs text-slate-500">Questions</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{paper.time_limit_minutes}</div>
              <div className="text-xs text-slate-500">Minutes</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600 capitalize">{paper.difficulty}</div>
              <div className="text-xs text-slate-500">Level</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400">
            Created by: {paper.teacher?.full_name || 'Teacher'}
          </div>
        </div>

        {paper.is_exam_simulation ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-800 text-sm">⚠️ This is an exam simulation. Once you start, you cannot go back and the timer cannot be paused. Your answers will be auto-submitted when time expires.</p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-amber-800 text-sm">📝 This is a practice paper. You can navigate between questions freely and take your time.</p>
          </div>
        )}

        <button
          onClick={startPractice}
          disabled={starting}
          className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl disabled:opacity-50"
        >
          {starting ? 'Loading...' : paper.is_exam_simulation ? 'Start Exam' : 'Start Practice'}
        </button>
      </main>
    </div>
  );
}
