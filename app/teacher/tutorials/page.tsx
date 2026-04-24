"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  tutorial_type: string;
  youtube_video_id?: string;
  subject?: { name: string };
  is_published: boolean;
  is_approved: boolean;
  view_count: number;
  completion_count: number;
  points_reward: number;
  created_at: string;
}

export default function TeacherTutorialsPage() {
  const router = useRouter();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    tutorial_type: "youtube",
    youtube_url: "",
    subject_id: "",
    grade_level: "",
    topic: "",
    is_published: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    fetchTutorials();
  }, []);

  async function fetchTutorials() {
    try {
      const res = await fetch("/api/tutorials?my_tutorials=true");
      const data = await res.json();
      if (res.ok) setTutorials(data.tutorials || []);
    } catch {
      console.error("Failed to fetch tutorials");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Tutorial created!" });
        setShowForm(false);
        setForm({ title: "", description: "", tutorial_type: "youtube", youtube_url: "", subject_id: "", grade_level: "", topic: "", is_published: false });
        fetchTutorials();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to create tutorial" });
    } finally {
      setSubmitting(false);
    }
  }

  const stats = {
    total: tutorials.length,
    published: tutorials.filter(t => t.is_published).length,
    views: tutorials.reduce((sum, t) => sum + t.view_count, 0),
    points: tutorials.filter(t => t.is_published).reduce((sum, t) => sum + t.points_reward, 0),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-green-600 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold">My Tutorials</h1>
            <Link href="/teacher/dashboard" className="text-sm bg-white/20 px-3 py-1 rounded">Back</Link>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="bg-white/10 rounded p-2">
              <div className="text-green-200">Total</div>
              <div className="text-xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white/10 rounded p-2">
              <div className="text-green-200">Published</div>
              <div className="text-xl font-bold">{stats.published}</div>
            </div>
            <div className="bg-white/10 rounded p-2">
              <div className="text-green-200">Views</div>
              <div className="text-xl font-bold">{stats.views}</div>
            </div>
            <div className="bg-white/10 rounded p-2">
              <div className="text-green-200">Points Earned</div>
              <div className="text-xl font-bold">{stats.points}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {message && (
          <div className={`rounded-lg p-3 mb-4 ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Your Lessons</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
            {showForm ? "Cancel" : "+ New Tutorial"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 mb-6 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300" placeholder="Introduction to Algebra" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300" rows={2} placeholder="Brief description of this lesson..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select value={form.tutorial_type} onChange={e => setForm({...form, tutorial_type: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300">
                  <option value="youtube">YouTube Video</option>
                  <option value="video">Uploaded Video</option>
                  <option value="audio">Audio/Podcast</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">YouTube URL</label>
                <input type="url" value={form.youtube_url} onChange={e => setForm({...form, youtube_url: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300" placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="published" checked={form.is_published} onChange={e => setForm({...form, is_published: e.target.checked})}
                  className="mr-2" />
                <label htmlFor="published" className="text-sm text-slate-700">Publish immediately</label>
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-medium disabled:opacity-50">
              {submitting ? "Creating..." : "Create Tutorial"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl p-6 animate-pulse h-24" />)}
          </div>
        ) : tutorials.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500">
            No tutorials yet. Create your first lesson!
          </div>
        ) : (
          <div className="space-y-4">
            {tutorials.map(tutorial => (
              <div key={tutorial.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl ${
                    tutorial.tutorial_type === 'youtube' ? 'bg-red-500' : tutorial.tutorial_type === 'video' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}>
                    {tutorial.tutorial_type === 'youtube' ? '▶' : tutorial.tutorial_type === 'video' ? '🎬' : '🎧'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{tutorial.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${tutorial.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {tutorial.is_published ? 'Published' : 'Draft'}
                      </span>
                      {tutorial.is_approved && <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Approved</span>}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{tutorial.description || "No description"}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span>👁 {tutorial.view_count} views</span>
                      <span>✓ {tutorial.completion_count} completed</span>
                      <span>⭐ {tutorial.points_reward} points</span>
                      <span>{tutorial.subject?.name || "No subject"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
