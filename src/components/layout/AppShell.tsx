// src/components/layout/AppShell.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarCheck2,
  BookOpenCheck,
  Award,
  ReceiptText,
  Megaphone,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();

  // Navigation config based on active role
  const getNavItems = () => {
    const items = [
      { to: '/', label: 'Overview', icon: LayoutDashboard },
    ];

    if (['centre_owner', 'centre_admin'].includes(role || '')) {
      items.push(
        { to: '/students', label: 'Students', icon: Users },
        { to: '/batches', label: 'Batches', icon: Layers },
        { to: '/attendance', label: 'Attendance', icon: CalendarCheck2 },
        { to: '/homework', label: 'Homework', icon: BookOpenCheck },
        { to: '/assessments', label: 'Assessments', icon: Award },
        { to: '/fees', label: 'Fees & Invoices', icon: ReceiptText },
        { to: '/notices', label: 'Notices', icon: Megaphone },
        { to: '/ai', label: 'AI Assistant', icon: Sparkles },
        { to: '/audit', label: 'Audit Trail', icon: ShieldCheck },
      );
    } else if (role === 'teacher') {
      items.push(
        { to: '/attendance', label: 'Take Attendance', icon: CalendarCheck2 },
        { to: '/homework', label: 'Homework', icon: BookOpenCheck },
        { to: '/assessments', label: 'Assessments', icon: Award },
        { to: '/students', label: 'My Students', icon: Users },
        { to: '/batches', label: 'My Batches', icon: Layers },
        { to: '/notices', label: 'Notices', icon: Megaphone },
        { to: '/ai', label: 'Lesson Planner', icon: Sparkles },
      );
    } else if (role === 'student') {
      items.push(
        { to: '/homework', label: 'My Homework', icon: BookOpenCheck },
        { to: '/assessments', label: 'My Results', icon: Award },
        { to: '/attendance', label: 'My Attendance', icon: CalendarCheck2 },
        { to: '/notices', label: 'Notices', icon: Megaphone },
      );
    } else if (role === 'parent_guardian') {
      items.push(
        { to: '/students', label: 'Child Profile', icon: Users },
        { to: '/attendance', label: 'Attendance', icon: CalendarCheck2 },
        { to: '/homework', label: 'Homework Status', icon: BookOpenCheck },
        { to: '/assessments', label: 'Report Card', icon: Award },
        { to: '/fees', label: 'Fee Receipts', icon: ReceiptText },
        { to: '/notices', label: 'Notices', icon: Megaphone },
      );
    } else if (role === 'accountant') {
      items.push(
        { to: '/fees', label: 'Fee Ledger', icon: ReceiptText },
        { to: '/students', label: 'Student Directory', icon: Users },
        { to: '/ai', label: 'Fee Reminders', icon: Sparkles },
      );
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col">
      <Navbar />

      <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 pb-24 md:pb-8 flex flex-col md:flex-row gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-64 shrink-0">
          <nav className="sticky top-24 space-y-1 rounded-2xl border border-white/5 bg-[#121216]/60 p-3 backdrop-blur-xl">
            <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              Management Portal
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 font-semibold shadow-inner'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#09090b]/95 backdrop-blur-xl px-2 py-2 flex justify-around items-center">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-medium transition ${
                isActive ? 'text-sky-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate max-w-[64px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
