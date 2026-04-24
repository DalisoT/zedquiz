"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PracticePaper {
  id: string;
  title: string;
  description: string;
  status: string;
  question_count: number;
  time_limit_minutes: number;
  difficulty: string;
  is_exam_simulation: boolean;
  classes?: { name: string };
  subjects?: { name: string };
  created_at: string;
}

interface User {
  id: string;
  profile?: { role: string; full_name: string };
}

export default function TeacherPracticePapersPage() {
  const router = useRouter();
  const [papers, setPapers] = useState<PracticePaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      fetchPapers(data.user.id);
    }
  }

  async function fetchPapers(teacherId: string) {
    setLoading(true);
    const res = await fetch(`/api/practice-papers?teacherId=${teacherId}`);
    const data = await res.json();
    setPapers(data.papers || []);
    setLoading(false);
  }

  async function deletePaper(paperId: string) {
    if (!confirm('Delete this practice paper?')) return;
    await fetch(`/api/practice-papers/${paperId}`, { method: 'DELETE' });
    fetchPapers(user!.id);
  }

  async function togglePublish(paper: PracticePaper) {
    const newStatus = paper.status === 'published' ? 'draft' : 'published';
    await fetch(`/api/practice-papers/${paper.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchPapers(user!.id);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Practice Papers</h1>
            <Link href="/teacher/dashboard" className="text-sm bg-white/20 px-3 py-1 rounded">Back</Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Create Button */}
        <Link
          href="/teacher/practice-papers/new"
          className="block w-full bg-primary-600 text-white text-center py-3 rounded-xl font-medium"
        >
          + Create Practice Paper
        </Link>

        {/* Papers List */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Your Papers</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : papers.length === 0 ? (
            <p className="text-slate-500 text-sm">No practice papers yet. Create one!</p>
          ) : (
            <div className="space-y-3">
              {papers.map(paper => (
                <div key={paper.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{paper.title}</p>
                      <p className="text-xs text-slate-500">
                        {paper.classes?.name} · {paper.subjects?.name} · {paper.question_count} questions · {paper.time_limit_minutes} min
                      </p>
                      {paper.description && (
                        <p className="text-xs text-slate-400 mt-1">{paper.description}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      paper.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {paper.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/teacher/practice-papers/${paper.id}`}
                      className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-medium text-center"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => togglePublish(paper)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        paper.status === 'published'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {paper.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => deletePaper(paper.id)}
                      className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
