"use client";

import { useState, useEffect } from "react";

interface MarkingKey {
  id: string;
  subject_id: string;
  class_id: string;
  exam_year: number;
  paper_variant: string | null;
  marking_scheme: { point: string; marks: number }[];
  is_approved: boolean;
  created_at: string;
  subjects: { name: string };
  classes: { name: string };
  profiles: { full_name: string };
}

export default function AdminMarkingKeysPage() {
  const [keys, setKeys] = useState<MarkingKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");

  useEffect(() => {
    fetch("/api/marking-keys")
      .then((res) => res.json())
      .then((data) => {
        setKeys(data.marking_keys || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const approveKey = async (id: string) => {
    try {
      const res = await fetch(`/api/marking-keys/${id}/approve`, { method: "POST" });
      if (res.ok) {
        setKeys(keys.map((k) => (k.id === id ? { ...k, is_approved: true } : k)));
      }
    } catch {
      // Error
    }
  };

  const filteredKeys = keys.filter((k) => filter === "all" || (filter === "pending" && !k.is_approved) || (filter === "approved" && k.is_approved));
  const totalMarks = (k: MarkingKey) => k.marking_scheme?.reduce((s: number, m: { marks: number }) => s + m.marks, 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">Marking Keys</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex gap-2">
          {(["pending", "approved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === f ? "bg-primary-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500 text-center">Loading...</p>
        ) : (
          <div className="space-y-3">
            {filteredKeys.map((key) => (
              <div key={key.id} className="bg-white rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {key.subjects?.name} - {key.classes?.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {key.exam_year} {key.paper_variant ? `(${key.paper_variant})` : ""}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">By {key.profiles?.full_name}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      key.is_approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {key.is_approved ? "Approved" : "Pending"}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{key.marking_scheme?.length || 0} points • {totalMarks(key)} marks</p>
                {!key.is_approved && (
                  <button
                    onClick={() => approveKey(key.id)}
                    className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Approve
                  </button>
                )}
              </div>
            ))}
            {filteredKeys.length === 0 && (
              <p className="text-slate-500 text-center">No marking keys found</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
