"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Subject { id: string; name: string; }
interface ClassInfo { id: string; name: string; }
interface Paper {
  id: string;
  title: string;
  exam_year: number;
  paper_number: number;
  status: string;
  subjects?: { name: string };
  classes?: { name: string };
  paper_questions?: { count: number }[];
}

export default function AdminPapersPage() {
  const router = useRouter();
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  const [form, setForm] = useState({
    title: '',
    subjectId: '',
    classId: '',
    examYear: new Date().getFullYear(),
    paperNumber: 1,
    file: null as File | null,
  });

  useEffect(() => {
    fetchPapers();
    fetchSubjectsAndClasses();
  }, []);

  async function fetchSubjectsAndClasses() {
    const res = await fetch('/api/levels').then(r => r.json());
    const primaryLevel = res.levels?.find((l: any) => l.slug === 'primary');
    if (!primaryLevel) return;

    const [subjRes, classRes] = await Promise.all([
      fetch(`/api/subjects?levelId=${primaryLevel.id}`),
      fetch(`/api/classes?levelId=${primaryLevel.id}`),
    ]);
    const subjData = await subjRes.json();
    const classData = await classRes.json();
    setSubjects(subjData.subjects || []);
    setClasses(classData.classes || []);
  }

  async function fetchPapers() {
    setLoadingPapers(true);
    const res = await fetch('/api/papers');
    const data = await res.json();
    setPapers(data.papers || []);
    setLoadingPapers(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file || !form.subjectId || !form.classId) return;

    setUploadStatus('uploading');
    setStatusMessage('Uploading paper...');
    const formData = new FormData();
    formData.append('file', form.file);
    formData.append('subjectId', form.subjectId);
    formData.append('classId', form.classId);
    formData.append('title', form.title);
    formData.append('examYear', String(form.examYear));
    formData.append('paperNumber', String(form.paperNumber));

    try {
      const res = await fetch('/api/papers/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.paper) {
        setUploadStatus('success');
        setStatusMessage('Paper uploaded successfully!');
        fetchPapers();
        setForm({ title: '', subjectId: '', classId: '', examYear: new Date().getFullYear(), paperNumber: 1, file: null });
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        setUploadStatus('error');
        setStatusMessage(data.error || 'Upload failed');
        setTimeout(() => setUploadStatus('idle'), 4000);
      }
    } catch (err) {
      setUploadStatus('error');
      setStatusMessage('Upload failed. Please try again.');
      setTimeout(() => setUploadStatus('idle'), 4000);
    }
  }

  async function processPaper(paperId: string) {
    if (!confirm('Process this paper with OCR + AI? This may take a minute...')) return;
    const btn = document.getElementById(`process-btn-${paperId}`) as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
      const res = await fetch(`/api/papers/${paperId}/process`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.error) {
        alert('Error: ' + data.error);
      } else {
        fetchPapers();
      }
    } catch (err) {
      alert('Processing failed');
    }
    btn.disabled = false;
    btn.textContent = 'Process';
  }

  async function deletePaper(paperId: string) {
    if (!confirm('Delete this paper permanently? This cannot be undone.')) return;
    const btn = document.getElementById(`delete-btn-${paperId}`) as HTMLButtonElement;
    btn.disabled = true;

    try {
      const res = await fetch(`/api/papers/${paperId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.error) {
        alert('Error: ' + data.error);
      } else {
        fetchPapers();
      }
    } catch (err) {
      alert('Delete failed');
    }
    btn.disabled = false;
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      uploaded: 'bg-slate-100 text-slate-700',
      processing: 'bg-yellow-100 text-yellow-700',
      processed: 'bg-blue-100 text-blue-700',
      imported: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded ${colors[status] || 'bg-slate-100'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">ECZ Past Papers</h1>
            <Link href="/admin/dashboard" className="text-sm bg-white/20 px-3 py-1 rounded">Back</Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Upload Form */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 mb-4">Upload Paper</h2>
          <form onSubmit={handleUpload} className="space-y-3">
            <input
              type="text"
              placeholder="Paper title (e.g. ECZ 2023 Social Studies)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />

            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.subjectId}
              onChange={e => setForm({ ...form, subjectId: e.target.value })}
              required
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.classId}
              onChange={e => setForm({ ...form, classId: e.target.value })}
              required
            >
              <option value="">Select Class</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Year"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.examYear}
                onChange={e => setForm({ ...form, examYear: parseInt(e.target.value) })}
                min={2000}
                max={2030}
                required
              />
              <input
                type="number"
                placeholder="Paper #"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.paperNumber}
                onChange={e => setForm({ ...form, paperNumber: parseInt(e.target.value) })}
                min={1}
                max={5}
                required
              />
            </div>

            <input
              type="file"
              accept=".pdf"
              className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:bg-primary-50 file:text-primary-700 file:border-0"
              onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })}
              required
            />

            <button
              type="submit"
              disabled={uploadStatus === 'uploading'}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Uploading...
                </>
              ) : 'Upload Paper'}
            </button>
          </form>
        </div>

        {/* Upload Status Message */}
        {uploadStatus !== 'idle' && (
          <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
            uploadStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            uploadStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {uploadStatus === 'uploading' && (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            )}
            {uploadStatus === 'success' && (
              <span>✓</span>
            )}
            {uploadStatus === 'error' && (
              <span>✗</span>
            )}
            {statusMessage}
          </div>
        )}

        {/* Papers List */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Your Papers</h2>
          {loadingPapers ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : papers.length === 0 ? (
            <p className="text-slate-500 text-sm">No papers uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {papers.map(paper => (
                <div key={paper.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{paper.title}</p>
                      <p className="text-xs text-slate-500">
                        {paper.exam_year} Paper {paper.paper_number} · {paper.subjects?.name} · {paper.classes?.name}
                      </p>
                    </div>
                    {statusBadge(paper.status)}
                  </div>
                  <div className="flex gap-2">
                    {paper.status === 'uploaded' && (
                      <>
                        <button
                          id={`process-btn-${paper.id}`}
                          onClick={() => processPaper(paper.id)}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium"
                        >
                          Process with OCR + AI
                        </button>
                        <button
                          id={`delete-btn-${paper.id}`}
                          onClick={() => deletePaper(paper.id)}
                          className="bg-red-100 text-red-600 py-2 px-3 rounded-lg text-sm font-medium"
                        >
                          ✕
                        </button>
                      </>
                    )}
                    {paper.status === 'processed' && (
                      <>
                        <Link
                          href={`/admin/papers/${paper.id}`}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium text-center"
                        >
                          Review Questions
                        </Link>
                        <button
                          id={`delete-btn-${paper.id}`}
                          onClick={() => deletePaper(paper.id)}
                          className="bg-red-100 text-red-600 py-2 px-3 rounded-lg text-sm font-medium"
                        >
                          ✕
                        </button>
                      </>
                    )}
                    {paper.status === 'imported' && (
                      <>
                        <span className="flex-1 text-green-600 py-2 text-sm font-medium text-center">
                          ✓ Imported
                        </span>
                        <button
                          id={`delete-btn-${paper.id}`}
                          onClick={() => deletePaper(paper.id)}
                          className="bg-red-100 text-red-600 py-2 px-3 rounded-lg text-sm font-medium"
                        >
                          ✕
                        </button>
                      </>
                    )}
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
