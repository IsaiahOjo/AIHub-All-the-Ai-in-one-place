import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AICard } from '@/components/AICard';
import type { AITool } from '@/types';
import { Loader2, Star, Heart, LogIn } from 'lucide-react';

interface FavoritesPageProps {
  searchQuery: string;
  onAuthRequired: () => void;
}

export function FavoritesPage({ searchQuery, onAuthRequired }: FavoritesPageProps) {
  const { user } = useAuth();
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'favorites' | 'stars'>('favorites');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [starIds, setStarIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setTools([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const loadFavorites = async () => {
      const { data: favs } = await supabase
        .from('favorites')
        .select('ai_tool_id')
        .eq('user_id', user.id);

      const favIds = new Set((favs ?? []).map((f) => f.ai_tool_id));
      setFavoriteIds(favIds);

      const { data: starData } = await supabase
        .from('stars')
        .select('ai_tool_id')
        .eq('user_id', user.id);

      const sIds = new Set((starData ?? []).map((s) => s.ai_tool_id));
      setStarIds(sIds);

      if (tab === 'favorites') {
        if (favIds.size === 0) { setTools([]); setLoading(false); return; }
        const { data } = await supabase
          .from('ai_tools')
          .select('*, category:categories(*)')
          .in('id', [...favIds])
          .order('name');
        setTools((data as AITool[]) ?? []);
      } else {
        if (sIds.size === 0) { setTools([]); setLoading(false); return; }
        const { data } = await supabase
          .from('ai_tools')
          .select('*, category:categories(*)')
          .in('id', [...sIds])
          .order('name');
        setTools((data as AITool[]) ?? []);
      }
      setLoading(false);
    };

    loadFavorites();
  }, [user, tab]);

  const toggleFavorite = async (toolId: string) => {
    if (!user) return;
    if (favoriteIds.has(toolId)) {
      setFavoriteIds((prev) => { const n = new Set(prev); n.delete(toolId); return n; });
      setTools((prev) => prev.filter((t) => t.id !== toolId));
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('ai_tool_id', toolId);
    } else {
      setFavoriteIds((prev) => new Set(prev).add(toolId));
      await supabase.from('favorites').insert({ user_id: user.id, ai_tool_id: toolId });
    }
  };

  const toggleStar = async (toolId: string) => {
    if (!user) return;
    if (starIds.has(toolId)) {
      setStarIds((prev) => { const n = new Set(prev); n.delete(toolId); return n; });
      if (tab === 'stars') setTools((prev) => prev.filter((t) => t.id !== toolId));
      await supabase.from('stars').delete().eq('user_id', user.id).eq('ai_tool_id', toolId);
    } else {
      setStarIds((prev) => new Set(prev).add(toolId));
      await supabase.from('stars').insert({ user_id: user.id, ai_tool_id: toolId });
    }
  };

  const requiresAuth = () => {
    if (!user) { onAuthRequired(); return true; }
    return false;
  };

  const filteredTools = searchQuery.trim()
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tools;

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50">
            <LogIn className="h-6 w-6 text-ink-400" />
          </div>
          <h2 className="text-2xl font-bold text-ink-900">Sign in to view your collection</h2>
          <p className="mt-3 text-ink-500">
            Create an account or sign in to star and save your favorite AI tools.
          </p>
          <button
            onClick={onAuthRequired}
            className="mt-6 rounded-full bg-ink-900 px-6 py-2.5 font-semibold text-white transition hover:bg-ink-800"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-ink-900">My Collection</h1>
      <p className="mb-8 text-ink-400">Your saved AI tools, all in one place.</p>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 border-b border-ink-100">
        <button
          onClick={() => setTab('favorites')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            tab === 'favorites'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-ink-400 hover:text-ink-900'
          }`}
        >
          <Heart className="h-4 w-4" fill={tab === 'favorites' ? 'currentColor' : 'none'} />
          Favorites ({favoriteIds.size})
        </button>
        <button
          onClick={() => setTab('stars')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            tab === 'stars'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-ink-400 hover:text-ink-900'
          }`}
        >
          <Star className="h-4 w-4" fill={tab === 'stars' ? 'currentColor' : 'none'} />
          Stars ({starIds.size})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-ink-300" />
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-ink-400">
            {tab === 'favorites'
              ? 'No favorites yet. Browse and click the heart icon to save AI tools.'
              : 'No starred tools yet. Browse and click the star icon to highlight AI tools.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((tool) => (
            <AICard
              key={tool.id}
              tool={tool}
              isFavorited={favoriteIds.has(tool.id)}
              isStarred={starIds.has(tool.id)}
              onToggleFavorite={toggleFavorite}
              onToggleStar={toggleStar}
              requiresAuth={requiresAuth}
            />
          ))}
        </div>
      )}
    </div>
  );
}
