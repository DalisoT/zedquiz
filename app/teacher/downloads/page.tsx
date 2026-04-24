"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Level {
  id: string;
  name: string;
  classes: { id: string; name: string }[];
}

interface Subject {
  id: string;
  name: string;
}

interface Download {
  id: string;
  title: string;
  file_url: string;
  exam_year: number;
  paper_number: number | null;
  class_name: string;
  subject_name: string;
  created_at: string;
}

export default function TeacherDownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    classId: "",
    subjectId: "",
    examYear: new Date().getFullYear(),
    paperNumber: "",
    file: null as File | null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [downloadsRes, levelsRes] = await Promise.all([
      fetch("/api/downloads").then(r => r.json()),
      fetch("/api/levels").then(r => r.json()),
    ]);
    setDownloads(downloadsRes.downloads || []);
    setLevels(levelsRes.levels || []);
    setLoading(false);
  }

  async function fetchSubjects(levelId: string) {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;

    const res = await fetch(`/api/subjects?level_id=${levelId}`);
    const data = await res.json();
    setSubjects(data.subjects || []);
    if (data.subjects?.length > 0) {
      setForm(f => ({ ...f, subjectId: data.subjects[0].id, classId: level.classes[0]?.id || "" }));
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file || !form.title || !form.classId || !form.subjectId) return;

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = form.file.name.split('.').pop();
      const fileName = `${Date.now()}-${form.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('past-papers')
        .upload(fileName, form.file);

      if (uploadError) {
        // Try without folder
        const { data: uploadData2, error: uploadError2 } = await supabase.storage
          .from('past-papers')
          .upload(fileName, form.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError2) {
          alert("Upload failed: " + uploadError2.message);
          setUploading(false);
          return;
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('past-papers')
        .getPublicUrl(uploadData?.path || fileName);

      const fileUrl = urlData.publicUrl;

      // Save to database
      const res = await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          class_id: form.classId,
          subject_id: form.subjectId,
          exam_year: form.examYear,
          paper_number: form.paperNumber ? parseInt(form.paperNumber) : null,
          file_url: fileUrl,
          file_name: form.file.name,
        }),
      });

      if (res.ok) {
        setForm({
          title: "",
          description: "",
          classId: levels[0]?.classes[0]?.id || "",
          subjectId: subjects[0]?.id || "",
          examYear: new Date().getFullYear(),
          paperNumber: "",
          file: null,
        });
        setShowForm(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this past paper?")) return;

    try {
      // Note: In production, also delete the file from storage
      const res = await fetch(`/api/downloads/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch {
      alert("Failed to delete");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/teacher/dashboard" className="text-white">← Back</Link>
            <h1 className="text-lg font-semibold">Past Papers</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-white bg-white/20 px-3 py-1 rounded"
            >
              {showForm ? "Cancel" : "+ Upload"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Upload Form */}
        {showForm && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Upload Past Paper</h2>
            <form onSubmit={handleUpload} className="space-y-3">
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                placeholder="e.g. ECZ 2023 Mathematics Paper 1"
                required
              />

              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                placeholder="Description (optional)"
                rows={2}
              />

              <select
                value={levels[0]?.id || ""}
                onChange={e => {
                  const level = levels.find(l => l.id === e.target.value);
                  setForm(f => ({
                    ...f,
                    classId: level?.classes[0]?.id || "",
                  }));
                  fetchSubjects(e.target.value);
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
              >
                {levels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              <select
                value={form.classId}
                onChange={e => setForm({ ...form, classId: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
              >
                {levels.find(l => l.id === levels[0]?.id)?.classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={form.subjectId}
                onChange={e => setForm({ ...form, subjectId: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={form.examYear}
                  onChange={e => setForm({ ...form, examYear: parseInt(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  placeholder="Year"
                  min={2000}
                  max={2030}
                />
                <input
                  type="number"
                  value={form.paperNumber}
                  onChange={e => setForm({ ...form, paperNumber: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  placeholder="Paper #"
                  min={1}
                />
              </div>

              <input
                type="file"
                accept=".pdf"
                onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })}
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:bg-blue-50 file:text-blue-700"
                required
              />

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Past Paper"}
              </button>
            </form>
          </div>
        )}

        {/* Past Papers List */}
        {loading ? (
          <p className="text-slate-500 text-center">Loading...</p>
        ) : downloads.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-4xl mb-2">📚</p>
            <p className="text-slate-500">No past papers uploaded yet</p>
            <p className="text-slate-400 text-sm mt-1">Upload ECZ past papers for students</p>
          </div>
        ) : (
          <div className="space-y-3">
            {downloads.map(download => (
              <div key={download.id} className="bg-white rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">{download.title}</h3>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {download.class_name}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {download.subject_name}
                      </span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                        {download.exam_year} {download.paper_number ? `P${download.paper_number}` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(download.id)}
                    className="text-red-500 text-xs hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
