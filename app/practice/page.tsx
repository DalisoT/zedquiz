"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Level {
  id: string;
  name: string;
  slug: string;
  classes: { id: string; name: string; slug: string }[] | null;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
}

interface Topic {
  id: string;
  name: string;
}

export default function PracticePage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLevels();
  }, []);

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
        fetchTopics(data.subjects[0].id);
      }
    } catch {}
  };

  const fetchTopics = async (subjectId: string) => {
    try {
      const res = await fetch(`/api/topics?subject_id=${subjectId}`);
      const data = await res.json();
      setTopics(data.topics || []);
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

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    fetchTopics(subjectId);
  };

  const startPractice = () => {
    const params = new URLSearchParams({
      class_id: selectedClass,
      subject_id: selectedSubject,
    });
    if (selectedTopic) {
      params.append("topic_id", selectedTopic);
    }
    window.location.href = `/practice/start?${params.toString()}`;
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
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard" className="text-white">←</Link>
            <h1 className="text-lg font-semibold">Practice</h1>
          </div>
          <p className="text-primary-200 text-sm">Select your topic and start practicing</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Level Selection */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">Level</label>
          <select
            value={selectedLevel}
            onChange={(e) => handleLevelChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300"
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </div>

        {/* Class Selection */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">Grade/Form</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300"
          >
            {levels.find(l => l.id === selectedLevel)?.classes?.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Selection */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* Topic Selection */}
        {topics.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">Topic (optional)</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300"
            >
              <option value="">All Topics</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={startPractice}
          className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl"
        >
          Start Practice 🚀
        </button>

        {/* Info */}
        <div className="text-center text-sm text-slate-500">
          <p>Questions are marked instantly with AI feedback</p>
          <p className="mt-1">Build your streak by practicing daily!</p>
        </div>
      </main>
    </div>
  );
}
