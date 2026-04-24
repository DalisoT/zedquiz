"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewExamPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [timeLimit, setTimeLimit] = useState(3600);
  const [questionCount, setQuestionCount] = useState(10);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/levels")
      .then((res) => res.json())
      .then((data) => {
        if (data.levels) {
          fetchClasses(data.levels[0]?.id);
        }
      });
  }, []);

  const fetchClasses = async (levelId: string) => {
    try {
      const res = await fetch(`/api/classes?level_id=${levelId}`);
      const data = await res.json();
      setClasses(data.classes || []);
    } catch {}
  };

  const handleSubjectChange = async (classId: string) => {
    setSelectedClass(classId);
    try {
      const res = await fetch(`/api/subjects?class_id=${classId}`);
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedClass || !selectedSubject) return;

    setSaving(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          class_id: selectedClass,
          subject_id: selectedSubject,
          time_limit_seconds: timeLimit,
          question_count: questionCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/teacher/exams/${data.exam.id}/edit`);
      }
    } catch {
      // Error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">Create New Exam</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exam Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300"
                placeholder="e.g., 2023 ECZ Mathematics Paper"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 h-20 resize-none"
                placeholder="Brief description of this exam"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300"
                required
              >
                <option value="">Select class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300"
                required
              >
                <option value="">Select subject</option>
                {subjects.map((subj) => (
                  <option key={subj.id} value={subj.id}>
                    {subj.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Time Limit (seconds)
                </label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300"
                  min={300}
                />
                <p className="text-xs text-slate-500 mt-1">{Math.floor(timeLimit / 60)} min</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question Count
                </label>
                <input
                  type="number"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300"
                  min={1}
                  max={50}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !title || !selectedClass || !selectedSubject}
            className="w-full bg-primary-600 text-white font-semibold py-4 rounded-xl disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Exam"}
          </button>
        </form>
      </main>
    </div>
  );
}
