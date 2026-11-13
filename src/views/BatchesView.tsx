// src/views/BatchesView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Batch } from '../types';
import { apiRequest } from '../lib/api';
import {
  Layers,
  Plus,
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';

export const BatchesView: React.FC = () => {
  const { role } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [timetableRules, setTimetableRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Batch modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 10');
  const [subjectId, setSubjectId] = useState('');
  const [capacity, setCapacity] = useState('30');
  const [roomOrLink, setRoomOrLink] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [formError, setFormError] = useState('');

  const canEdit = ['centre_owner', 'centre_admin'].includes(role || '');

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchRes, ttRes, centreRes, staffRes] = await Promise.all([
        apiRequest('/batches'),
        apiRequest('/batches/timetable/all').catch(() => ({ rules: [] })),
        apiRequest('/centre').catch(() => ({ subjects: [] })),
        apiRequest('/centre/staff').catch(() => ({ staff: [] })),
      ]);

      setBatches(batchRes.batches || []);
      setTimetableRules(ttRes.rules || []);
      setSubjects(centreRes.subjects || []);
      setTeachers(staffRes.staff?.filter((s: any) => s.role === 'teacher') || []);
      if (centreRes.subjects?.length > 0) {
        setSubjectId(centreRes.subjects[0].id);
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await apiRequest('/batches', {
        method: 'POST',
        body: JSON.stringify({
          name,
          gradeLevel,
          subjectId,
          capacity: Number(capacity),
          roomOrLink,
          teacherUserIds: selectedTeacherId ? [selectedTeacherId] : [],
        }),
      });
      setShowAddModal(false);
      setName('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create batch');
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-sky-400" />
            <span>Batches & Timetable</span>
          </h1>
          <p className="text-xs text-zinc-400">
            {batches.length} active coaching batch(es) with schedule conflict guardrails
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Batch</span>
          </button>
        )}
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((b) => {
          const capPercent = Math.min(100, Math.round(((b.enrolled_count || 0) / (b.capacity || 30)) * 100));
          return (
            <div key={b.id} className="bezel-card p-1">
              <div className="bezel-card-inner p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                      {b.subject_name} • {b.grade_level}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{b.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {b.status}
                  </span>
                </div>

                {/* Capacity meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Enrolled</span>
                    <span className="text-white font-medium">
                      {b.enrolled_count} / {b.capacity} Students ({capPercent}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        capPercent >= 90 ? 'bg-amber-400' : 'bg-sky-400'
                      }`}
                      style={{ width: `${capPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                    <Users className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="truncate">{b.teacher_names || 'No teacher assigned'}</span>
                  </div>
                  <div className="font-mono text-[10px] text-zinc-500">{b.room_or_link || 'Room 101'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timetable Overview */}
      <div className="bezel-card p-1.5">
        <div className="bezel-card-inner p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sky-400" />
              <span>Timetable Rules & Schedule Slots</span>
            </h3>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Conflict Protection Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-zinc-400 text-[10px] uppercase">
                  <th className="px-3 py-2">Day</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Time Slot</th>
                  <th className="px-3 py-2">Teacher</th>
                  <th className="px-3 py-2">Location / Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {timetableRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-zinc-500">
                      No timetable rules scheduled yet.
                    </td>
                  </tr>
                ) : (
                  timetableRules.map((tr) => (
                    <tr key={tr.id}>
                      <td className="px-3 py-2.5 font-semibold text-sky-400">
                        {dayNames[tr.day_of_week] || 'Day ' + tr.day_of_week}
                      </td>
                      <td className="px-3 py-2.5 text-white font-medium">{tr.batch_name}</td>
                      <td className="px-3 py-2.5 font-mono text-zinc-300">
                        {tr.start_time} – {tr.end_time}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">{tr.teacher_names || '—'}</td>
                      <td className="px-3 py-2.5 text-zinc-500">{tr.room || 'Room 101'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-md">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create New Batch</h3>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateBatch} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Batch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 11 CBSE Physics Evening"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Grade Level *</label>
                    <input
                      type="text"
                      required
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Subject *</label>
                    <select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-300"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Capacity</label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Assign Teacher</label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-300"
                    >
                      <option value="">No teacher</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Room / Meeting Link</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 102 / Lab A"
                    value={roomOrLink}
                    onChange={(e) => setRoomOrLink(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20"
                  >
                    Create Batch
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
