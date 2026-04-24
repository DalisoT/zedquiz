"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { markAnswer, MarkingResult } from "@/lib/groqClient";
import { getRandomQuestion, Question } from "@/lib/supabaseClient";

interface ExamQuestion extends Question {
  userAnswer: string;
  result?: MarkingResult;
  visited: boolean;
}

const QUESTION_COUNT = 10;
const TOTAL_TIME = 30 * 60;

export default function ExamPage() {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [status, setStatus] = useState<"loading" | "active" | "results">("loading");

  const loadQuestions = useCallback(async () => {
    const qs: ExamQuestion[] = [];
    for (let i = 0; i < QUESTION_COUNT; i++) {
      const q = await getRandomQuestion("default-class", "default-subject");
      if (q) qs.push({ ...q, userAnswer: "", visited: false });
    }
    qs[0].visited = true;
    setQuestions(qs);
    setStatus("active");
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (status !== "active") return;
    if (timeLeft <= 0) {
      setStatus("results");
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const handleFinish = async () => {
    const unanswered = questions.filter(q => !q.userAnswer.trim());
    if (unanswered.length > 0) {
      if (!confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) {
        return;
      }
    }

    setStatus("results");
    const updated = [...questions];
    for (const q of updated) {
      if (q.userAnswer) {
        const scheme = q.marking_scheme || [{ point: q.userAnswer, marks: q.marks }];
        const result = await markAnswer(q.question_text, q.userAnswer, scheme, q.answer_type, q.difficulty_level, "");
        q.result = result;
      }
    }
    setQuestions(updated);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const current = questions[currentIndex];

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-primary-600 text-xl">Loading exam...</div>
      </div>
    );
  }

  if (status === "results") {
    const totalScore = questions.reduce((sum, q) => sum + (q.result?.score || 0), 0);
    const maxScore = questions.reduce((sum, q) => sum + (q.result?.maxScore || q.marks), 0);
    const correct = questions.filter(q => q.result && q.result.score === q.result.maxScore).length;
    const percentage = Math.round((correct / QUESTION_COUNT) * 100);

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-primary-600 text-white p-4">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-xl font-semibold">Exam Results</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto p-4 space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-4xl mb-2">{percentage >= 70 ? "🎉" : percentage >= 50 ? "👍" : "📚"}</div>
            <div className="text-3xl font-bold text-slate-800">{percentage}%</div>
            <p className="text-slate-600">{correct}/{QUESTION_COUNT} questions correct</p>
            <div className="mt-4 text-lg font-semibold text-primary-600">
              Total Score: {totalScore}/{maxScore}
            </div>
          </div>

          {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-slate-500">Q{i + 1}</span>
                <span className={`text-sm font-medium ${q.result && q.result.score === q.result.maxScore ? "text-green-600" : "text-red-600"}`}>
                  {q.result ? `${q.result.score}/${q.result.maxScore}` : "Not answered"}
                </span>
              </div>
              <p className="text-slate-800 font-medium">{q.question_text}</p>
              {q.userAnswer && <p className="text-sm mt-2 text-slate-600">Your answer: {q.userAnswer}</p>}
              {q.result && (
                <div className={`mt-2 text-sm ${q.result.score === q.result.maxScore ? "text-green-600" : "text-amber-600"}`}>
                  {q.result.feedback}
                </div>
              )}
            </div>
          ))}

          <Link href="/" className="block w-full bg-primary-600 text-white text-center font-semibold py-4 rounded-xl">
            Back to Home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-white">✕</Link>
          <h1 className="text-lg font-semibold">Exam Simulation</h1>
          <span className={`font-bold ${timeLeft <= 300 ? "text-red-400" : "text-primary-200"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </header>

      <div className="bg-slate-100 p-2 flex gap-2 justify-center flex-wrap">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentIndex(i);
              const updated = [...questions];
              updated[i].visited = true;
              setQuestions(updated);
            }}
            className={`w-8 h-8 rounded-full text-sm font-medium flex items-center justify-center
              ${i === currentIndex ? "bg-primary-600 text-white" : q.visited ? (q.userAnswer ? "bg-green-500 text-white" : "bg-amber-500 text-white") : "bg-slate-300 text-slate-600"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        {current && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-slate-800 font-medium">{current.question_text}</p>
              <div className="flex justify-between text-sm text-slate-500 mt-2">
                <span>Type: {current.answer_type}</span>
                <span>Marks: {current.marks}</span>
              </div>
            </div>

            <textarea
              value={current.userAnswer}
              onChange={(e) => {
                const updated = [...questions];
                updated[currentIndex].userAnswer = e.target.value;
                setQuestions(updated);
              }}
              placeholder="Type your answer..."
              className="w-full p-4 rounded-xl border border-slate-300 h-40 resize-none"
            />
          </>
        )}
      </main>

      <div className="max-w-lg mx-auto w-full p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex-1 bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            ← Previous
          </button>
          {currentIndex < QUESTION_COUNT - 1 ? (
            <button
              onClick={() => setCurrentIndex(i => i + 1)}
              className="flex-1 bg-primary-600 text-white font-semibold py-3 rounded-xl"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-xl"
            >
              Submit Exam
            </button>
          )}
        </div>
      </div>
    </div>
  );
}