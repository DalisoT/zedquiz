"use client";

import { useState, useEffect } from "react";

interface TeacherSubject {
  id: string;
  subject_id: string;
  class_id: string | null;
}

export default function TeacherProfile() {
  const [fullName, setFullName] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setFullName(data.profile.full_name || "");
          fetchTeacherSubjects(data.profile.id);
        }
      });
  }, []);

  const fetchTeacherSubjects = async (teacherId: string) => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}/subjects`);
      const data = await res.json();
      if (data.subjects) {
        setSelectedSubjects(data.subjects.map((s: TeacherSubject) => s.subject_id));
      }
    } catch {
      // Subjects fetch failed silently
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/teachers/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, subject_ids: selectedSubjects }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Save failed silently
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">My Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {saved && (
          <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg text-sm">
            Profile saved successfully!
          </div>
        )}

        <div className="bg-white rounded-xl p-4 space-y-4">
          <h2 className="font-semibold text-slate-800">Personal Info</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 space-y-4">
          <h2 className="font-semibold text-slate-800">Subjects I Teach</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : (
            <p className="text-slate-500 text-sm">
              Subject selection will be available after connecting to your teacher profile.
            </p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </main>
    </div>
  );
}
