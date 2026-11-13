// src/views/LoginView.tsx
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { GraduationCap, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, demoLogin, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (role: UserRole) => {
    setError('');
    try {
      await demoLogin(role);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    }
  };

  const demoRoles: { role: UserRole; title: string; desc: string; icon: string }[] = [
    { role: 'centre_owner', title: 'Centre Owner', desc: 'Ramesh Sharma — Full institute control, fees & staff', icon: '👑' },
    { role: 'centre_admin', title: 'Centre Admin', desc: 'Anita Verma — Batches, enrollments & timetable', icon: '⚙️' },
    { role: 'teacher', title: 'Batch Teacher', desc: 'Vikram Sen — Attendance, homework & test grading', icon: '👨‍🏫' },
    { role: 'student', title: 'Enrolled Student', desc: 'Rohan Gupta — Homework submissions & results', icon: '🎓' },
    { role: 'parent_guardian', title: 'Parent / Guardian', desc: 'Sunil Gupta — Child attendance, results & receipts', icon: '👨‍👧' },
    { role: 'accountant', title: 'Accountant', desc: 'Deepak Patel — Fee ledger, invoices & receipts', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient radial lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-xl shadow-sky-500/20 mb-2">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">CoachingOS</h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Operating system for independent tutors and coaching centres
          </p>
        </div>

        {/* 1-Click Sandbox Persona Selector */}
        <div className="bezel-card p-1.5">
          <div className="bezel-card-inner p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                1-Click Demo Sandbox
              </span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-zinc-300">Live Roles</span>
            </div>
            <p className="text-xs text-zinc-400">
              Select any role below to explore CoachingOS with preloaded synthetic data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoRoles.map((dr) => (
                <button
                  key={dr.role}
                  onClick={() => handleDemoSelect(dr.role)}
                  className="flex flex-col text-left p-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-sky-500/30 transition group"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200 group-hover:text-sky-300">
                    <span>{dr.icon}</span>
                    <span>{dr.title}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 line-clamp-1">{dr.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Traditional Credentials Form */}
        <div className="bezel-card p-1.5">
          <div className="bezel-card-inner p-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Or Sign In with Email
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. owner@coachingos.demo"
                  required
                  className="w-full rounded-xl glass-input px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl glass-input px-3.5 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs py-2.5 transition shadow-lg shadow-sky-500/20 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-zinc-600 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
          <span>Production-grade RBAC • Free-first Cloudflare Architecture</span>
        </div>
      </div>
    </div>
  );
};
