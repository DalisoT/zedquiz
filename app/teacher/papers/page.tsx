"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type OcrModule = {
  extractTextFromPDFFull: (file: File) => Promise<string>;
};

interface Level { id: string; name: string; slug: string; }
interface Subject { id: string; name: string; }
interface ClassInfo { id: string; name: string; }
interface Paper {
  id: string;
  title: string;
  exam_year: number;
  paper_number: number;
  status: string;
  file_url?: string;
  subjects?: { name: string };
  classes?: { name: string };
  paper_questions?: { count: number }[];
}

interface User {
  id: string;
  email: string;
  profile?: { role: string; full_name: string };
}

export default function TeacherPapersPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [loadingFormData, setLoadingFormData] = useState(false);

  const [form, setForm] = useState({
    title: '',
    subjectId: '',
    classId: '',
    levelId: '',
    examYear: new Date().getFullYear(),
    paperNumber: 1,
    file: null as File | null,
  });

  useEffect(() => {
    fetchUser();
    fetchLevels();
  }, []);

  async function fetchUser() {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      fetchPapers(data.user.id);
    }
  }

  async function fetchLevels() {
    setLoadingLevels(true);
    try {
      const res = await fetch('/api/levels');
      const data = await res.json();
      setLevels(data.levels || []);
      // Auto-select first level if available
      if (data.levels?.length > 0) {
        setForm(prev => ({ ...prev, levelId: data.levels[0].id }));
      }
    } catch (err) {
      console.error('Failed to load levels:', err);
    }
    setLoadingLevels(false);
  }

  async function fetchSubjectsAndClasses(levelId: string) {
    setLoadingFormData(true);
    try {
      const [subjRes, classRes] = await Promise.all([
        fetch(`/api/subjects?levelId=${levelId}`),
        fetch(`/api/classes?levelId=${levelId}`),
      ]);
      const subjData = await subjRes.json();
      const classData = await classRes.json();
      setSubjects(subjData.subjects || []);
      setClasses(classData.classes || []);
      // Reset subject and class selection when level changes
      setForm(prev => ({ ...prev, subjectId: '', classId: '' }));
    } catch (err) {
      console.error('Failed to load subjects/classes:', err);
    }
    setLoadingFormData(false);
  }

  async function fetchPapers(teacherId: string) {
    setLoadingPapers(true);
    try {
      const res = await fetch(`/api/papers?userId=${teacherId}`);
      const data = await res.json();
      if (data.error) {
        console.error('fetchPapers error:', data.error);
        alert('Failed to load papers: ' + data.error);
      }
      setPapers(data.papers || []);
    } catch (err) {
      console.error('fetchPapers catch error:', err);
      alert('Failed to load papers');
    }
    setLoadingPapers(false);
  }

  function handleLevelChange(levelId: string) {
    setForm(prev => ({ ...prev, levelId }));
    if (levelId) {
      fetchSubjectsAndClasses(levelId);
    } else {
      setSubjects([]);
      setClasses([]);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file || !form.subjectId || !form.classId || !user) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', form.file);
    formData.append('subjectId', form.subjectId);
    formData.append('classId', form.classId);
    formData.append('title', form.title);
    formData.append('examYear', String(form.examYear));
    formData.append('paperNumber', String(form.paperNumber));
    formData.append('userId', user.id);

    try {
      const res = await fetch('/api/papers/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        alert('Upload failed (status ' + res.status + '): ' + (data.error || 'Unknown error'));
        setUploading(false);
        return;
      }

      if (data.error) {
        alert('Upload error: ' + data.error);
      } else if (data.paper) {
        fetchPapers(user.id);
        setForm({ title: '', subjectId: '', classId: '', levelId: form.levelId, examYear: new Date().getFullYear(), paperNumber: 1, file: null });
      }
    } catch (err) {
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Network error'));
    }
    setUploading(false);
  }

  async function deletePaper(paperId: string) {
    if (!confirm('Are you sure you want to delete this paper? This will also delete all extracted questions.')) return;

    const btn = document.getElementById(`delete-btn-${paperId}`) as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
      const res = await fetch(`/api/papers/${paperId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.error) {
        alert('Delete failed: ' + data.error);
      } else {
        fetchPapers(user!.id);
      }
    } catch (err) {
      alert('Delete failed: Network error');
    }
    btn.disabled = false;
    btn.textContent = 'Delete';
  }

  async function processPaper(paperId: string) {
    if (!confirm('Process this paper with OCR + AI? This may take a minute...')) return;

    // Find the paper to get its file URL
    const paper = papers.find(p => p.id === paperId);
    if (!paper) return;

    const btn = document.getElementById(`process-btn-${paperId}`) as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Extracting text...';

    try {
      // Dynamically import OCR to avoid SSR issues
      const ocrModule: OcrModule = await import('@/lib/ocr');
      const extractTextFromPDFFull = ocrModule.extractTextFromPDFFull;

      // Download the PDF file
      const fileResponse = await fetch(paper.file_url || '');
      if (!fileResponse.ok) throw new Error('Failed to download PDF');

      // Convert to File object
      const pdfBlob = await fileResponse.blob();
      const fileName = paper.title.replace(/[^a-z0-9]/gi, '_') + '.pdf';
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      btn.textContent = 'Running OCR...';

      // Extract text using browser-side OCR
      const ocrText = await extractTextFromPDFFull(pdfFile);

      if (!ocrText || ocrText.length < 50) {
        throw new Error('Could not extract text from PDF. The file may be scanned/image-based.');
      }

      btn.textContent = 'Parsing questions...';

      // Send extracted text to server for AI processing
      const res = await fetch('/api/papers/process-text', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, ocrText }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      fetchPapers(user!.id);
    } catch (err) {
      console.error('Process error:', err);
      alert('Processing failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      fetchPapers(user!.id);
    }
    btn.disabled = false;
    btn.textContent = 'Process with OCR + AI';
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

  const statusHelpText = (status: string) => {
    const messages: Record<string, string> = {
      uploaded: 'Paper uploaded. Click Process to extract questions with AI.',
      processing: 'AI is extracting questions. Please wait...',
      processed: 'Questions extracted. Review and approve them.',
      imported: 'Questions approved and available for students.',
    };
    return messages[status] || '';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">My ECZ Papers</h1>
            <Link href="/teacher/dashboard" className="text-sm bg-white/20 px-3 py-1 rounded">Back</Link>
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

            {/* Level Selector - NEW */}
            {loadingLevels ? (
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" disabled>
                <option value="">Loading levels...</option>
              </select>
            ) : (
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.levelId}
                onChange={e => handleLevelChange(e.target.value)}
                required
              >
                <option value="">Select Level</option>
                {levels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}

            {/* Subject Selector */}
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.subjectId}
              onChange={e => setForm({ ...form, subjectId: e.target.value })}
              disabled={!form.levelId || loadingFormData}
              required
            >
              <option value="">
                {!form.levelId ? 'Select level first' : loadingFormData ? 'Loading subjects...' : 'Select Subject'}
              </option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Class Selector */}
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.classId}
              onChange={e => setForm({ ...form, classId: e.target.value })}
              disabled={!form.subjectId || loadingFormData}
              required
            >
              <option value="">
                {!form.subjectId ? 'Select subject first' : loadingFormData ? 'Loading classes...' : 'Select Class'}
              </option>
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
              disabled={uploading || !user || !form.subjectId || !form.classId}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Paper'}
            </button>
          </form>
        </div>

        {/* Papers List */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-slate-800">Your Papers</h2>
            <button
              onClick={() => user && fetchPapers(user.id)}
              className="text-primary-600 text-sm hover:underline"
            >
              ↻ Refresh
            </button>
          </div>
          {loadingPapers ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse border border-slate-100 rounded-lg p-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : papers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-slate-500 text-sm">No papers uploaded yet.</p>
              <p className="text-slate-400 text-xs mt-1">Upload ECZ past papers to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {papers.map(paper => (
                <div key={paper.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{paper.title}</p>
                      <p className="text-xs text-slate-500">
                        {paper.exam_year} Paper {paper.paper_number} · {paper.subjects?.name} · {paper.classes?.name}
                      </p>
                    </div>
                    {statusBadge(paper.status)}
                  </div>
                  {/* Status help text */}
                  {statusHelpText(paper.status) && (
                    <p className="text-xs text-slate-400 mb-2">{statusHelpText(paper.status)}</p>
                  )}
                  <div className="flex gap-2">
                    {paper.status === 'uploaded' && (
                      <button
                        id={`process-btn-${paper.id}`}
                        onClick={() => processPaper(paper.id)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium"
                      >
                        Process with OCR + AI
                      </button>
                    )}
                    {paper.status === 'processed' && (
                      <Link
                        href={`/teacher/papers/${paper.id}`}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium text-center"
                      >
                        Review Questions
                      </Link>
                    )}
                    {paper.status === 'imported' && (
                      <span className="flex-1 text-green-600 py-2 text-sm font-medium text-center">
                        ✓ Imported
                      </span>
                    )}
                    <button
                      id={`delete-btn-${paper.id}`}
                      onClick={() => deletePaper(paper.id)}
                      className="bg-red-100 text-red-600 py-2 px-3 rounded-lg text-sm font-medium"
                    >
                      ✕
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
