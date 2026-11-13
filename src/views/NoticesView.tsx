// src/views/NoticesView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Notice, Batch } from '../types';
import { apiRequest, formatDate } from '../lib/api';
import { Megaphone, Plus, AlertTriangle, Calendar, User, X } from 'lucide-react';

export const NoticesView: React.FC = () => {
  const { role } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // Publish Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [audienceType, setAudienceType] = useState<'all_centre' | 'batch'>('all_centre');
  const [batchId, setBatchId] = useState('');

  const canPublish = ['centre_owner', 'centre_admin', 'teacher'].includes(role || '');

  const loadNotices = async () => {
    try {
      setLoading(true);
      const [notRes, bRes] = await Promise.all([
        apiRequest('/notices'),
        apiRequest('/batches').catch(() => ({ batches: [] })),
      ]);
      setNotices(notRes.notices || []);
      setBatches(bRes.batches || []);
      if (bRes.batches?.length > 0) setBatchId(bRes.batches[0].id);
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, [role]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/notices', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          priority,
          audienceType,
          batchId: audienceType === 'batch' ? batchId : null,
        }),
      });
      setShowModal(false);
      setTitle('');
      setContent('');
      await loadNotices();
    } catch (err: any) {
      alert(`Publish failed: ${err.message}`);
    }
  };

  const priorityStyles = {
    normal: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    important: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    urgent: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-sky-400" />
            <span>Centre Notices & Broadcasts</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Targeted announcements across batches, educators, students, and guardians
          </p>
        </div>

        {canPublish && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Publish Notice</span>
          </button>
        )}
      </div>

      {/* Notices Feed */}
      <div className="space-y-3">
        {notices.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No active notices on the board.
          </div>
        ) : (
          notices.map((n) => (
            <div key={n.id} className="bezel-card p-1">
              <div className="bezel-card-inner p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${priorityStyles[n.priority]}`}>
                        {n.priority}
                      </span>
                      {n.batch_name && (
                        <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                          {n.batch_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white mt-1.5">{n.title}</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formatDate(n.created_at)}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {n.content}
                </p>

                <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-zinc-500">
                  <User className="h-3 w-3" />
                  <span>Published by {n.publisher_name}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Publish Notice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-md">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Publish Notice</h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handlePublish} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science Olympiad Mock Exam Next Weekend"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-200"
                    >
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Audience</label>
                    <select
                      value={audienceType}
                      onChange={(e) => setAudienceType(e.target.value as any)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-200"
                    >
                      <option value="all_centre">All Centre</option>
                      <option value="batch">Specific Batch</option>
                    </select>
                  </div>
                </div>

                {audienceType === 'batch' && (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Select Batch</label>
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
                )}

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Notice Content *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Details, venue, timings, requirements..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20"
                  >
                    Broadcast Notice
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
