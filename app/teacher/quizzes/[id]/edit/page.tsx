"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  question_text: string;
  options: { A: string; B: string; C: string; D: string } | null;
  difficulty: string;
  marks: number;
  topics?: { name: string };
  classes?: { name: string };
  subjects?: { name: string };
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  class_id: string;
  subject_id: string;
  time_limit_seconds: number;
  question_count: number;
  is_published: boolean;
  classes?: { name: string };
  subjects?: { name: string };
  quiz_questions?: { questions: Question }[];
}

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [filter, setFilter] = useState({ difficulty: "", search: "" });

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  async function fetchQuiz() {
    setLoading(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      const data = await res.json();
      if (data.quiz) {
        setQuiz(data.quiz);
        // Get already selected question IDs
        const selected = new Set<string>(
          (data.quiz.quiz_questions || []).map((q: any) => q.question_id)
        );
        setSelectedQuestions(selected);
        // Fetch available questions
        fetchAvailableQuestions(data.quiz.class_id, data.quiz.subject_id, selected);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function fetchAvailableQuestions(classId: string, subjectId: string, excludeIds: Set<string>) {
    const params = new URLSearchParams({
      class_id: classId,
      subject_id: subjectId,
      source: "bank"
    });

    const res = await fetch(`/api/questions?${params}`);
    const data = await res.json();
    // Filter out already selected questions
    const questions = (data.questions || []).filter(
      (q: Question) => !excludeIds.has(q.id)
    );
    setAvailableQuestions(questions);
  }

  async function toggleQuestion(questionId: string) {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
      // Remove from quiz
      await fetch(`/api/quizzes/${quizId}/questions?question_id=${questionId}`, {
        method: "DELETE",
      });
    } else {
      newSelected.add(questionId);
      // Add to quiz
      await fetch(`/api/quizzes/${quizId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          order_index: selectedQuestions.size,
        }),
      });
    }
    setSelectedQuestions(newSelected);
  }

  async function handlePublish() {
    if (!quiz || selectedQuestions.size === 0) return;
    if (!confirm(`Publish quiz with ${selectedQuestions.size} questions?`)) return;

    setPublishing(true);
    try {
      // First save any remaining questions
      await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_count: selectedQuestions.size,
          is_published: true,
        }),
      });
      router.push("/teacher/quizzes");
    } catch (err) {
      console.error(err);
    }
    setPublishing(false);
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_count: selectedQuestions.size,
        }),
      });
      alert("Draft saved!");
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  }

  const filteredQuestions = availableQuestions.filter(q => {
    if (filter.difficulty && q.difficulty !== filter.difficulty) return false;
    if (filter.search && !q.question_text.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const selectedArray = Array.from(selectedQuestions);
  const totalMarks = selectedArray.length; // Simplified - 1 mark per question for now

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
        <p className="text-slate-500">Quiz not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/teacher/quizzes" className="text-white">← Back</Link>
            <h1 className="text-lg font-semibold">Edit Quiz</h1>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="text-white text-sm"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Quiz Info */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-slate-800">{quiz.title}</h2>
          <p className="text-sm text-slate-500">
            {quiz.classes?.name} · {quiz.subjects?.name}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {quiz.time_limit_seconds / 60} minutes · {selectedQuestions.size} questions selected
          </p>
        </div>

        {/* Selected Questions */}
        {selectedQuestions.size > 0 && (
          <div className="bg-green-50 rounded-xl p-4">
            <h3 className="font-semibold text-green-800 mb-2">
              Selected Questions ({selectedQuestions.size})
            </h3>
            <div className="space-y-2">
              {selectedArray.map((qId, idx) => {
                const q = quiz.quiz_questions?.find(
                  (qq: any) => qq.question_id === qId
                )?.questions;
                if (!q) return null;
                return (
                  <div key={qId} className="flex items-center gap-2 bg-white rounded-lg p-2">
                    <span className="text-green-600 font-medium text-sm w-6">{idx + 1}.</span>
                    <span className="text-slate-700 text-sm flex-1 line-clamp-1">
                      {q.question_text}
                    </span>
                    <button
                      onClick={() => toggleQuestion(qId)}
                      className="text-red-500 text-xs hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Question Bank */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-semibold text-slate-800 mb-3">
            Question Bank ({availableQuestions.length} available)
          </h3>

          {/* Filters */}
          <div className="flex gap-2 mb-3">
            <select
              value={filter.difficulty}
              onChange={e => setFilter({ ...filter, difficulty: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <input
              type="text"
              value={filter.search}
              onChange={e => setFilter({ ...filter, search: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1"
              placeholder="Search questions..."
            />
          </div>

          {/* Questions List */}
          {filteredQuestions.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              No questions found. Upload and process ECZ papers to add questions.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredQuestions.map(q => (
                <div
                  key={q.id}
                  onClick={() => toggleQuestion(q.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedQuestions.has(q.id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedQuestions.has(q.id)
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300'
                    }`}>
                      {selectedQuestions.has(q.id) && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-700 text-sm line-clamp-2">{q.question_text}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {q.difficulty}
                        </span>
                        {q.topics?.name && (
                          <span className="text-xs text-slate-500">{q.topics.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="w-full bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || selectedQuestions.size === 0}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {publishing ? "Publishing..." : `Publish Quiz (${selectedQuestions.size} questions)`}
          </button>
        </div>
      </main>
    </div>
  );
}
