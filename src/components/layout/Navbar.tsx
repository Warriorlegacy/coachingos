// src/components/layout/Navbar.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  GraduationCap,
  Bell,
  LogOut,
  ChevronDown,
  UserCheck,
  Building2,
  Sparkles
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, activeCentre, role, demoLogin, logout } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const roles: { role: UserRole; label: string; icon: string }[] = [
    { role: 'centre_owner', label: 'Centre Owner (Ramesh)', icon: '👑' },
    { role: 'centre_admin', label: 'Centre Admin (Anita)', icon: '⚙️' },
    { role: 'teacher', label: 'Batch Teacher (Vikram)', icon: '👨‍🏫' },
    { role: 'student', label: 'Enrolled Student (Rohan)', icon: '🎓' },
    { role: 'parent_guardian', label: 'Parent / Guardian (Sunil)', icon: '👨‍👧' },
    { role: 'accountant', label: 'Accountant (Deepak)', icon: '📊' },
  ];

  const roleBadgeColors: Record<UserRole, string> = {
    centre_owner: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    centre_admin: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    teacher: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    student: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    parent_guardian: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    accountant: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Active Centre */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white sm:text-lg">CoachingOS</span>
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400 ring-1 ring-sky-500/30">
                PROD
              </span>
            </div>
            {activeCentre && (
              <div className="hidden items-center gap-1 text-xs text-zinc-400 sm:flex">
                <Building2 className="h-3 w-3 text-zinc-500" />
                <span className="truncate max-w-[200px]">{activeCentre.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* 1-Click Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
              aria-label="Switch Role"
            >
              <UserCheck className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Role:</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${role ? roleBadgeColors[role] : ''}`}>
                {role?.replace('_', ' ')}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#121216] p-2 shadow-2xl backdrop-blur-2xl z-50">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Switch Persona (Demo Sandbox)
                </div>
                <div className="space-y-1">
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      onClick={async () => {
                        setShowRoleMenu(false);
                        await demoLogin(r.role);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                        role === r.role
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </span>
                      {role === r.role && <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-medium text-zinc-200">{user?.name}</div>
              <div className="text-[10px] text-zinc-500">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-400"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
