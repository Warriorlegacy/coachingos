// src/views/AuditLogView.tsx
import React, { useState, useEffect } from 'react';
import { apiRequest, formatDate } from '../lib/api';
import { ShieldCheck, History, User, Activity } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await apiRequest('/reports/audit-log');
        setEvents(res.events || []);
      } catch (err) {
        console.error('Failed to load audit events:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
          <span>Immutable Audit Trail & Compliance Log</span>
        </h1>
        <p className="text-xs text-zinc-400">
          Cryptographically recorded operational changes, attendance corrections, and financial transactions
        </p>
      </div>

      {/* Audit Log Table */}
      <div className="bezel-card p-1.5">
        <div className="bezel-card-inner overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Reason / Context</th>
                <th className="px-4 py-3">Changes (Old → New)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-sky-400">
                      {ev.event_type}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {ev.entity_type} <span className="text-[10px] text-zinc-500">({ev.entity_id})</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-200">
                      {ev.actor_name || ev.actor_user_id}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-sans text-xs">
                      {ev.reason || '—'}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-zinc-400 max-w-[240px] truncate">
                      {ev.old_values_json && <span className="text-rose-400">{ev.old_values_json} → </span>}
                      {ev.new_values_json && <span className="text-emerald-400">{ev.new_values_json}</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
