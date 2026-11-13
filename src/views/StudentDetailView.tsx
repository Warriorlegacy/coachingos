// src/views/StudentDetailView.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatCurrency, formatDate } from '../lib/api';
import {
  Users,
  GraduationCap,
  CalendarCheck2,
  ReceiptText,
  BookOpenCheck,
  Award,
  Sparkles,
  ArrowLeft,
  Phone,
  Mail,
  ShieldAlert,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const StudentDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role, activeCentre } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // AI Summary state
  const [aiSummary, setAiSummary] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        setError('');
        const res = await apiRequest(`/students/${id}`);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load student details');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDetail();
  }, [id]);

  const handleGenerateSummary = async () => {
    try {
      setGeneratingAi(true);
      const res = await apiRequest('/ai/progress-summary', {
        method: 'POST',
        body: JSON.stringify({ studentId: id }),
      });
      setAiSummary(res.summary);
    } catch (err: any) {
      alert(`AI Summary generation failed: ${err.message}`);
    } finally {
      setGeneratingAi(false);
    }
  };

  if (loading) {
    return <div className="text-zinc-500 text-xs py-12 text-center">Loading student 360° profile...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4" />
          <span>Access Restricted</span>
        </div>
        <p>{error || 'Student not found or access denied.'}</p>
        <Link to="/students" className="inline-flex items-center gap-1 text-sky-400 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  const { student, guardians, batches, attendance, invoices } = data;
  const totalAtt = Number(attendance?.total_sessions || 0);
  const presentCount = Number(attendance?.present_count || 0);
  const lateCount = Number(attendance?.late_count || 0);
  const attRate = totalAtt > 0 ? Math.round(((presentCount + lateCount) / totalAtt) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/students" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Student Directory</span>
      </Link>

      {/* Hero Card */}
      <div className="bezel-card p-1.5">
        <div className="bezel-card-inner p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/10">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-extrabold text-2xl">
              {student.first_name[0]}{student.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  {student.first_name} {student.last_name}
                </h1>
                <span className="font-mono text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/30">
                  {student.admission_no}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {student.grade_level} • Enrolled on {formatDate(student.enrollment_date)} • Status: <span className="text-emerald-400 font-semibold">{student.status}</span>
              </p>
            </div>
          </div>

          {/* AI Progress Summary Button */}
          <button
            onClick={handleGenerateSummary}
            disabled={generatingAi}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{generatingAi ? 'Analyzing Data...' : 'Draft Parent Letter'}</span>
          </button>
        </div>
      </div>

      {/* AI Letter Container if generated */}
      {aiSummary && (
        <div className="bezel-card p-1.5 animate-fade-in">
          <div className="bezel-card-inner p-5 space-y-3 bg-indigo-950/20 border-indigo-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                AI Generated Parent Progress Letter (Grounded on Real Metrics)
              </span>
              <button onClick={() => setAiSummary('')} className="text-xs text-zinc-500 hover:text-white">
                Dismiss
              </button>
            </div>
            <div className="text-xs text-zinc-200 whitespace-pre-line leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5 font-sans">
              {aiSummary}
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Info Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance Profile */}
        <div className="bezel-card p-1.5">
          <div className="bezel-card-inner p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck2 className="h-4 w-4 text-emerald-400" />
                Attendance Record
              </span>
              <span className="text-base font-extrabold text-emerald-400">{attRate}%</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-400">
                <span>Total Recorded Sessions</span>
                <span className="text-white font-medium">{totalAtt}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-400">
                <span>Present</span>
                <span className="text-emerald-400 font-medium">{presentCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-400">
                <span>Late Arrivals</span>
                <span className="text-amber-400 font-medium">{lateCount}</span>
              </div>
              <div className="flex justify-between py-1 text-zinc-400">
                <span>Absences</span>
                <span className="text-rose-400 font-medium">{attendance?.absent_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Guardians & Contacts */}
        <div className="bezel-card p-1.5">
          <div className="bezel-card-inner p-5 space-y-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4 text-purple-400" />
              Verified Guardians
            </span>

            {guardians.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center">No guardians linked.</div>
            ) : (
              <div className="space-y-3">
                {guardians.map((g: any) => (
                  <div key={g.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>{g.name}</span>
                      <span className="text-[10px] text-purple-400">{g.relationship}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                      <Phone className="h-3 w-3 text-zinc-500" />
                      <span>{g.phone}</span>
                    </div>
                    {g.email && (
                      <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                        <Mail className="h-3 w-3 text-zinc-500" />
                        <span>{g.email}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enrolled Batches */}
        <div className="bezel-card p-1.5">
          <div className="bezel-card-inner p-5 space-y-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-sky-400" />
              Enrolled Batches
            </span>

            {batches.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center">Not enrolled in any batches.</div>
            ) : (
              <div className="space-y-2">
                {batches.map((b: any) => (
                  <div key={b.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs">
                    <div className="font-semibold text-white">{b.name}</div>
                    <div className="text-[11px] text-zinc-400">{b.subject_name} • {b.grade_level}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoices & Fee History (Hidden from teacher) */}
      {invoices && invoices.length > 0 && (
        <div className="bezel-card p-1.5">
          <div className="bezel-card-inner p-5 space-y-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ReceiptText className="h-4 w-4 text-amber-400" />
              Fee Invoices & Receipts Ledger
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-400 text-[10px] uppercase">
                    <th className="px-3 py-2">Invoice #</th>
                    <th className="px-3 py-2">Due Date</th>
                    <th className="px-3 py-2">Total Amount</th>
                    <th className="px-3 py-2">Paid Amount</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id}>
                      <td className="px-3 py-2 font-mono text-sky-400">{inv.invoice_number}</td>
                      <td className="px-3 py-2 text-zinc-400">{formatDate(inv.due_date)}</td>
                      <td className="px-3 py-2 font-medium text-white">{formatCurrency(inv.total_cents, activeCentre?.currency)}</td>
                      <td className="px-3 py-2 text-emerald-400 font-medium">{formatCurrency(inv.paid_cents, activeCentre?.currency)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
