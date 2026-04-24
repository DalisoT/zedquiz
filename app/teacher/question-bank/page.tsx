"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Level {
  id: string;
  name: string;
  slug: string;
}

interface Question {
  id: string;
  question_text: string;
  options: { A: string; B: string; C: string; D: string } | null;
  difficulty: string;
  marks: number;
  topic_name?: string;
  class_id: string;
  subject_id: string;
  classes: { name: string; levels: { name: string } };
  subjects: { name: string };
  source_paper?: { title: string; exam_year: number };
}

export default function TeacherQuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ level: "", class: "", subject: "" });
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  useEffect(() => {
    fetchLevels();
  }, []);

  useEffect(() => {
    fetchClassesAndSubjects();
  }, [filter.level]);

  useEffect(() => {
    fetchQuestions();
  }, [filter]);

  async function fetchLevels() {
    const res = await fetch("/api/levels");
    const data = await res.json();
    setLevels(data.levels || []);
    if (data.levels?.length > 0) {
      setFilter(f => ({ ...f, level: data.levels[0].id }));
    }
  }

  async function fetchClassesAndSubjects() {
    if (!filter.level) {
      setClasses([]);
      setSubjects([]);
      return;
    }

    const [classRes, subjRes] = await Promise.all([
      fetch(`/api/classes?level_id=${filter.level}`).then(r => r.json()),
      fetch(`/api/subjects?level_id=${filter.level}`).then(r => r.json()),
    ]);

    setClasses(classRes.classes || []);
    setSubjects(subjRes.subjects || []);
  }

  async function fetchQuestions() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.level) params.set("level_id", filter.level);
    if (filter.class) params.set("class_id", filter.class);
    if (filter.subject) params.set("subject_id", filter.subject);
    params.set("source", "bank");

    const res = await fetch(`/api/questions?${params}`);
    const data = await res.json();
    setQuestions(data.questions || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/teacher/dashboard" className="text-white">← Back</Link>
            <h1 className="text-lg font-semibold">Question Bank</h1>
            <div className="w-12" />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <select
              value={filter.level}
              onChange={e => setFilter({ ...filter, level: e.target.value, class: "", subject: "" })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Levels</option>
              {levels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <select
              value={filter.class}
              onChange={e => setFilter({ ...filter, class: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              disabled={!filter.level}
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filter.subject}
              onChange={e => setFilter({ ...filter, subject: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              disabled={!filter.level}
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm text-slate-600">
            {loading ? "Loading..." : `${questions.length} questions found`}
          </p>
        </div>

        {/* Questions List */}
        {loading ? (
          <p className="text-slate-500 text-center">Loading...</p>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">No questions in the bank</p>
            <p className="text-slate-400 text-sm mt-1">Upload and process ECZ papers to add questions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map(q => (
              <div
                key={q.id}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md"
                onClick={() => setSelectedQuestion(q)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium line-clamp-2">{q.question_text}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                        {q.classes?.levels?.name} - {q.classes?.name}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {q.subjects?.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
                    {q.source_paper && (
                      <p className="text-xs text-slate-400 mt-1">
                        Source: {q.source_paper.title} ({q.source_paper.exam_year})
                      </p>
                    )}
                  </div>
                </div>

                {/* Show options preview */}
                {q.options && (
                  <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(q.options).slice(0, 2).map(([key, val]) => (
                      <div key={key} className="text-slate-600">
                        <span className="font-medium">{key}:</span> {String(val).substring(0, 30)}...
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Question Detail Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-slate-800">Question Details</h2>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Question</p>
                <p className="text-slate-800">{selectedQuestion.question_text}</p>
              </div>

              {selectedQuestion.options && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Options</p>
                  <div className="space-y-2">
                    {Object.entries(selectedQuestion.options).map(([key, val]) => (
                      <div key={key} className={`p-3 rounded-lg ${
                        key === 'A' ? 'bg-blue-50 text-blue-800' :
                        key === 'B' ? 'bg-green-50 text-green-800' :
                        key === 'C' ? 'bg-amber-50 text-amber-800' :
                        'bg-purple-50 text-purple-800'
                      }`}>
                        <span className="font-semibold">{key}.</span> {String(val)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Class</p>
                  <p className="text-slate-800">{selectedQuestion.classes?.levels?.name} - {selectedQuestion.classes?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Subject</p>
                  <p className="text-slate-800">{selectedQuestion.subjects?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Difficulty</p>
                  <p className="text-slate-800 capitalize">{selectedQuestion.difficulty}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Marks</p>
                  <p className="text-slate-800">{selectedQuestion.marks}</p>
                </div>
              </div>

              {selectedQuestion.source_paper && (
                <div>
                  <p className="text-sm text-slate-500">Source Paper</p>
                  <p className="text-slate-800">{selectedQuestion.source_paper.title} ({selectedQuestion.source_paper.exam_year})</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
