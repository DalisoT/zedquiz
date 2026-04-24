"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ClassInfo { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Paper {
  id: string;
  title: string;
  exam_year: number;
  paper_number: number;
  status: string;
  subjects?: { name: string };
  classes?: { name: string };
}
interface Question {
  id: string;
  question_text: string;
  options: { A: string; B: string; C: string; D: string };
  difficulty: string;
  topics?: { name: string };
  source_paper?: { id: string; title: string; exam_year: number };
}

interface User {
  id: string;
  profile?: { role: string; full_name: string };
}

export default function NewPracticePaperPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Form data
  const [form, setForm] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    timeLimit: 30,
    questionCount: 20,
    difficulty: 'mixed',
    isExamSimulation: false,
  });

  // Available options
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    fetchUser();
    fetchClasses();
  }, []);

  async function fetchUser() {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      fetchPapers(data.user.id);
    }
  }

  async function fetchClasses() {
    const res = await fetch('/api/levels').then(r => r.json());
    const primaryLevel = res.levels?.find((l: any) => l.slug === 'primary');
    if (!primaryLevel) return;
    const classRes = await fetch(`/api/classes?levelId=${primaryLevel.id}`);
    const classData = await classRes.json();
    setClasses(classData.classes || []);
  }

  async function fetchSubjects(classId: string) {
    const res = await fetch('/api/levels').then(r => r.json());
    const primaryLevel = res.levels?.find((l: any) => l.slug === 'primary');
    if (!primaryLevel) return;
    const subjRes = await fetch(`/api/subjects?levelId=${primaryLevel.id}`);
    const subjData = await subjRes.json();
    setSubjects(subjData.subjects || []);
  }

  async function fetchPapers(teacherId: string) {
    const res = await fetch(`/api/papers?userId=${teacherId}`);
    const data = await res.json();
    // Only show processed/imported papers that have questions
    const processedPapers = (data.papers || []).filter((p: Paper) =>
      p.status === 'processed' || p.status === 'imported'
    );
    setPapers(processedPapers);
  }

  async function fetchQuestionsFromPapers() {
    if (selectedPaperIds.length === 0) return;
    setLoading(true);
    const res = await fetch(`/api/questions/from-papers?paperIds=${selectedPaperIds.join(',')}`);
    const data = await res.json();
    setQuestions(data.questions || []);
    setLoading(false);
  }

  function togglePaper(paperId: string) {
    setSelectedPaperIds(prev =>
      prev.includes(paperId)
        ? prev.filter(id => id !== paperId)
        : [...prev, paperId]
    );
  }

  function toggleQuestion(questionId: string) {
    setSelectedQuestionIds(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  }

  function selectAllQuestions() {
    setSelectedQuestionIds(questions.map(q => q.id));
  }

  async function handleSubmit() {
    if (!user || !form.title || !form.classId || !form.subjectId) {
      alert('Please fill in all required fields');
      return;
    }

    if (selectedQuestionIds.length === 0) {
      alert('Please select at least one question');
      return;
    }

    setLoading(true);

    // Get source paper IDs for each selected question
    const sourcePaperIds = selectedQuestionIds.map(qid => {
      const q = questions.find(q => q.id === qid);
      return q?.source_paper?.id || null;
    });

    const res = await fetch('/api/practice-papers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacher_id: user.id,
        title: form.title,
        description: form.description,
        class_id: form.classId,
        subject_id: form.subjectId,
        time_limit_minutes: form.timeLimit,
        question_count: selectedQuestionIds.length,
        difficulty: form.difficulty,
        is_exam_simulation: form.isExamSimulation,
        status: 'draft',
        question_ids: selectedQuestionIds,
        source_paper_ids: sourcePaperIds,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.paper) {
      router.push('/teacher/practice-papers');
    } else {
      alert('Error creating practice paper: ' + data.error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Create Practice Paper</h1>
            <button onClick={() => router.back()} className="text-sm bg-white/20 px-3 py-1 rounded">
              Cancel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-slate-800">Step 1: Basic Info</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Grade 6 Social Studies Mock Exam"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class *</label>
              <select
                value={form.classId}
                onChange={e => {
                  setForm({ ...form, classId: e.target.value });
                  fetchSubjects(e.target.value);
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
              <select
                value={form.subjectId}
                onChange={e => setForm({ ...form, subjectId: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                disabled={!form.classId}
              >
                <option value="">Select Subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time Limit (min)</label>
                <input
                  type="number"
                  value={form.timeLimit}
                  onChange={e => setForm({ ...form, timeLimit: parseInt(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  min={5}
                  max={180}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={e => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="mixed">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="examSim"
                checked={form.isExamSimulation}
                onChange={e => setForm({ ...form, isExamSimulation: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="examSim" className="text-sm text-slate-700">
                Exam Simulation (auto-submit when time expires)
              </label>
            </div>

            <button
              onClick={() => {
                if (!form.title || !form.classId || !form.subjectId) {
                  alert('Please fill in title, class, and subject');
                  return;
                }
                setStep(2);
              }}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium"
            >
              Next: Select Questions
            </button>
          </div>
        )}

        {/* Step 2: Select Papers */}
        {step === 2 && (
          <div className="bg-white rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-slate-800">Step 2: Choose Question Sources</h2>
            <p className="text-sm text-slate-500">
              Select which ECZ papers to pull questions from.
            </p>

            {papers.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">
                No processed papers found. Upload and process ECZ papers first.
              </p>
            ) : (
              <div className="space-y-2">
                {papers.map(paper => (
                  <div
                    key={paper.id}
                    onClick={() => togglePaper(paper.id)}
                    className={`p-3 rounded-lg border cursor-pointer ${
                      selectedPaperIds.includes(paper.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPaperIds.includes(paper.id)}
                        onChange={() => {}}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium text-sm">{paper.title}</p>
                        <p className="text-xs text-slate-500">
                          {paper.classes?.name} · {paper.subjects?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (selectedPaperIds.length === 0) {
                    alert('Please select at least one paper');
                    return;
                  }
                  fetchQuestionsFromPapers();
                  setStep(3);
                }}
                className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-medium"
              >
                Next: Select Questions
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Questions */}
        {step === 3 && (
          <div className="bg-white rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Step 3: Select Questions</h2>
              <button
                onClick={selectAllQuestions}
                className="text-sm text-primary-600"
              >
                Select All ({selectedQuestionIds.length}/{questions.length})
              </button>
            </div>

            {loading ? (
              <p className="text-slate-500 text-sm py-4">Loading questions...</p>
            ) : questions.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">
                No questions found in selected papers.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map(q => (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestion(q.id)}
                    className={`p-3 rounded-lg border cursor-pointer ${
                      selectedQuestionIds.includes(q.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(q.id)}
                        onChange={() => {}}
                        className="w-4 h-4 mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-slate-800">{q.question_text}</p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            q.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {q.difficulty}
                          </span>
                          {q.topics?.name && (
                            <span className="text-xs text-slate-500">{q.topics.name}</span>
                          )}
                          {q.source_paper && (
                            <span className="text-xs text-slate-400">
                              From: {q.source_paper.title}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || selectedQuestionIds.length === 0}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {loading ? 'Creating...' : `Create Paper (${selectedQuestionIds.length} questions)`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
