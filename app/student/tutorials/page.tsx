"use client";

import { useState, useEffect } from "react";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  tutorial_type: string;
  youtube_video_id?: string;
  storage_url?: string;
  teacher?: { full_name: string };
  subject?: { name: string };
  view_count: number;
  rating?: number;
}

export default function StudentTutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "video" | "audio">("all");
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    fetchTutorials();
  }, []);

  async function fetchTutorials() {
    try {
      const res = await fetch("/api/tutorials");
      const data = await res.json();
      if (res.ok) setTutorials(data.tutorials || []);
    } catch {
      console.error("Failed to fetch tutorials");
    } finally {
      setLoading(false);
    }
  }

  async function submitRating() {
    if (!selectedTutorial || rating === 0) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/tutorials/${selectedTutorial.id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, review }),
      });
      if (res.ok) {
        setRating(0);
        setReview("");
        alert("Thanks for rating!");
      }
    } catch {
      alert("Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  }

  const filtered = filter === "all" ? tutorials : tutorials.filter(t => t.tutorial_type === filter);

  if (selectedTutorial) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-primary-600 text-white p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button onClick={() => setSelectedTutorial(null)} className="text-white/80 hover:text-white">
              ← Back to list
            </button>
            <h1 className="text-lg font-semibold flex-1">{selectedTutorial.title}</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-xl overflow-hidden">
            {selectedTutorial.youtube_video_id && (
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${selectedTutorial.youtube_video_id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {!selectedTutorial.youtube_video_id && (
              <div className="aspect-video bg-slate-900 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-6xl mb-4">{selectedTutorial.tutorial_type === 'audio' ? '🎧' : '🎬'}</div>
                  <p>Content player coming soon</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 bg-white rounded-xl p-4">
            <h2 className="font-medium mb-2">About this lesson</h2>
            <p className="text-slate-600 mb-4">{selectedTutorial.description || "No description"}</p>
            <div className="flex gap-4 text-sm text-slate-500">
              <span>👤 {selectedTutorial.teacher?.full_name || "Unknown"}</span>
              <span>📚 {selectedTutorial.subject?.name || "General"}</span>
              <span>👁 {selectedTutorial.view_count} views</span>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-xl p-4">
            <h2 className="font-medium mb-3">Rate this lesson</h2>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)}
                  className={`text-2xl ${star <= rating ? "text-amber-400" : "text-slate-300"}`}>
                  ★
                </button>
              ))}
            </div>
            <textarea value={review} onChange={e => setReview(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 mb-2"
              placeholder="Write a review (optional)..." rows={2} />
            <button onClick={submitRating} disabled={rating === 0 || submittingRating}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {submittingRating ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold mb-3">Video & Audio Lessons</h1>
          <div className="flex gap-2">
            <button onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full text-sm ${filter === "all" ? "bg-white text-primary-600" : "bg-white/20"}`}>
              All
            </button>
            <button onClick={() => setFilter("video")}
              className={`px-3 py-1 rounded-full text-sm ${filter === "video" ? "bg-white text-primary-600" : "bg-white/20"}`}>
              Videos
            </button>
            <button onClick={() => setFilter("audio")}
              className={`px-3 py-1 rounded-full text-sm ${filter === "audio" ? "bg-white text-primary-600" : "bg-white/20"}`}>
              Audio
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl h-32 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500">
            No tutorials available yet. Check back soon!
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(tutorial => (
              <div key={tutorial.id} onClick={() => setSelectedTutorial(tutorial)}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition">
                <div className="flex gap-4">
                  <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-white text-2xl ${
                    tutorial.tutorial_type === 'youtube' ? 'bg-red-500' : tutorial.tutorial_type === 'video' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}>
                    {tutorial.tutorial_type === 'youtube' ? '▶' : tutorial.tutorial_type === 'video' ? '🎬' : '🎧'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{tutorial.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{tutorial.description || "No description"}</p>
                    <div className="flex gap-3 mt-2 text-xs text-slate-400">
                      <span>👤 {tutorial.teacher?.full_name}</span>
                      <span>📚 {tutorial.subject?.name}</span>
                      <span>👁 {tutorial.view_count}</span>
                      {tutorial.rating && <span>⭐ {tutorial.rating}/5</span>}
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
