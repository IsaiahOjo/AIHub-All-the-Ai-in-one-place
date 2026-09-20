import { useState, useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { AuthModal } from '@/components/AuthModal';
import { BrowsePage } from '@/pages/BrowsePage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { FoldersPage } from '@/pages/FoldersPage';
import { AdminPage } from '@/pages/AdminPage';
import type { View } from '@/types';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const [view, setView] = useState<View>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [authOpen, setAuthOpen] = useState(false);

  // Listen for navigation events from other components (e.g. FoldersPage "browse" button)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as View;
      if (detail) setView(detail);
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  return (
    <div className="min-h-screen bg-white text-ink-900">
      <Navbar
        view={view}
        onViewChange={setView}
        onAuthClick={() => setAuthOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main>
        {view === 'browse' && (
          <BrowsePage searchQuery={searchQuery} onAuthRequired={() => setAuthOpen(true)} />
        )}
        {view === 'favorites' && (
          <FavoritesPage searchQuery={searchQuery} onAuthRequired={() => setAuthOpen(true)} />
        )}
        {view === 'folders' && (
          <FoldersPage searchQuery={searchQuery} onAuthRequired={() => setAuthOpen(true)} />
        )}
        {view === 'admin' && <AdminPage onAuthRequired={() => setAuthOpen(true)} />}
      </main>

      <Footer />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-ink-900">
              AI<span className="text-ink-400">Hub</span>
            </span>
          </div>
          <p className="max-w-md text-sm text-ink-400">
            The all-in-one directory for AI applications. Discover, save, and explore every AI tool in one place.
          </p>
          <p className="text-xs text-ink-300">
            © 2026 AIHub. All trademarks belong to their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
