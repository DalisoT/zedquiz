"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  options: { A: string; B: string; C: string; D: string };
  difficulty: string;
  topic_name?: string;
}

interface ExamAnswer {
  question_id: string;
  answer_text: string;
}

export default function ExamActivePage() {
  const params = useParams();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState<"loading" | "active" | "results">("loading");
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ correct: boolean; explanation: string }[]>([]);

  const examId = params.id as string;

  const loadFromStorage = useCallback(() => {
    const stored = sessionStorage.getItem('currentExam');
    if (stored) {
      const qs = JSON.parse(stored);
      setQuestions(qs);
      setStatus("active");
    } else {
      setStatus("loading");
    }
  }, []);

  useEffect(() => {
    fetch(`/api/exams/${examId}`)
      .then(res => res.json())
      .then(data => {
        if (data.exam) {
          setTimeLeft(data.exam.time_limit_seconds);
        }
      });

    loadFromStorage();
  }, [examId, loadFromStorage]);

  useEffect(() => {
    if (status !== "active") return;
    if (timeLeft <= 0) {
      handleFinish();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const handleFinish = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const answerList: ExamAnswer[] = [];
      answers.forEach((text, questionId) => {
        answerList.push({ question_id: questionId, answer_text: text });
      });

      const res = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerList }),
      });
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch {}

    setStatus("results");
    setSubmitting(false);
    sessionStorage.removeItem('currentExam');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const current = questions[currentIndex];
  const currentAnswer = current ? (answers.get(current.id) || '') : '';
  const unansweredCount = questions.length - answers.size;

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading exam...</p>
      </div>
    );
  }

  if (status === "results") {
    const correct = results.filter(r => r.correct).length;
    const percentage = Math.round((correct / Math.max(questions.length, 1)) * 100);

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-red-600 text-white p-4">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-xl font-semibold">Exam Complete!</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto p-4 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-4xl mb-2">{percentage >= 70 ? "🎉" : percentage >= 50 ? "👍" : "📚"}</div>
            <div className="text-3xl font-bold text-slate-800">{percentage}%</div>
            <p className="text-slate-600">{correct}/{questions.length} questions correct</p>
          </div>

          {questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-slate-500">Question {i + 1}</span>
                {results[i] && (
                  <span className={`text-sm font-medium ${results[i].correct ? 'text-green-600' : 'text-red-600'}`}>
                    {results[i].correct ? '✅ Correct' : '❌ Incorrect'}
                  </span>
                )}
              </div>
              <p className="text-slate-800 font-medium">{q.question_text}</p>

              <div className="mt-3 space-y-1">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <div key={opt} className={`text-sm p-2 rounded ${
                    opt === 'A' ? 'bg-blue-50 text-blue-800' :
                    opt === 'B' ? 'bg-green-50 text-green-800' :
                    opt === 'C' ? 'bg-amber-50 text-amber-800' :
                    'bg-purple-50 text-purple-800'
                  }`}>
                    {opt}. {q.options[opt as keyof typeof q.options]}
                  </div>
                ))}
              </div>

              {answers.get(q.id) && (
                <p className="text-sm mt-2 text-slate-600">Your answer: {answers.get(q.id)}</p>
              )}
              {results[i] && (
                <p className="text-sm mt-2 text-slate-600">{results[i].explanation}</p>
              )}
            </div>
          ))}

          <a href="/student/exams" className="block w-full bg-red-600 text-white text-center font-semibold py-4 rounded-xl">
            Back to Exams
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {unansweredCount > 0 && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
          ⚠️ {unansweredCount} question{unansweredCount > 1 ? 's' : ''} unanswered
        </div>
      )}

      <header className="bg-red-600 text-white p-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div />
          <h1 className="text-lg font-semibold">Exam</h1>
          <span className={`font-bold ${timeLeft <= 300 ? 'text-red-400 animate-pulse' : 'text-red-200'}`}>
            {timeLeft <= 300 && '⏰ '}{formatTime(timeLeft)}
          </span>
        </div>
      </header>

      <div className="bg-slate-100 p-2">
        <div className="max-w-lg mx-auto flex flex-wrap gap-1 justify-center">
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => answers.has(q.id) && i >= currentIndex ? setCurrentIndex(i) : null}
              disabled={!answers.has(q.id) && i !== currentIndex}
              className={`w-8 h-8 rounded text-sm font-medium ${
                i === currentIndex
                  ? 'bg-red-600 text-white'
                  : answers.has(q.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        {current && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  current.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  current.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {current.difficulty}
                </span>
                {current.topic_name && (
                  <span className="text-xs text-slate-500">{current.topic_name}</span>
                )}
                <span className="text-xs text-slate-400 ml-auto">Question {currentIndex + 1} of {questions.length}</span>
              </div>
              <p className="text-slate-800 text-lg">{current.question_text}</p>
              {current.image_url && (
                <img src={current.image_url} alt="Question" className="max-w-full rounded-lg mt-3" />
              )}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
              {['A', 'B', 'C', 'D'].map(opt => (
                <div
                  key={opt}
                  onClick={() => setAnswers(prev => new Map(prev).set(current.id, opt))}
                  className={`p-3 rounded-lg border cursor-pointer ${
                    currentAnswer === opt
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-red-300'
                  }`}
                >
                  <span className={`font-semibold mr-2 ${
                    opt === 'A' ? 'text-blue-600' :
                    opt === 'B' ? 'text-green-600' :
                    opt === 'C' ? 'text-amber-600' :
                    'text-purple-600'
                  }`}>{opt}.</span>
                  <span className="text-slate-700">{current.options[opt as keyof typeof current.options]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <div className="max-w-lg mx-auto w-full p-4">
        <div className="flex gap-2">
          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => {
                if (!currentAnswer) {
                  alert('Please select an answer before proceeding');
                  return;
                }
                setCurrentIndex(i => i + 1);
              }}
              className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-xl"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          )}
        </div>
        {unansweredCount > 0 && (
          <p className="text-center text-xs text-slate-500 mt-2">
            {unansweredCount} unanswered - will be marked wrong
          </p>
        )}
      </div>
    </div>
  );
}
