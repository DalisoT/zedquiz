"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Level {
  id: string;
  name: string;
  slug: string;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  level_id: string;
  levels: { name: string };
}

export default function TeacherSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", level_id: "" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ level: "", search: "" });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [subjectsRes, levelsRes] = await Promise.all([
      fetch("/api/subjects").then(r => r.json()),
      fetch("/api/levels").then(r => r.json()),
    ]);
    setSubjects(subjectsRes.subjects || []);
    setLevels(levelsRes.levels || []);
    if (levelsRes.levels?.length > 0 && !form.level_id) {
      setForm(f => ({ ...f, level_id: levelsRes.levels[0].id }));
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setForm({ name: "", code: "", description: "", level_id: levels[0]?.id || "" });
        setShowForm(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create subject");
      }
    } catch {
      alert("Failed to create subject");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch {
      alert("Failed to delete subject");
    }
  }

  const filteredSubjects = subjects.filter(s => {
    if (filter.level && s.level_id !== filter.level) return false;
    if (filter.search && !s.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-purple-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/teacher/dashboard" className="text-white">← Back</Link>
            <h1 className="text-lg font-semibold">Manage Subjects</h1>
            <button onClick={() => setShowForm(!showForm)} className="text-white">
              {showForm ? "Cancel" : "+ Add"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Add Form */}
        {showForm && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-3">Add New Subject</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                <select
                  value={form.level_id}
                  onChange={e => setForm({ ...form, level_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  required
                >
                  {levels.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  placeholder="e.g. Mathematics"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code (optional)</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  placeholder="e.g. MATH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Subject"}
              </button>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filter.level}
              onChange={e => setFilter({ ...filter, level: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="">All Levels</option>
              {levels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={filter.search}
              onChange={e => setFilter({ ...filter, search: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2"
              placeholder="Search..."
            />
          </div>
        </div>

        {/* Subjects List */}
        {loading ? (
          <p className="text-slate-500 text-center">Loading...</p>
        ) : filteredSubjects.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">No subjects found</p>
            <p className="text-slate-400 text-sm mt-1">Add subjects to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubjects.map(subject => (
              <div key={subject.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">{subject.name}</h3>
                    <p className="text-sm text-slate-500">{subject.levels?.name}</p>
                    {subject.code && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-1 inline-block">
                        {subject.code}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="text-red-500 text-sm hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
                {subject.description && (
                  <p className="text-sm text-slate-600 mt-2">{subject.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
