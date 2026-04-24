"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TopicPerf {
  id: string;
  topic_id: string;
  accuracy: number;
  total_attempts: number;
  correct_attempts: number;
  topics?: { id: string; name: string };
  subjects?: { id: string; name: string };
}

interface SubjectPerf {
  id: string;
  subject_id: string;
  accuracy: number;
  total_questions: number;
  correct_questions: number;
  subjects?: { id: string; name: string };
}

interface UserProfile {
  id: string;
  full_name: string;
  grade_level: string | null;
}

export default function WeakAreasPage() {
  const [weakTopics, setWeakTopics] = useState<TopicPerf[]>([]);
  const [strongTopics, setStrongTopics] = useState<TopicPerf[]>([]);
  const [subjectPerf, setSubjectPerf] = useState<SubjectPerf[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPerformance();
    }
  }, [user, selectedSubject]);

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user && data.profile) {
        setUser({
          id: data.user.id,
          full_name: data.profile.full_name,
          grade_level: data.profile.grade_level,
        });
      }
    } catch {}
  }

  async function fetchPerformance() {
    if (!user) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({ user_id: user.id });
      if (selectedSubject) params.set("subject_id", selectedSubject);

      const res = await fetch(`/api/performance?${params}`);
      const data = await res.json();

      setWeakTopics(data.weak_topics || []);
      setStrongTopics(data.strong_topics || []);
      setSubjectPerf(data.subject_performance || []);
    } catch {}

    setLoading(false);
  }

  // Get unique subjects for filter
  const subjects = [...new Map(
    [...(weakTopics || []), ...(strongTopics || [])]
      .filter(t => t.subjects)
      .map(t => [t.subjects!.id, t.subjects!])
  ).values()];

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return "text-green-600 bg-green-50";
    if (accuracy >= 50) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getAccuracyLabel = (accuracy: number) => {
    if (accuracy >= 70) return "Strong";
    if (accuracy >= 50) return "Developing";
    return "Needs Work";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-1">
            <Link href="/dashboard" className="text-white">← Back</Link>
            <h1 className="text-lg font-semibold">My Performance</h1>
            <div className="w-12" />
          </div>
          <p className="text-primary-200 text-sm text-center">Track your strengths & weaknesses</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Subject Filter */}
        {subjects.length > 1 && (
          <div className="bg-white rounded-xl p-3">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Subject Overview */}
        {subjectPerf.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Subject Performance</h2>
            <div className="space-y-2">
              {subjectPerf.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{s.subjects?.name}</p>
                    <p className="text-xs text-slate-500">{s.correct_questions}/{s.total_questions} correct</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getAccuracyColor(s.accuracy)}`}>
                    {s.accuracy}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Areas */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Areas to Improve</h2>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              {weakTopics.length} topics
            </span>
          </div>

          {loading ? (
            <p className="text-slate-500 text-center py-4">Loading...</p>
          ) : weakTopics.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-2">🎯</p>
              <p className="text-slate-500">No weak areas yet!</p>
              <p className="text-slate-400 text-sm">Take more quizzes to see your performance</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weakTopics.map(topic => (
                <div key={topic.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-800">{topic.topics?.name}</p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getAccuracyColor(topic.accuracy)}`}>
                      {topic.accuracy}% ({topic.correct_attempts}/{topic.total_attempts})
                    </span>
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-red-600">{getAccuracyLabel(topic.accuracy)}</span>
                    <Link
                      href={`/practice?topic=${topic.topic_id}`}
                      className="text-xs bg-red-600 text-white px-3 py-1 rounded-full"
                    >
                      Practice →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strong Areas */}
        {strongTopics.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Your Strengths</h2>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                {strongTopics.length} topics
              </span>
            </div>

            <div className="space-y-3">
              {strongTopics.slice(0, 3).map(topic => (
                <div key={topic.id} className="border border-green-200 rounded-lg p-3 bg-green-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-800">{topic.topics?.name}</p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getAccuracyColor(topic.accuracy)}`}>
                      {topic.accuracy}% ({topic.correct_attempts}/{topic.total_attempts})
                    </span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <h3 className="font-semibold text-primary-800 mb-2">📈 Study Tips</h3>
          <ul className="text-sm text-primary-700 space-y-1">
            <li>• Focus on topics below 50% accuracy first</li>
            <li>• Practice each weak topic at least 3 times</li>
            <li>• Review explanations after each attempt</li>
            <li>• Consistent practice improves results!</li>
          </ul>
        </div>

        {/* CTA */}
        <Link
          href="/student/practice"
          className="block w-full bg-primary-600 text-white text-center py-3 rounded-xl font-medium"
        >
          Find Practice Questions →
        </Link>
      </main>
    </div>
  );
}
