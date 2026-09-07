import { useState } from 'react';
import { Sparkles, Menu, X, LogOut, FolderClosed } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { View } from '@/types';

interface NavbarProps {
  view: View;
  onViewChange: (view: View) => void;
  onAuthClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function Navbar({ view, onViewChange, onAuthClick, searchQuery, onSearchChange }: NavbarProps) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { key: View; label: string }[] = [
    { key: 'browse', label: 'Browse' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'folders', label: 'Folders' },
    { key: 'admin', label: 'Admin' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <button onClick={() => onViewChange('browse')} className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-ink-900">
            AI<span className="text-ink-400">Hub</span>
          </span>
        </button>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={`flex items-center gap-1.5 text-sm font-medium transition ${
                view === key ? 'text-ink-900' : 'text-ink-400 hover:text-ink-900'
              }`}
            >
              {key === 'folders' && <FolderClosed className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-40 rounded-full border border-ink-100 bg-ink-50 px-4 py-1.5 text-sm text-ink-900 placeholder-ink-300 outline-none transition focus:border-ink-300 focus:w-56"
          />
          {user ? (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-400 transition hover:text-ink-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={onAuthClick}
              className="rounded-full bg-ink-900 px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-ink-800"
            >
              Sign In
            </button>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-ink-600 hover:text-ink-900 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-100 bg-white px-6 py-4 md:hidden">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search AI tools..."
            className="mb-3 w-full rounded-lg border border-ink-100 bg-ink-50 px-4 py-2 text-sm text-ink-900 placeholder-ink-300 outline-none focus:border-ink-300"
          />
          <div className="space-y-1">
            {navItems.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { onViewChange(key); setMobileOpen(false); }}
                className={`block w-full py-2 text-left text-sm font-medium ${
                  view === key ? 'text-ink-900' : 'text-ink-400'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="pt-2">
              {user ? (
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="block w-full py-2 text-left text-sm font-medium text-ink-400"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => { onAuthClick(); setMobileOpen(false); }}
                  className="rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
