// src/views/AttendanceView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Batch, AttendanceRecord } from '../types';
import { apiRequest } from '../lib/api';
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Sparkles,
  Save,
  Wifi,
  WifiOff,
  History,
  AlertCircle
} from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const { role } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState('Period 1');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isNewSession, setIsNewSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Offline queue support
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    try {
      const q = localStorage.getItem('coachingos_att_queue');
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  });

  // Edit reason modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch batches
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await apiRequest('/batches');
        const bList = res.batches || [];
        setBatches(bList);
        if (bList.length > 0) {
          setSelectedBatchId(bList[0].id);
        }
      } catch (err) {
        console.error('Failed to load batches:', err);
      }
    }
    loadBatches();
  }, [role]);

  // Load session records when batch, date or period changes
  const loadSession = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      setSaveMessage('');
      const res = await apiRequest(`/attendance/session?batchId=${selectedBatchId}&date=${date}&period=${period}`);
      setIsNewSession(!res.exists);
      setRecords(res.records || []);
    } catch (err: any) {
      console.error('Failed to load attendance session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [selectedBatchId, date, period]);

  // One-tap Mark All Present
  const handleMarkAll = (status: 'present' | 'absent') => {
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status,
      }))
    );
  };

  // Toggle record status with audit checking
  const handleToggleStatus = (record: AttendanceRecord, newStatus: 'present' | 'absent' | 'late' | 'excused') => {
    if (record.status === newStatus) return;

    // If session was already recorded previously, prompt for mandatory edit reason
    if (!isNewSession && record.id) {
      setEditingRecord(record);
      setTargetStatus(newStatus);
      setEditReason('');
      return;
    }

    // In drafting mode, update directly
    setRecords((prev) =>
      prev.map((r) => (r.student_id === record.student_id ? { ...r, status: newStatus } : r))
    );
  };

  const handleConfirmEditReason = async () => {
    if (!editingRecord || !editReason.trim()) return;

    try {
      if (editingRecord.id) {
        await apiRequest(`/attendance/records/${editingRecord.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: targetStatus,
            editReason: editReason.trim(),
          }),
        });
      }

      setRecords((prev) =>
        prev.map((r) => (r.student_id === editingRecord.student_id ? { ...r, status: targetStatus, edit_reason: editReason } : r))
      );
      setEditingRecord(null);
      setEditReason('');
    } catch (err: any) {
      alert(`Failed to update record: ${err.message}`);
    }
  };

  // Submit attendance
  const handleSubmitAttendance = async () => {
    setSaving(true);
    setSaveMessage('');

    const payload = {
      batchId: selectedBatchId,
      date,
      period,
      records: records.map((r) => ({
        studentId: r.student_id,
        status: r.status,
        remarks: r.remarks,
      })),
    };

    if (!navigator.onLine) {
      // Save to offline queue
      const newQueue = [...offlineQueue, { ...payload, clientTimestamp: new Date().toISOString() }];
      setOfflineQueue(newQueue);
      localStorage.setItem('coachingos_att_queue', JSON.stringify(newQueue));
      setSaveMessage('Saved to offline queue. Will sync when reconnected.');
      setSaving(false);
      return;
    }

    try {
      await apiRequest('/attendance/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setIsNewSession(false);
      setSaveMessage('✓ Attendance successfully recorded and locked.');
      await loadSession();
    } catch (err: any) {
      setSaveMessage(`Error saving attendance: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Sync offline queue
  const handleSyncOffline = async () => {
    if (offlineQueue.length === 0) return;
    try {
      const res = await apiRequest('/attendance/sync-offline', {
        method: 'POST',
        body: JSON.stringify({ queue: offlineQueue }),
      });
      setOfflineQueue([]);
      localStorage.removeItem('coachingos_att_queue');
      alert(`Synchronized ${res.syncedCount} offline session(s)!`);
      await loadSession();
    } catch (err: any) {
      alert(`Offline sync failed: ${err.message}`);
    }
  };

  const statusColors = {
    present: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    absent: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    late: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    excused: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  };

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const lateCount = records.filter((r) => r.status === 'late').length;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <CalendarCheck2 className="h-6 w-6 text-sky-400" />
            <span>Classroom Attendance</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Rapid mobile roster • Sub-15 second classroom workflow • Immutable audit logging
          </p>
        </div>

        {/* Network & Offline Status */}
        <div className="flex items-center gap-2 text-xs">
          {isOnline ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wifi className="h-3.5 w-3.5" />
              <span>Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <WifiOff className="h-3.5 w-3.5" />
              <span>Offline Mode</span>
            </span>
          )}

          {offlineQueue.length > 0 && (
            <button
              onClick={handleSyncOffline}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30"
            >
              <span>Sync {offlineQueue.length} Queued</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Session Selector Bar */}
      <div className="bezel-card p-1.5">
        <div className="bezel-card-inner p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Select Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-200"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.grade_level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Session Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-200"
            >
              <option value="Period 1">Period 1 (Morning)</option>
              <option value="Period 2">Period 2 (Mid-Day)</option>
              <option value="Period 3">Period 3 (Evening)</option>
              <option value="Doubt Session">Special Doubt Session</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Counter & Bulk Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-zinc-400">Roster: <strong className="text-white">{records.length}</strong></span>
          <span className="text-emerald-400">Present: <strong>{presentCount}</strong></span>
          <span className="text-rose-400">Absent: <strong>{absentCount}</strong></span>
          <span className="text-amber-400">Late: <strong>{lateCount}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMarkAll('present')}
            className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold"
          >
            Mark All Present
          </button>
          <button
            onClick={() => handleMarkAll('absent')}
            className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold"
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {/* Classroom Attendance Roster */}
      <div className="bezel-card p-1.5">
        <div className="bezel-card-inner p-4 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Loading roster...</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No students enrolled in this batch.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {records.map((r) => (
                <div
                  key={r.student_id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition rounded-xl"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">
                        {r.first_name} {r.last_name}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
                        {r.admission_no}
                      </span>
                    </div>
                    {r.edit_reason && (
                      <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                        <History className="h-3 w-3 text-sky-400" />
                        <span>Edited: {r.edit_reason}</span>
                      </div>
                    )}
                  </div>

                  {/* 4-State Toggle Pills */}
                  <div className="grid grid-cols-4 gap-1.5 sm:w-auto">
                    {(['present', 'late', 'absent', 'excused'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleToggleStatus(r, st)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                          r.status === st
                            ? statusColors[st] + ' shadow-md'
                            : 'border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submit Action Footer */}
          {records.length > 0 && (
            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
              {saveMessage && (
                <div className="text-xs text-sky-400 font-medium">{saveMessage}</div>
              )}
              <div className="sm:ml-auto">
                <button
                  onClick={handleSubmitAttendance}
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Locking Attendance...' : 'Save & Lock Attendance'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Audit Reason Modal for Corrections */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-md">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="h-4 w-4" />
                <span>Attendance Correction Audit</span>
              </div>
              <p className="text-xs text-zinc-300">
                You are changing status for <strong>{editingRecord.first_name} {editingRecord.last_name}</strong> from{' '}
                <span className="uppercase font-semibold text-zinc-400">{editingRecord.status}</span> to{' '}
                <span className="uppercase font-semibold text-sky-400">{targetStatus}</span>.
              </p>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Reason for modification (Mandatory for audit trail) *
                </label>
                <textarea
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Student arrived with bus breakdown note / medical slip verified"
                  className="w-full glass-input p-3 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEditReason}
                  disabled={!editReason.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold disabled:opacity-40"
                >
                  Confirm & Log Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
