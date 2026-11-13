// src/views/AIAssistantView.tsx
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { Sparkles, BookOpen, UserCheck, MessageSquare, Copy, Check, AlertCircle } from 'lucide-react';

export const AIAssistantView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lesson' | 'reminder'>('lesson');

  // Lesson Planner state
  const [subject, setSubject] = useState('Mathematics');
  const [topic, setTopic] = useState('Trigonometric Identities and Applications');
  const [gradeLevel, setGradeLevel] = useState('Grade 10');
  const [duration, setDuration] = useState('60');
  const [planResult, setPlanResult] = useState('');
  const [planProvider, setPlanProvider] = useState('');
  const [planLoading, setPlanLoading] = useState(false);

  // Fee Reminder state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvId, setSelectedInvId] = useState('');
  const [reminderResult, setReminderResult] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const res = await apiRequest('/fees/invoices?status=unpaid');
        const list = res.invoices || [];
        setInvoices(list);
        if (list.length > 0) setSelectedInvId(list[0].id);
      } catch { /* ignored */ }
    }
    loadInvoices();
  }, []);

  const handleGenerateLessonPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanLoading(true);
    setPlanResult('');
    try {
      const res = await apiRequest('/ai/lesson-plan', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          topic,
          gradeLevel,
          durationMinutes: Number(duration),
        }),
      });
      setPlanResult(res.plan);
      setPlanProvider(res.provider);
    } catch (err: any) {
      alert(`AI Lesson plan failed: ${err.message}`);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleGenerateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvId) return;
    setReminderLoading(true);
    setReminderResult('');
    try {
      const res = await apiRequest('/ai/fee-reminder', {
        method: 'POST',
        body: JSON.stringify({ invoiceId: selectedInvId }),
      });
      setReminderResult(res.message);
    } catch (err: any) {
      alert(`Fee reminder failed: ${err.message}`);
    } finally {
      setReminderLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-sky-400" />
          <span>AI Pedagogical & Admin Assistant</span>
        </h1>
        <p className="text-xs text-zinc-400">
          Powered by Gemini / Groq / Cloudflare Workers AI with deterministic heuristic fallbacks
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('lesson')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'lesson'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-zinc-400 hover:bg-white/5'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Interactive Lesson Planner</span>
        </button>

        <button
          onClick={() => setActiveTab('reminder')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'reminder'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-zinc-400 hover:bg-white/5'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Fee Reminder Composer</span>
        </button>
      </div>

      {/* 1. Lesson Planner */}
      {activeTab === 'lesson' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bezel-card p-1.5">
            <div className="bezel-card-inner p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Lesson Parameters</h3>

              <form onSubmit={handleGenerateLessonPlan} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Topic *</label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Grade</label>
                    <input
                      type="text"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Minutes</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={planLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{planLoading ? 'Generating Lesson Plan...' : 'Generate Plan & Quiz'}</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 bezel-card p-1.5">
            <div className="bezel-card-inner p-6 space-y-4 min-h-[400px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Generated Output {planProvider && `(${planProvider})`}
                </span>
                {planResult && (
                  <button
                    onClick={() => copyToClipboard(planResult)}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Plan'}</span>
                  </button>
                )}
              </div>

              {planResult ? (
                <div className="text-xs text-zinc-200 whitespace-pre-line leading-relaxed font-sans">
                  {planResult}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500 text-xs">
                  <Sparkles className="h-8 w-8 text-zinc-600 mb-2" />
                  <span>Fill in topic parameters and click generate to create a pedagogy-backed lesson plan.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Fee Reminder Composer */}
      {activeTab === 'reminder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bezel-card p-1.5">
            <div className="bezel-card-inner p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Invoice Selection</h3>

              <form onSubmit={handleGenerateReminder} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Pending Invoice *</label>
                  <select
                    value={selectedInvId}
                    onChange={(e) => setSelectedInvId(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-200"
                  >
                    {invoices.length === 0 ? (
                      <option value="">No outstanding invoices</option>
                    ) : (
                      invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} — {inv.first_name} {inv.last_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={reminderLoading || !selectedInvId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{reminderLoading ? 'Formatting...' : 'Compose Polite Reminder'}</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 bezel-card p-1.5">
            <div className="bezel-card-inner p-6 space-y-4 min-h-[300px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  WhatsApp / SMS Message Draft
                </span>
                {reminderResult && (
                  <button
                    onClick={() => copyToClipboard(reminderResult)}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Message'}</span>
                  </button>
                )}
              </div>

              {reminderResult ? (
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-200 leading-relaxed font-sans">
                  {reminderResult}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-500 text-xs">
                  <MessageSquare className="h-8 w-8 text-zinc-600 mb-2" />
                  <span>Select a student invoice to generate a customized, courteous payment reminder.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
