"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PracticePaper {
  id: string;
  title: string;
  description: string;
  question_count: number;
  time_limit_minutes: number;
  difficulty: string;
  is_exam_simulation: boolean;
  status: string;
  class_id: string;
  subject_id: string;
  classes: { name: string };
  subjects: { name: string };
  teacher: { full_name: string };
}

interface UserProfile {
  id: string;
  role: string;
  grade_level: string | null;
}

export default function StudentPracticePage() {
  const [papers, setPapers] = useState<PracticePaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [filter, setFilter] = useState({ class: '', subject: '' });
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetchUserAndLevels();
  }, []);

  async function fetchUserAndLevels() {
    // Fetch current user
    const meRes = await fetch('/api/auth/me');
    const meData = await meRes.json();
    if (!meData.user) return;

    setUser({ id: meData.user.id, role: meData.profile?.role || 'student', grade_level: meData.profile?.grade_level });

    const role = meData.profile?.role || 'student';
    const userClassId = meData.profile?.grade_level;
    const isStudent = role === 'student';

    // Build fetch URLs based on role
    let levelsUrl = '/api/levels';
    let classesUrl = '/api/classes';
    let subjectsUrl = '/api/subjects';

    if (isStudent && userClassId) {
      levelsUrl += `?user_class_id=${userClassId}&role=student`;
      classesUrl += `?user_class_id=${userClassId}&role=student`;
      subjectsUrl += `?user_class_id=${userClassId}&role=student`;
    }

    const [levelsRes, classRes, subjRes] = await Promise.all([
      fetch(levelsUrl).then(r => r.json()),
      fetch(classesUrl).then(r => r.json()),
      fetch(subjectsUrl).then(r => r.json()),
    ]);

    const levelClasses = classRes.classes || [];
    const levelSubjects = subjRes.subjects || [];

    setClasses(levelClasses);
    setSubjects(levelSubjects);

    // Set initial filter to user's class if student
    if (isStudent && levelClasses.length > 0) {
      setFilter(prev => ({ ...prev, class: levelClasses[0].name }));
    }

    // Fetch papers
    fetchPapers(role, userClassId);
  }

  async function fetchPapers(role: string, userClassId: string | null) {
    setLoading(true);
    const res = await fetch('/api/practice-papers');
    const data = await res.json();

    let papers = (data.papers || []).filter((p: PracticePaper) => p.status === 'published');

    // Students only see papers for their class
    if (role === 'student' && userClassId) {
      papers = papers.filter((p: PracticePaper) => p.class_id === userClassId);
    }

    setPapers(papers);
    setLoading(false);
  }

  const filteredPapers = papers.filter(p => {
    if (filter.class && p.classes?.name !== filter.class) return false;
    if (filter.subject && p.subjects?.name !== filter.subject) return false;
    return true;
  });

  const isStudent = user?.role === 'student';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-purple-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">Practice Papers</h1>
          <p className="text-purple-200 text-sm">Test your knowledge with past ECZ questions</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Filters - hide class filter for students since they only have one */}
        {!isStudent && (
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filter.class}
              onChange={e => setFilter({ ...filter, class: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={filter.subject}
              onChange={e => setFilter({ ...filter, subject: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        {isStudent && (
          <select
            value={filter.subject}
            onChange={e => setFilter({ ...filter, subject: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Papers List */}
        {loading ? (
          <p className="text-slate-500 text-center">Loading...</p>
        ) : filteredPapers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">No practice papers available yet.</p>
            <p className="text-slate-400 text-sm mt-2">Check back later!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPapers.map(paper => (
              <Link
                key={paper.id}
                href={`/practice/${paper.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{paper.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {paper.classes?.name} · {paper.subjects?.name}
                    </p>
                  </div>
                  {paper.is_exam_simulation ? (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      Exam
                    </span>
                  ) : (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      Practice
                    </span>
                  )}
                </div>
                {paper.description && (
                  <p className="text-sm text-slate-600 mb-2">{paper.description}</p>
                )}
                <div className="flex gap-3 text-xs text-slate-500">
                  <span>📝 {paper.question_count} questions</span>
                  <span>⏱️ {paper.time_limit_minutes} min</span>
                  <span className="capitalize">{paper.difficulty}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
