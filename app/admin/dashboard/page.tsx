"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const teachers = users.filter((u) => u.role === "teacher");
  const students = users.filter((u) => u.role === "student");
  const admins = users.filter((u) => u.role === "admin");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">{users.length}</div>
            <div className="text-xs text-slate-500">Total Users</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{teachers.length}</div>
            <div className="text-xs text-slate-500">Teachers</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{students.length}</div>
            <div className="text-xs text-slate-500">Students</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-slate-800">Admin Actions</h2>
          <Link
            href="/admin/users"
            className="block w-full bg-primary-600 text-white text-center py-3 rounded-xl font-medium"
          >
            Manage Users
          </Link>
          <Link
            href="/admin/subjects"
            className="block w-full bg-purple-600 text-white text-center py-3 rounded-xl font-medium"
          >
            Manage Subjects
          </Link>
          <Link
            href="/admin/marking-keys"
            className="block w-full bg-slate-100 text-slate-800 text-center py-3 rounded-xl font-medium"
          >
            Approve Marking Keys
          </Link>
          <Link
            href="/admin/papers"
            className="block w-full bg-primary-50 text-primary-700 text-center py-3 rounded-xl font-medium"
          >
            Import ECZ Papers
          </Link>
          <Link
            href="/admin/analytics"
            className="block w-full bg-amber-500 text-white text-center py-3 rounded-xl font-medium"
          >
            📊 Analytics Dashboard
          </Link>
        </div>

        {/* Admins */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Super Admins</h2>
          {admins.length === 0 ? (
            <p className="text-slate-500 text-sm">No admins found</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin.id} className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-800">{admin.full_name}</p>
                  <p className="text-xs text-slate-500">{admin.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Teachers */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Recent Teachers</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : teachers.length === 0 ? (
            <p className="text-slate-500 text-sm">No teachers yet</p>
          ) : (
            <div className="space-y-2">
              {teachers.slice(0, 5).map((teacher) => (
                <div key={teacher.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{teacher.full_name}</p>
                    <p className="text-xs text-slate-500">{teacher.email}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Teacher
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
