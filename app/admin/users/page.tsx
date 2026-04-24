"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  streak_days?: number;
  total_points?: number;
}

const ROLES = ["student", "teacher", "admin", "super_admin"] as const;
type Role = typeof ROLES[number];

const roleColors: Record<Role, string> = {
  student: "bg-blue-100 text-blue-700",
  teacher: "bg-green-100 text-green-700",
  admin: "bg-purple-100 text-purple-700",
  super_admin: "bg-amber-100 text-amber-700",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Role>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        showMessage("error", data.error || "Failed to load users");
      }
    } catch {
      showMessage("error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, newRole: string) {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        showMessage("success", `Role updated to ${newRole}`);
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to update role");
      }
    } catch {
      showMessage("error", "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  }

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  const filteredUsers = users.filter((u) => filter === "all" || u.role === filter);
  const counts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {} as Record<Role, number>);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold">User Management</h1>
            <div className="flex gap-2">
              <Link href="/admin/users/create" className="text-sm bg-white/20 px-3 py-1 rounded hover:bg-white/30 transition">
                + Create User
              </Link>
              <Link href="/admin/dashboard" className="text-sm bg-white/20 px-3 py-1 rounded hover:bg-white/30 transition">
                Back
              </Link>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-primary-200">Total: <strong className="text-white">{users.length}</strong></span>
            <span className="text-blue-200">Students: <strong className="text-white">{counts.student}</strong></span>
            <span className="text-green-200">Teachers: <strong className="text-white">{counts.teacher}</strong></span>
            <span className="text-purple-200">Admins: <strong className="text-white">{counts.admin + counts.super_admin}</strong></span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {message && (
          <div className={`rounded-lg p-3 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === "all" ? "bg-primary-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All ({users.length})
          </button>
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition ${
                filter === r ? `${roleColors[r]} ring-2 ring-offset-1 ring-${r === "super_admin" ? "amber" : r === "admin" ? "purple" : r === "teacher" ? "green" : "blue"}-400` : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.replace("_", " ")} ({counts[r]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800 truncate">{user.full_name || "No name"}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${roleColors[user.role as Role]}`}>
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{user.email || "No email"}</p>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400">
                    <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                    {user.streak_days !== undefined && user.streak_days > 0 && (
                      <span className="text-orange-500">🔥 {user.streak_days}d streak</span>
                    )}
                    {user.total_points !== undefined && user.total_points > 0 && (
                      <span className="text-primary-500">⭐ {user.total_points} pts</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    disabled={updatingId === user.id || user.role === "super_admin"}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} disabled={r === "super_admin"}>
                        {r.replace("_", " ")}{r === "super_admin" ? " (protected)" : ""}
                      </option>
                    ))}
                  </select>
                  {updatingId === user.id && (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full" />
                  )}
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-slate-500">No users found</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
