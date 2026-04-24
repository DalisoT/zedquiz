"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MarkingPoint {
  point: string;
  marks: number;
}

export default function NewMarkingKeyPage() {
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [examYear, setExamYear] = useState(new Date().getFullYear());
  const [paperVariant, setPaperVariant] = useState("");
  const [notes, setNotes] = useState("");
  const [markingScheme, setMarkingScheme] = useState<MarkingPoint[]>([{ point: "", marks: 1 }]);
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

  const handleClassChange = async (id: string) => {
    setClassId(id);
    try {
      const res = await fetch(`/api/subjects?class_id=${id}`);
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch {}
  };

  const addMarkingPoint = () => {
    setMarkingScheme([...markingScheme, { point: "", marks: 1 }]);
  };

  const updateMarkingPoint = (index: number, field: "point" | "marks", value: string | number) => {
    const updated = [...markingScheme];
    updated[index][field] = value as never;
    setMarkingScheme(updated);
  };

  const removeMarkingPoint = (index: number) => {
    setMarkingScheme(markingScheme.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !classId || !examYear) return;

    setSaving(true);
    try {
      const res = await fetch("/api/marking-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectId,
          class_id: classId,
          exam_year: examYear,
          paper_variant: paperVariant || null,
          marking_scheme: markingScheme.filter((m) => m.point.trim()),
          notes,
        }),
      });

      if (res.ok) {
        router.push("/teacher/marking-keys");
      }
    } catch {
      // Error
    } finally {
      setSaving(false);
    }
  };

  const totalMarks = markingScheme.reduce((sum, m) => sum + (Number(m.marks) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">Submit Marking Key</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exam Year</label>
              <input
                type="number"
                value={examYear}
                onChange={(e) => setExamYear(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-300"
                min={2000}
                max={new Date().getFullYear()}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
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
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Paper Variant (optional)
              </label>
              <input
                type="text"
                value={paperVariant}
                onChange={(e) => setPaperVariant(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300"
                placeholder="e.g., Variant 1, Paper 2"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Marking Scheme</h2>
              <span className="text-sm text-slate-500">Total: {totalMarks} marks</span>
            </div>

            {markingScheme.map((mark, index) => (
              <div key={index} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={mark.point}
                  onChange={(e) => updateMarkingPoint(index, "point", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="Expected answer point..."
                />
                <input
                  type="number"
                  value={mark.marks}
                  onChange={(e) => updateMarkingPoint(index, "marks", Number(e.target.value))}
                  className="w-16 px-3 py-2 rounded-lg border border-slate-300 text-sm text-center"
                  min={1}
                />
                {markingScheme.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMarkingPoint(index)}
                    className="px-2 py-2 text-red-500"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addMarkingPoint}
              className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-600 text-sm"
            >
              + Add Point
            </button>
          </div>

          <div className="bg-white rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 h-20 resize-none"
              placeholder="Any additional notes for examiners..."
            />
          </div>

          <button
            type="submit"
            disabled={saving || !subjectId || !classId}
            className="w-full bg-primary-600 text-white font-semibold py-4 rounded-xl disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit Marking Key"}
          </button>
        </form>
      </main>
    </div>
  );
}
