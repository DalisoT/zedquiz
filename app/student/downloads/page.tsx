"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Level {
  id: string;
  name: string;
  slug: string;
  classes: { id: string; name: string }[] | null;
}

interface Subject {
  id: string;
  name: string;
}

interface DownloadStatus {
  [key: string]: 'idle' | 'downloading' | 'complete' | 'error';
}

interface DownloadedPack {
  classId: string;
  subjectId: string;
  count: number;
}

export default function DownloadsPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({});
  const [offlineQuestions, setOfflineQuestions] = useState<string[]>([]);
  const [downloadedPacks, setDownloadedPacks] = useState<DownloadedPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLevels();
    loadOfflineQuestions();
    loadDownloadedPacks();
  }, []);

  const loadOfflineQuestions = () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('offlineQuestions');
    if (stored) {
      setOfflineQuestions(JSON.parse(stored));
    }
  };

  const loadDownloadedPacks = () => {
    if (typeof window === 'undefined') return;
    const packs: DownloadedPack[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('pack-')) {
        const packData = localStorage.getItem(key);
        if (packData) {
          const questions = JSON.parse(packData);
          const [classId, subjectId] = key.replace('pack-', '').split('-');
          packs.push({ classId, subjectId, count: questions.length });
        }
      }
    }
    setDownloadedPacks(packs);
  };

  const fetchLevels = async () => {
    try {
      const res = await fetch("/api/levels");
      const data = await res.json();
      if (data.levels?.length > 0) {
        setLevels(data.levels);
        setSelectedLevel(data.levels[0].id);
        if (data.levels[0].classes?.length > 0) {
          setSelectedClass(data.levels[0].classes[0].id);
        }
        fetchSubjects(data.levels[0].id);
      }
    } catch {}
    setLoading(false);
  };

  const fetchSubjects = async (levelId: string) => {
    try {
      const res = await fetch(`/api/subjects?level_id=${levelId}`);
      const data = await res.json();
      setSubjects(data.subjects || []);
      if (data.subjects?.length > 0) {
        setSelectedSubject(data.subjects[0].id);
      }
    } catch {}
  };

  const handleLevelChange = (levelId: string) => {
    setSelectedLevel(levelId);
    const level = levels.find(l => l.id === levelId);
    if (level?.classes && level.classes.length > 0) {
      setSelectedClass(level.classes[0].id);
    }
    fetchSubjects(levelId);
  };

  const downloadPack = async () => {
    if (!selectedClass || !selectedSubject) return;

    const key = `${selectedClass}-${selectedSubject}`;
    setDownloadStatus(prev => ({ ...prev, [key]: 'downloading' }));

    try {
      const res = await fetch(`/api/packs/download?class_id=${selectedClass}&subject_id=${selectedSubject}`);
      const data = await res.json();

      if (data.questions) {
        const existingOffline = JSON.parse(localStorage.getItem('offlineQuestions') || '[]');
        const newQuestions = data.questions.filter((q: any) => !existingOffline.includes(q.id));
        const allQuestions = [...existingOffline, ...newQuestions.map((q: any) => q.id)];

        localStorage.setItem('offlineQuestions', JSON.stringify(allQuestions));
        localStorage.setItem(`pack-${key}`, JSON.stringify(data.questions));

        setOfflineQuestions(allQuestions);
        loadDownloadedPacks();
        setDownloadStatus(prev => ({ ...prev, [key]: 'complete' }));

        setTimeout(() => {
          setDownloadStatus(prev => ({ ...prev, [key]: 'idle' }));
        }, 2000);
      }
    } catch {
      setDownloadStatus(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => {
        setDownloadStatus(prev => ({ ...prev, [key]: 'idle' }));
      }, 2000);
    }
  };

  const isDownloaded = (classId: string, subjectId: string) => {
    if (typeof window === 'undefined') return false;
    const key = `${classId}-${subjectId}`;
    return !!localStorage.getItem(`pack-${key}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">Offline Downloads</h1>
          <p className="text-blue-200 text-sm">{offlineQuestions.length} questions stored offline</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Downloaded Packs */}
        {downloadedPacks.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Downloaded Packs</h2>
            <div className="space-y-2">
              {downloadedPacks.map((pack) => (
                <div key={pack.classId + pack.subjectId} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-700">{pack.count} questions</p>
                    <p className="text-xs text-green-600">Ready for offline use</p>
                  </div>
                  <span className="text-green-600 text-xl">📥</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download New Pack */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 mb-4">Download New Pack</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300"
              >
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Grade/Form</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300"
              >
                {levels.find(l => l.id === selectedLevel)?.classes?.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300"
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={downloadPack}
              disabled={downloadStatus[`${selectedClass}-${selectedSubject}`] === 'downloading'}
              className={`w-full font-semibold py-3 rounded-xl ${
                downloadStatus[`${selectedClass}-${selectedSubject}`] === 'complete'
                  ? 'bg-green-600 text-white'
                  : downloadStatus[`${selectedClass}-${selectedSubject}`] === 'downloading'
                  ? 'bg-slate-300 text-slate-500'
                  : isDownloaded(selectedClass, selectedSubject)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {downloadStatus[`${selectedClass}-${selectedSubject}`] === 'complete'
                ? 'Downloaded!'
                : downloadStatus[`${selectedClass}-${selectedSubject}`] === 'downloading'
                ? 'Downloading...'
                : isDownloaded(selectedClass, selectedSubject)
                ? 'Already Downloaded'
                : 'Download Pack'}
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-slate-500">
          <p>Downloaded questions can be practiced offline</p>
        </div>

        <Link href="/dashboard" className="block text-center text-primary-600 font-medium mt-4">
          Back to Dashboard
        </Link>
      </main>
    </div>
  );
}