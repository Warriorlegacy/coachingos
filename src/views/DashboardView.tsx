// src/views/DashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatCurrency } from '../lib/api';
import { Link } from 'react-router-dom';
import {
  Users,
  Layers,
  CalendarCheck2,
  ReceiptText,
  BookOpenCheck,
  Award,
  ArrowUpRight,
  Sparkles,
  Megaphone,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user, role, activeCentre } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, notRes] = await Promise.all([
          apiRequest('/reports/summary').catch(() => null),
          apiRequest('/notices').catch(() => ({ notices: [] })),
        ]);
        setSummary(sumRes);
        setNotices(notRes.notices || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [role]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bezel-card p-1.5">
        <div className="bezel-card-inner p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-semibold text-sky-400 mb-2">
              <Sparkles className="h-3 w-3" />
              <span>CoachingOS Workspace</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {activeCentre?.name} • Session 2026-2027 • Timezone {activeCentre?.timezone}
            </p>
          </div>

          {/* Quick Actions based on Role */}
          <div className="flex flex-wrap items-center gap-2">
            {['centre_owner', 'centre_admin', 'teacher'].includes(role || '') && (
              <Link
                to="/attendance"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition"
              >
                <CalendarCheck2 className="h-3.5 w-3.5" />
                <span>Take Attendance</span>
              </Link>
            )}
            {['centre_owner', 'centre_admin', 'accountant'].includes(role || '') && (
              <Link
                to="/fees"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold transition"
              >
                <ReceiptText className="h-3.5 w-3.5 text-emerald-400" />
                <span>Record Fee</span>
              </Link>
            )}
            {role === 'student' && (
              <Link
                to="/homework"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition"
              >
                <BookOpenCheck className="h-3.5 w-3.5" />
                <span>View My Homework</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid (Visible to Admins, Owners, Teachers, Accountants) */}
      {['centre_owner', 'centre_admin', 'teacher', 'accountant'].includes(role || '') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bezel-card p-1">
            <div className="bezel-card-inner p-4 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium">Active Students</span>
                <Users className="h-4 w-4 text-sky-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {summary?.students?.active ?? '—'}
              </div>
              <div className="text-[10px] text-zinc-500">
                Enrolled across {summary?.batches ?? 0} batches
              </div>
            </div>
          </div>

          <div className="bezel-card p-1">
            <div className="bezel-card-inner p-4 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium">Attendance Rate</span>
                <CalendarCheck2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {summary?.attendanceRate ?? 100}%
              </div>
              <div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Healthy classroom engagement</span>
              </div>
            </div>
          </div>

          <div className="bezel-card p-1">
            <div className="bezel-card-inner p-4 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium">Fee Collected</span>
                <ReceiptText className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {summary?.fees ? formatCurrency(summary.fees.collectedCents, activeCentre?.currency) : '—'}
              </div>
              <div className="text-[10px] text-zinc-500">
                Outstanding: {summary?.fees ? formatCurrency(summary.fees.outstandingCents, activeCentre?.currency) : '—'}
              </div>
            </div>
          </div>

          <div className="bezel-card p-1">
            <div className="bezel-card-inner p-4 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium">Homework Diligence</span>
                <BookOpenCheck className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {summary?.homework?.submissions ?? 0}
              </div>
              <div className="text-[10px] text-zinc-500">
                Across {summary?.homework?.assignments ?? 0} active assignments
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Workflows & Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Workflow Hub */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bezel-card p-1.5">
            <div className="bezel-card-inner p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Operating Hub & Direct Workflows
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono">ROLE: {role}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/attendance"
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition group"
                >
                  <div className="h-9 w-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-105 transition">
                    <CalendarCheck2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-sky-300">Classroom Attendance</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Mobile-first roster, bulk-mark, and offline sync</div>
                  </div>
                </Link>

                <Link
                  to="/homework"
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition group"
                >
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
                    <BookOpenCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-purple-300">Homework & Submissions</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Task distribution, submissions, rubric grading</div>
                  </div>
                </Link>

                <Link
                  to="/assessments"
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition group"
                >
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-emerald-300">Assessments & Results</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Marks entry with strict bounds and report cards</div>
                  </div>
                </Link>

                <Link
                  to="/fees"
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition group"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                    <ReceiptText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-amber-300">Decimal-Safe Fee Ledger</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Invoices, UPI/Cash payments, instant receipts</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Broadcast Notices Feed */}
        <div className="space-y-4">
          <div className="bezel-card p-1.5">
            <div className="bezel-card-inner p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-sky-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Centre Notices</h3>
                </div>
                <Link to="/notices" className="text-[10px] text-sky-400 hover:underline">
                  View all
                </Link>
              </div>

              {notices.length === 0 ? (
                <div className="text-xs text-zinc-500 py-6 text-center">No notices published yet.</div>
              ) : (
                <div className="space-y-3">
                  {notices.slice(0, 3).map((n) => (
                    <div key={n.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200 line-clamp-1">{n.title}</span>
                        {n.priority === 'urgent' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{n.content}</p>
                      <div className="text-[9px] text-zinc-500 pt-1">
                        By {n.publisher_name} • {new Date(n.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
