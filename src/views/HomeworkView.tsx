// src/views/HomeworkView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Homework, Batch } from '../types';
import { apiRequest, formatDate } from '../lib/api';
import {
  BookOpenCheck,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Award,
  X,
  AlertCircle
} from 'lucide-react';

export const HomeworkView: React.FC = () => {
  const { role } = useAuth();
  const [assignments, setAssignments] = useState<Homework[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Assignment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxPoints, setMaxPoints] = useState('50');

  // Submit Homework Modal (for student)
  const [selectedHwToSubmit, setSelectedHwToSubmit] = useState<Homework | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitFileUrl, setSubmitFileUrl] = useState('');

  // Grading Modal (for teacher)
  const [gradingAssignment, setGradingAssignment] = useState<Homework | null>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeError, setGradeError] = useState('');

  const canCreate = ['centre_owner', 'centre_admin', 'teacher'].includes(role || '');

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const [hwRes, bRes] = await Promise.all([
        apiRequest('/homework'),
        apiRequest('/batches').catch(() => ({ batches: [] })),
      ]);
      setAssignments(hwRes.assignments || []);
      setBatches(bRes.batches || []);
      if (bRes.batches?.length > 0) {
        setBatchId(bRes.batches[0].id);
      }
    } catch (err) {
      console.error('Failed to load homework:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [role]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/homework', {
        method: 'POST',
        body: JSON.stringify({
          batchId,
          title,
          instructions,
          dueDate,
          maxPoints: Number(maxPoints),
        }),
      });
      setShowCreateModal(false);
      setTitle('');
      setInstructions('');
      await loadAssignments();
    } catch (err: any) {
      alert(`Error creating homework: ${err.message}`);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHwToSubmit) return;
    try {
      await apiRequest(`/homework/${selectedHwToSubmit.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          textContent: submitText,
          fileUrl: submitFileUrl || null,
        }),
      });
      setSelectedHwToSubmit(null);
      setSubmitText('');
      setSubmitFileUrl('');
      await loadAssignments();
      alert('Homework submitted successfully!');
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    }
  };

  const openGradingDrawer = async (hw: Homework) => {
    setGradingAssignment(hw);
    try {
      const res = await apiRequest(`/homework/${hw.id}`);
      setSubmissionsList(res.submissions || []);
      setSelectedSub(null);
    } catch (err: any) {
      alert(`Failed to load submissions: ${err.message}`);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingAssignment || !selectedSub) return;
    setGradeError('');

    try {
      await apiRequest(`/homework/${gradingAssignment.id}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          submissionId: selectedSub.id,
          score: Number(gradeScore),
          feedback: gradeFeedback,
        }),
      });
      // Refresh list
      const res = await apiRequest(`/homework/${gradingAssignment.id}`);
      setSubmissionsList(res.submissions || []);
      setSelectedSub(null);
      setGradeScore('');
      setGradeFeedback('');
      await loadAssignments();
    } catch (err: any) {
      setGradeError(err.message || 'Failed to grade submission');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <BookOpenCheck className="h-6 w-6 text-purple-400" />
            <span>Homework & Practice Sets</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Task distribution, student text/attachment submissions, and feedback rubrics
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Assignment</span>
          </button>
        )}
      </div>

      {/* Assignment List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-xs text-zinc-500">
            No homework assignments found.
          </div>
        ) : (
          assignments.map((hw) => {
            const isStudent = role === 'student';
            const mySub = hw.mySubmission;

            return (
              <div key={hw.id} className="bezel-card p-1">
                <div className="bezel-card-inner p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                        {hw.subject_name} • {hw.batch_name}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-0.5">{hw.title}</h3>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                      {hw.max_points} Pts
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                    {hw.instructions}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Due {formatDate(hw.due_date)}</span>
                    </div>

                    {isStudent ? (
                      mySub ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            mySub.status === 'graded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'
                          }`}>
                            {mySub.status === 'graded' ? `Score: ${mySub.score}/${hw.max_points}` : 'Submitted'}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedHwToSubmit(hw)}
                          className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition"
                        >
                          Submit Work
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => openGradingDrawer(hw)}
                        className="px-3 py-1.5 rounded-lg border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs font-semibold"
                      >
                        Submissions ({hw.submission_count || 0})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-md">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create Assignment</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Batch *</label>
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-200"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Assignment Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NCERT Chapter 4 Exercises 4.1 to 4.3"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Instructions *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Detailed steps, problems to solve, formulas to write..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Max Points</label>
                    <input
                      type="number"
                      value={maxPoints}
                      onChange={(e) => setMaxPoints(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-semibold shadow-lg shadow-purple-500/20"
                  >
                    Publish Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Student Submit Homework Modal */}
      {selectedHwToSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-md">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Submit: {selectedHwToSubmit.title}
                </h3>
                <button onClick={() => setSelectedHwToSubmit(null)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Your Solution / Text Notes
                  </label>
                  <textarea
                    rows={4}
                    value={submitText}
                    onChange={(e) => setSubmitText(e.target.value)}
                    placeholder="Enter full step-by-step solutions or answer summary here..."
                    className="w-full glass-input p-3 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Attachment / Drive URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={submitFileUrl}
                    onChange={(e) => setSubmitFileUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedHwToSubmit(null)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20"
                  >
                    Submit Homework
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Submissions & Grading Drawer (for teachers) */}
      {gradingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Submissions: {gradingAssignment.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400">Max points: {gradingAssignment.max_points}</p>
                </div>
                <button onClick={() => setGradingAssignment(null)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {submissionsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No submissions received yet from enrolled students.
                </div>
              ) : (
                <div className="space-y-3">
                  {submissionsList.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          {sub.first_name} {sub.last_name} ({sub.admission_no})
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          sub.status === 'graded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {sub.status === 'graded' ? `Score: ${sub.score}/${gradingAssignment.max_points}` : 'Pending Grade'}
                        </span>
                      </div>

                      <div className="bg-black/30 p-2.5 rounded-lg text-zinc-300 font-mono text-[11px]">
                        {sub.text_content || 'No text content submitted.'}
                      </div>

                      {sub.feedback && (
                        <div className="text-[11px] text-zinc-400 italic">
                          Feedback: "{sub.feedback}"
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedSub(sub);
                          setGradeScore(sub.score !== null ? String(sub.score) : '');
                          setGradeFeedback(sub.feedback || '');
                          setGradeError('');
                        }}
                        className="text-[11px] text-sky-400 hover:underline font-medium"
                      >
                        {sub.status === 'graded' ? 'Edit Grade & Feedback' : 'Grade Submission →'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Grading Form Modal Sub-panel */}
              {selectedSub && (
                <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 space-y-3">
                  <div className="font-semibold text-xs text-sky-300">
                    Grading: {selectedSub.first_name} {selectedSub.last_name}
                  </div>

                  {gradeError && (
                    <div className="p-2 rounded bg-rose-500/10 text-rose-300 text-xs flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{gradeError}</span>
                    </div>
                  )}

                  <form onSubmit={handleGradeSubmission} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-zinc-300 mb-1">
                        Score (0 to {gradingAssignment.max_points}) *
                      </label>
                      <input
                        type="number"
                        required
                        max={gradingAssignment.max_points}
                        min={0}
                        value={gradeScore}
                        onChange={(e) => setGradeScore(e.target.value)}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-300 mb-1">Constructive Feedback</label>
                      <input
                        type="text"
                        placeholder="e.g. Excellent proof structure on problem 3."
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSub(null)}
                        className="px-3 py-1.5 text-xs text-zinc-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold"
                      >
                        Save Grade
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
