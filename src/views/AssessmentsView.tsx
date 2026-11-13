// src/views/AssessmentsView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Assessment, Batch, AssessmentScore } from '../types';
import { apiRequest, formatDate } from '../lib/api';
import {
  Award,
  Plus,
  Calendar,
  CheckCircle2,
  TrendingUp,
  X,
  AlertCircle,
  Save,
  Users
} from 'lucide-react';

export const AssessmentsView: React.FC = () => {
  const { role } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [title, setTitle] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [maxMarks, setMaxMarks] = useState('100');
  const [passingMarks, setPassingMarks] = useState('40');
  const [instructions, setInstructions] = useState('');
  const [createError, setCreateError] = useState('');

  // Score Entry Modal (for teachers)
  const [scoringAssessment, setScoringAssessment] = useState<Assessment | null>(null);
  const [scoresRoster, setScoresRoster] = useState<AssessmentScore[]>([]);
  const [savingScores, setSavingScores] = useState(false);
  const [scoreError, setScoreError] = useState('');

  const canCreate = ['centre_owner', 'centre_admin', 'teacher'].includes(role || '');

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const [asmRes, bRes] = await Promise.all([
        apiRequest('/assessments'),
        apiRequest('/batches').catch(() => ({ batches: [] })),
      ]);
      setAssessments(asmRes.assessments || []);
      setBatches(bRes.batches || []);
      if (bRes.batches?.length > 0) {
        setBatchId(bRes.batches[0].id);
      }
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, [role]);

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      await apiRequest('/assessments', {
        method: 'POST',
        body: JSON.stringify({
          batchId,
          title,
          assessmentDate,
          maxMarks: Number(maxMarks),
          passingMarks: Number(passingMarks),
          instructions,
        }),
      });
      setShowCreateModal(false);
      setTitle('');
      await loadAssessments();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create assessment');
    }
  };

  const openScoreMatrix = async (asm: Assessment) => {
    setScoringAssessment(asm);
    setScoreError('');
    try {
      const res = await apiRequest(`/assessments/${asm.id}`);
      setScoresRoster(
        (res.scores || []).map((s: any) => ({
          student_id: s.student_id,
          admission_no: s.admission_no,
          first_name: s.first_name,
          last_name: s.last_name,
          marks_obtained: s.marks_obtained,
          is_absent: !!s.is_absent,
          is_exempt: !!s.is_exempt,
          teacher_comments: s.teacher_comments || '',
        }))
      );
    } catch (err: any) {
      alert(`Failed to load score sheet: ${err.message}`);
    }
  };

  const handleSaveScores = async () => {
    if (!scoringAssessment) return;
    setSavingScores(true);
    setScoreError('');

    try {
      await apiRequest(`/assessments/${scoringAssessment.id}/scores`, {
        method: 'POST',
        body: JSON.stringify({
          scores: scoresRoster.map((s) => ({
            studentId: s.student_id,
            marksObtained: s.marks_obtained !== null && s.marks_obtained !== undefined && s.marks_obtained !== ('' as any)
              ? Number(s.marks_obtained)
              : null,
            isAbsent: s.is_absent,
            isExempt: s.is_exempt,
            teacherComments: s.teacher_comments,
          })),
        }),
      });
      setScoringAssessment(null);
      await loadAssessments();
      alert('Scores recorded and updated successfully!');
    } catch (err: any) {
      setScoreError(err.message || 'Failed to save scores');
    } finally {
      setSavingScores(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-emerald-400" />
            <span>Assessments & Results</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Unit tests, diagnostic exams, score bounds validation, and holistic student growth
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Assessment</span>
          </button>
        )}
      </div>

      {/* Assessment List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessments.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-xs text-zinc-500">
            No assessments recorded yet.
          </div>
        ) : (
          assessments.map((asm) => {
            const isStudent = role === 'student';
            const myScore = asm.myScore;

            return (
              <div key={asm.id} className="bezel-card p-1">
                <div className="bezel-card-inner p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                        {asm.subject_name} • {asm.batch_name}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-0.5">{asm.title}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                        Max {asm.max_marks}
                      </span>
                      <div className="text-[10px] text-zinc-500 mt-1">Pass: {asm.passing_marks}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400">Date</span>
                      <div className="font-semibold text-zinc-200 mt-0.5">{formatDate(asm.assessment_date)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400">Class Average</span>
                      <div className="font-semibold text-emerald-400 mt-0.5">
                        {asm.average_score !== null && asm.average_score !== undefined ? `${asm.average_score} / ${asm.max_marks}` : 'Pending marks'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    {isStudent ? (
                      myScore ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            myScore.marks_obtained !== null && myScore.marks_obtained >= asm.passing_marks
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            Score: {myScore.marks_obtained ?? 'Absent'} / {asm.max_marks}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">Results pending</span>
                      )
                    ) : (
                      <button
                        onClick={() => openScoreMatrix(asm)}
                        className="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs font-semibold"
                      >
                        Enter / Edit Marks →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-md">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Schedule Assessment</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateAssessment} className="space-y-3">
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
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit 3 Trigonometry Diagnostic Exam"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={assessmentDate}
                      onChange={(e) => setAssessmentDate(e.target.value)}
                      className="w-full glass-input px-2.5 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Max Marks *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(e.target.value)}
                      className="w-full glass-input px-2.5 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Pass Marks</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={passingMarks}
                      onChange={(e) => setPassingMarks(e.target.value)}
                      className="w-full glass-input px-2.5 py-2 rounded-xl text-xs font-mono"
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
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20"
                  >
                    Create Assessment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Enter / Edit Marks Matrix Modal */}
      {scoringAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Score Matrix: {scoringAssessment.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Max Marks: {scoringAssessment.max_marks} • Pass: {scoringAssessment.passing_marks}
                  </p>
                </div>
                <button onClick={() => setScoringAssessment(null)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {scoreError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{scoreError}</span>
                </div>
              )}

              <div className="divide-y divide-white/5">
                {scoresRoster.map((s, idx) => (
                  <div key={s.student_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-white">
                        {s.first_name} {s.last_name}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500">{s.admission_no}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-zinc-400">Absent</label>
                        <input
                          type="checkbox"
                          checked={s.is_absent}
                          onChange={(e) => {
                            const updated = [...scoresRoster];
                            updated[idx].is_absent = e.target.checked;
                            if (e.target.checked) updated[idx].marks_obtained = null;
                            setScoresRoster(updated);
                          }}
                          className="rounded bg-white/10"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          disabled={s.is_absent}
                          placeholder="Marks"
                          min={0}
                          max={scoringAssessment.max_marks}
                          value={s.marks_obtained !== null && s.marks_obtained !== undefined ? s.marks_obtained : ''}
                          onChange={(e) => {
                            const updated = [...scoresRoster];
                            updated[idx].marks_obtained = e.target.value === '' ? null : Number(e.target.value);
                            setScoresRoster(updated);
                          }}
                          className="w-20 glass-input px-2.5 py-1.5 rounded-lg text-xs font-mono text-right"
                        />
                        <span className="text-[10px] text-zinc-500">/ {scoringAssessment.max_marks}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setScoringAssessment(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveScores}
                  disabled={savingScores}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingScores ? 'Saving Scores...' : 'Commit Scores'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
