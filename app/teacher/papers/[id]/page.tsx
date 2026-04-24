"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  image_url: string | null;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  topic_name: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  needs_image: boolean;
  is_approved: boolean;
  is_rejected: boolean;
}

interface Paper {
  id: string;
  title: string;
  exam_year: number;
  paper_number: number;
  status: string;
  subjects?: { name: string };
  classes?: { name: string };
}

export default function TeacherPaperReviewPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.id as string;

  const [paper, setPaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Question>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadData();
  }, [paperId]);

  async function loadData() {
    setLoading(true);
    const [paperRes, questionsRes] = await Promise.all([
      fetch(`/api/papers/${paperId}`),
      fetch(`/api/papers/${paperId}/questions`),
    ]);
    const paperData = await paperRes.json();
    const questionsData = await questionsRes.json();
    setPaper(paperData.paper);
    setQuestions(questionsData.questions || []);
    setLoading(false);
  }

  async function saveQuestion(questionId: string) {
    setSaving(questionId);
    try {
      await fetch(`/api/papers/${paperId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, ...editData }),
      });
      setEditMode(null);
      loadData();
    } catch (e) {
      console.error(e);
    }
    setSaving(null);
  }

  async function handleImageUpload(questionId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('questionId', questionId);

    try {
      const res = await fetch(`/api/papers/${paperId}/questions/${questionId}/image`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === questions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(questions.map(q => q.id)));
    }
  }

  async function approveSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Approve ${selected.size} question(s)? They will be added to the question bank.`)) return;

    setApproving(true);
    try {
      await fetch(`/api/papers/${paperId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: Array.from(selected) }),
      });
      router.push('/teacher/papers');
    } catch (e) {
      console.error(e);
      setApproving(false);
    }
  }

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
        <p className="text-slate-500">Paper not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">{paper.title}</h1>
              <p className="text-xs text-white/70">
                {paper.exam_year} Paper {paper.paper_number} · {paper.subjects?.name} · {paper.classes?.name}
              </p>
            </div>
            <button onClick={() => router.push('/teacher/papers')} className="text-sm bg-white/20 px-3 py-1 rounded">
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {['total', 'needs_image', 'approved', 'rejected'].map(key => {
            const count = questions.filter(q => {
              if (key === 'needs_image') return q.needs_image;
              if (key === 'approved') return q.is_approved;
              if (key === 'rejected') return q.is_rejected;
              return true;
            }).length;
            return (
              <div key={key} className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-primary-600">{count}</div>
                <div className="text-xs text-slate-500 capitalize">{key.replace('_', ' ')}</div>
              </div>
            );
          })}
        </div>

        {/* Select all */}
        {questions.length > 0 && paper.status === 'processed' && (
          <div className="flex items-center justify-between bg-white rounded-lg p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.size === questions.length && questions.length > 0}
                onChange={toggleAll}
                className="w-4 h-4"
              />
              Select all ({selected.size} selected)
            </label>
            <button
              onClick={approveSelected}
              disabled={selected.size === 0 || approving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {approving ? 'Approving...' : `Approve ${selected.size}`}
            </button>
          </div>
        )}

        {/* Questions */}
        {questions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">No questions found. Process the paper first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map(q => (
              <div key={q.id} className="bg-white rounded-xl p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  {paper.status === 'processed' && (
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                      className="mt-1 w-4 h-4"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                        Q{q.question_number}
                      </span>
                      {q.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      )}
                      {q.needs_image && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                          Needs image
                        </span>
                      )}
                      {q.is_approved && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Approved</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-800">{q.question_text}</p>
                  </div>
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const isCorrect = q.correct_answer === opt;
                    return (
                      <div
                        key={opt}
                        className={`text-xs p-2 rounded-lg ${
                          isCorrect
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="font-semibold mr-1">{opt}.</span>
                        {q.options[opt as keyof typeof q.options]}
                        {isCorrect && <span className="ml-1 text-green-600">✓</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Topic */}
                <div className="text-xs text-slate-500 mb-3">
                  Topic: <span className="text-slate-700">{q.topic_name || 'Unassigned'}</span>
                </div>

                {/* Existing image */}
                {q.image_url && (
                  <div className="mb-3">
                    <img src={q.image_url} alt="Question image" className="max-h-40 rounded-lg" />
                  </div>
                )}

                {/* Image upload for questions needing images */}
                {q.needs_image && !q.image_url && (
                  <div className="mb-3">
                    <label className="block">
                      <span className="text-xs text-orange-600 font-medium">Upload question image:</span>
                      <input
                        type="file"
                        accept="image/*"
                        ref={el => { fileInputRefs.current[q.id] = el; }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(q.id, file);
                        }}
                        className="mt-1 w-full text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:bg-orange-50 file:text-orange-700 file:border-0"
                      />
                    </label>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  {editMode === q.id ? (
                    <>
                      <button
                        onClick={() => saveQuestion(q.id)}
                        disabled={saving === q.id}
                        className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm"
                      >
                        {saving === q.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditMode(null)}
                        className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditMode(q.id);
                        setEditData({
                          question_text: q.question_text,
                          options: q.options,
                          correct_answer: q.correct_answer,
                          topic_name: q.topic_name,
                          difficulty: q.difficulty,
                        });
                      }}
                      className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {/* Edit form */}
                {editMode === q.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">Question text</label>
                      <textarea
                        value={editData.question_text || ''}
                        onChange={e => setEditData({ ...editData, question_text: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <div key={opt}>
                          <label className="text-xs text-slate-500">Option {opt}</label>
                          <input
                            type="text"
                            value={editData.options?.[opt as keyof typeof editData.options] || ''}
                            onChange={e => setEditData({
                              ...editData,
                              options: { ...editData.options!, [opt]: e.target.value }
                            })}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm mt-1"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">Correct answer</label>
                        <select
                          value={editData.correct_answer || ''}
                          onChange={e => setEditData({ ...editData, correct_answer: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm mt-1"
                        >
                          <option value="">Select</option>
                          {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Topic</label>
                        <input
                          type="text"
                          value={editData.topic_name || ''}
                          onChange={e => setEditData({ ...editData, topic_name: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm mt-1"
                          placeholder="e.g. History and Government"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Difficulty</label>
                      <select
                        value={editData.difficulty || ''}
                        onChange={e => setEditData({ ...editData, difficulty: e.target.value as any })}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm mt-1"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
