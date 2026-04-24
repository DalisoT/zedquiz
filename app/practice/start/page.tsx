"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  answer_type: string;
  marks: number;
  difficulty: string;
  topic_name: string;
}

function PracticeStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get('class_id');
  const subjectId = searchParams.get('subject_id');
  const topicId = searchParams.get('topic_id');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);

  useEffect(() => {
    if (classId && subjectId) {
      fetchQuestions();
    } else {
      setLoading(false);
    }
  }, [classId, subjectId, topicId]);

  const fetchQuestions = async () => {
    try {
      const params = new URLSearchParams({ class_id: classId!, subject_id: subjectId! });
      if (topicId) params.append('topic_id', topicId);
      params.append('limit', '5');

      const res = await fetch(`/api/questions/random?${params.toString()}`);
      const data = await res.json();

      if (data.questions?.length > 0) {
        setQuestions(data.questions);
      } else {
        setQuestions([]);
      }
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => new Map(prev).set(questionId, answer));
  };

  const submitAnswer = async () => {
    const question = questions[currentIndex];
    const userAnswer = answers.get(question.id);

    if (!userAnswer) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/practice/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: question.id,
          user_answer: userAnswer,
        }),
      });
      const data = await res.json();
      setFeedback({
        correct: data.correct,
        explanation: data.explanation || 'No explanation available.',
      });
      setShowFeedback(true);
    } catch {
      setFeedback({ correct: false, explanation: 'Failed to get feedback.' });
      setShowFeedback(true);
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    setFeedback(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const finishPractice = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📭</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Questions Available</h2>
          <p className="text-slate-500 mb-4">We couldn't find questions for your selected criteria.</p>
          <Link href="/practice" className="text-primary-600 font-medium">
            ← Back to Practice
          </Link>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const currentAnswer = answers.get(question.id) || '';
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/practice" className="text-white">←</Link>
            <div className="text-center">
              <p className="font-semibold">Practice Mode</p>
              <p className="text-primary-200 text-sm">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="w-8" />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {/* Question Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              question.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {question.difficulty}
            </span>
            <span className="text-xs text-slate-500">{question.topic_name}</span>
            <span className="text-xs text-slate-500 ml-auto">{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</span>
          </div>

          <p className="text-slate-800 text-lg mb-4">{question.question_text}</p>

          {question.image_url && (
            <img src={question.image_url} alt="Question" className="max-w-full rounded-lg mb-4" />
          )}

          {question.answer_type === 'objective' ? (
            <div className="space-y-2">
              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 h-32 resize-none"
                disabled={showFeedback}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 h-40 resize-none"
                disabled={showFeedback}
              />
            </div>
          )}
        </div>

        {/* Feedback */}
        {showFeedback && feedback && (
          <div className={`rounded-xl p-4 mb-4 ${feedback.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{feedback.correct ? '✅' : '🤔'}</span>
              <span className={`font-bold ${feedback.correct ? 'text-green-700' : 'text-amber-700'}`}>
                {feedback.correct ? 'Correct!' : 'Not quite right'}
              </span>
            </div>
            <p className="text-slate-700 text-sm">{feedback.explanation}</p>
          </div>
        )}

        {/* Action Buttons */}
        {!showFeedback ? (
          <button
            onClick={submitAnswer}
            disabled={!currentAnswer || submitting}
            className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl disabled:bg-slate-300"
          >
            {submitting ? 'Checking...' : 'Check Answer'}
          </button>
        ) : (
          <button
            onClick={isLastQuestion ? finishPractice : nextQuestion}
            className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl"
          >
            {isLastQuestion ? 'Finish Practice' : 'Next Question →'}
          </button>
        )}

        {/* Progress indicator */}
        <div className="mt-4 flex justify-center gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === currentIndex ? 'bg-primary-600' :
                answers.has(questions[i].id) ? 'bg-primary-400' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500">Loading...</p>
    </div>
  );
}

export default function PracticeStartPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PracticeStartContent />
    </Suspense>
  );
}