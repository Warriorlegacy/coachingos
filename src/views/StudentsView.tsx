// src/views/StudentsView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Student } from '../types';
import { apiRequest } from '../lib/api';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink
} from 'lucide-react';

export const StudentsView: React.FC = () => {
  const { role } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // New Student form
  const [formData, setFormData] = useState({
    admissionNo: '',
    firstName: '',
    lastName: '',
    gradeLevel: 'Grade 10',
    enrollmentDate: new Date().toISOString().slice(0, 10),
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: 'Parent',
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // CSV Import state
  const [csvContent, setCsvContent] = useState('');
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  const canEdit = ['centre_owner', 'centre_admin'].includes(role || '');

  const loadStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (grade) params.append('grade', grade);

      const data = await apiRequest(`/students?${params.toString()}`);
      setStudents(data.students || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [search, grade]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      await apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify({
          admissionNo: formData.admissionNo,
          firstName: formData.firstName,
          lastName: formData.lastName,
          gradeLevel: formData.gradeLevel,
          enrollmentDate: formData.enrollmentDate,
          guardian: formData.guardianName ? {
            name: formData.guardianName,
            phone: formData.guardianPhone,
            relationship: formData.guardianRelationship,
          } : undefined,
        }),
      });
      setShowAddModal(false);
      setFormData({
        admissionNo: '',
        firstName: '',
        lastName: '',
        gradeLevel: 'Grade 10',
        enrollmentDate: new Date().toISOString().slice(0, 10),
        guardianName: '',
        guardianPhone: '',
        guardianRelationship: 'Parent',
      });
      await loadStudents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create student');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDryRunCsv = async () => {
    try {
      setImportStatus('Running dry-run validation...');
      const res = await apiRequest('/students/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csvContent, dryRun: true }),
      });
      setDryRunResult(res);
      setImportStatus('');
    } catch (err: any) {
      setImportStatus(`Validation failed: ${err.message}`);
    }
  };

  const handleCommitCsv = async () => {
    try {
      setImportStatus('Importing validated rows...');
      const res = await apiRequest('/students/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csvContent, dryRun: false }),
      });
      setImportStatus(`Successfully imported ${res.importedCount} student(s)!`);
      await loadStudents();
      setTimeout(() => {
        setShowImportModal(false);
        setCsvContent('');
        setDryRunResult(null);
        setImportStatus('');
      }, 1500);
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-sky-400" />
            <span>Student Directory</span>
          </h1>
          <p className="text-xs text-zinc-400">
            {students.length} student profile(s) enrolled in this centre
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Import CSV</span>
            </button>

            <a
              href="/api/v1/students/export/csv"
              download
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 transition"
            >
              <Download className="h-4 w-4 text-zinc-400" />
              <span>Export CSV</span>
            </a>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>New Student</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or admission number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs"
          />
        </div>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="rounded-xl glass-input px-3 py-2 text-xs text-zinc-300"
        >
          <option value="">All Grades</option>
          <option value="Grade 10">Grade 10</option>
          <option value="Grade 11">Grade 11</option>
          <option value="Grade 12">Grade 12</option>
        </select>
      </div>

      {/* Student List Table */}
      <div className="bezel-card p-1.5">
        <div className="bezel-card-inner overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Admission No</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Batches</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No students match the criteria.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono font-medium text-sky-400">
                      {s.admission_no}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{s.grade_level}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.batch_count || 1} Batch(es)</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/students/${s.id}`}
                        className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
                      >
                        <span>View 360°</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-lg">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add Enrolled Student</h3>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Admission No *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. APEX-2026-010"
                      value={formData.admissionNo}
                      onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Grade / Class *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grade 10"
                      value={formData.gradeLevel}
                      onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Guardian Details (Optional)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Guardian Name"
                        value={formData.guardianName}
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Guardian Phone"
                        value={formData.guardianPhone}
                        onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>
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
                    disabled={formSubmitting}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20"
                  >
                    {formSubmitting ? 'Saving...' : 'Add Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-xl">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span>Bulk CSV Import with Dry-Run Validation</span>
                </h3>
                <button onClick={() => setShowImportModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-400">
                Paste CSV content below. Header must include <code>admission_no,first_name,last_name,grade_level</code>.
              </p>

              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="admission_no,first_name,last_name,grade_level&#10;APEX-2026-020,Siddharth,Malhotra,Grade 10&#10;APEX-2026-021,Kavita,Raman,Grade 12"
                className="w-full glass-input p-3 rounded-xl text-xs font-mono"
              />

              {importStatus && (
                <div className="text-xs text-sky-400 font-medium">{importStatus}</div>
              )}

              {dryRunResult && (
                <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Validation Summary:</span>
                    <span className="text-emerald-400">{dryRunResult.validCount} Valid</span>
                  </div>
                  {dryRunResult.errorCount > 0 && (
                    <div className="space-y-1 text-rose-300">
                      {dryRunResult.errors.map((err: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>Row {err.row}: {err.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleDryRunCsv}
                  disabled={!csvContent.trim()}
                  className="px-3.5 py-2 rounded-xl border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-xs font-medium"
                >
                  Preview & Validate
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitCsv}
                    disabled={!dryRunResult || dryRunResult.validCount === 0}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold disabled:opacity-40"
                  >
                    Commit Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
