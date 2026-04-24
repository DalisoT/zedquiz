"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { markAnswer, MarkingResult } from "@/lib/groqClient";
import { getRandomQuestion, Question } from "@/lib/supabaseClient";

interface QuizQuestion extends Question {
  userAnswer: string;
  result?: MarkingResult;
}

const QUESTION_COUNT = 5;
const TIME_PER_QUESTION = 30;

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [status, setStatus] = useState<"loading" | "active" | "results">("loading");
  const [streak, setStreak] = useState(0);

  const loadQuestions = useCallback(async () => {
    const qs: QuizQuestion[] = [];
    for (let i = 0; i < QUESTION_COUNT; i++) {
      const q = await getRandomQuestion("default-class", "default-subject");
      if (q) qs.push({ ...q, userAnswer: "" });
    }
    setQuestions(qs);
    setStatus("active");
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("zedquiz_streak");
    if (stored) setStreak(parseInt(stored));
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (status !== "active") return;
    if (timeLeft <= 0) {
      handleNext();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const handleNext = async () => {
    if (currentIndex < QUESTION_COUNT - 1) {
      setCurrentIndex(i => i + 1);
      setTimeLeft(TIME_PER_QUESTION);
    } else {
      setStatus("results");
    }
  };

  const handleFinish = async () => {
    const updated = [...questions];
    for (const q of updated) {
      if (!q.result && q.userAnswer) {
        const scheme = q.marking_scheme || [{ point: q.userAnswer, marks: q.marks }];
        const result = await markAnswer(q.question_text, q.userAnswer, scheme, q.answer_type, q.difficulty_level, "");
        q.result = result;
      }
    }
    setQuestions(updated);
    setStatus("results");

    const correct = updated.filter(q => q.result && q.result.score === q.result.maxScore).length;
    if (correct >= QUESTION_COUNT / 2) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("zedquiz_streak", newStreak.toString());
    }
  };

  const current = questions[currentIndex];

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-primary-600 text-xl">Loading quiz...</div>
      </div>
    );
  }

  if (status === "results") {
    const totalScore = questions.reduce((sum, q) => sum + (q.result?.score || 0), 0);
    const maxScore = questions.reduce((sum, q) => sum + (q.result?.maxScore || q.marks), 0);
    const correct = questions.filter(q => q.result && q.result.score === q.result.maxScore).length;

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-primary-600 text-white p-4">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-xl font-semibold">Quiz Complete!</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto p-4 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-3xl font-bold text-slate-800">{correct}/{QUESTION_COUNT}</div>
            <p className="text-slate-600">Questions Correct</p>
            <div className="mt-4 text-lg font-semibold text-primary-600">
              Score: {totalScore}/{maxScore}
            </div>
          </div>

          {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Question {i + 1}</div>
              <p className="text-slate-800 font-medium">{q.question_text}</p>
              <p className="text-sm mt-2 text-slate-600">Your answer: {q.userAnswer}</p>
              {q.result && (
                <p className="text-sm mt-1 text-primary-600">Score: {q.result.score}/{q.result.maxScore}</p>
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-white">✕</Link>
          <h1 className="text-lg font-semibold">Daily Quiz</h1>
          <span className="text-primary-200">🔥 {streak}</span>
        </div>
      </header>

      <div className="bg-slate-100 p-2 flex gap-2 justify-center">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${i === currentIndex ? "bg-primary-600" : "bg-slate-300"}`}
          />
        ))}
      </div>

      <div className={`p-4 text-center font-bold text-xl ${timeLeft <= 10 ? "text-red-500" : "text-slate-600"}`}>
        {timeLeft}s
      </div>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {current && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-slate-800 font-medium">{current.question_text}</p>
              <div className="text-sm text-slate-500 mt-2">Type: {current.answer_type}</div>
            </div>

            <textarea
              value={current.userAnswer}
              onChange={(e) => {
                const updated = [...questions];
                updated[currentIndex].userAnswer = e.target.value;
                setQuestions(updated);
              }}
              placeholder="Type your answer..."
              className="w-full p-4 rounded-xl border border-slate-300 h-32 resize-none"
            />
          </>
        )}

        <button
          onClick={currentIndex === QUESTION_COUNT - 1 ? handleFinish : handleNext}
          className="w-full bg-primary-600 text-white font-semibold py-4 rounded-xl touch-target"
        >
          {currentIndex === QUESTION_COUNT - 1 ? "Finish Quiz" : "Next Question"}
        </button>
      </main>
    </div>
  );
}