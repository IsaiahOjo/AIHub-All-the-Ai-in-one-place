import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AICard } from '@/components/AICard';
import { AIAssistant } from '@/components/AIAssistant';
import type { AITool, Category, Folder, SortOption } from '@/types';
import * as Icons from 'lucide-react';
import { Loader2, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface BrowsePageProps {
  searchQuery: string;
  onAuthRequired: () => void;
}

export function BrowsePage({ searchQuery, onAuthRequired }: BrowsePageProps) {
  const { user } = useAuth();
  const [tools, setTools] = useState<AITool[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortOption>('popular');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [starIds, setStarIds] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [toolFolderMap, setToolFolderMap] = useState<Record<string, string[]>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('display_order')
      .then(({ data }) => {
        if (data) setCategories(data as Category[]);
      });
  }, []);

  const loadTools = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('ai_tools').select('*, category:categories(*)');

    if (selectedCategory !== 'all') {
      query = query.eq('category_id', selectedCategory);
    }

    if (sort === 'featured') {
      query = query.order('is_featured', { ascending: false }).order('popularity', { ascending: false }).order('name');
    } else if (sort === 'name') {
      query = query.order('name');
    } else if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'popular') {
      query = query.order('popularity', { ascending: false }).order('name');
    }

    const { data } = await query;
    setTools((data as AITool[]) ?? []);
    setLoading(false);
  }, [selectedCategory, sort]);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      setStarIds(new Set());
      setFolders([]);
      setToolFolderMap({});
      return;
    }

    supabase
      .from('favorites')
      .select('ai_tool_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setFavoriteIds(new Set((data ?? []).map((d) => d.ai_tool_id)));
      });

    supabase
      .from('stars')
      .select('ai_tool_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setStarIds(new Set((data ?? []).map((d) => d.ai_tool_id)));
      });

    // Load folders
    supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setFolders((data as Folder[]) ?? []);
      });

    // Load folder_items to build tool→folder map
    supabase
      .from('folder_items')
      .select('folder_id, ai_tool_id')
      .then(({ data }) => {
        const map: Record<string, string[]> = {};
        for (const item of data ?? []) {
          if (!map[item.ai_tool_id]) map[item.ai_tool_id] = [];
          map[item.ai_tool_id].push(item.folder_id);
        }
        setToolFolderMap(map);
      });
  }, [user]);

  const toggleFavorite = async (toolId: string) => {
    if (!user) return;
    if (favoriteIds.has(toolId)) {
      setFavoriteIds((prev) => { const n = new Set(prev); n.delete(toolId); return n; });
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

  const addToFolder = async (folderId: string, toolId: string) => {
    if (!user) return;
    setToolFolderMap((prev) => {
      const existing = prev[toolId] ?? [];
      if (existing.includes(folderId)) return prev;
      return { ...prev, [toolId]: [...existing, folderId] };
    });
    await supabase.from('folder_items').insert({ folder_id: folderId, ai_tool_id: toolId });
  };

  const createFolderForTool = async (toolId: string, name: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('folders')
      .insert({ user_id: user.id, name, color: 'ink' })
      .select()
      .single();
    if (!error && data) {
      const newFolder = data as Folder;
      setFolders((prev) => [...prev, newFolder]);
      setToolFolderMap((prev) => ({
        ...prev,
        [toolId]: [...(prev[toolId] ?? []), newFolder.id],
      }));
      await supabase.from('folder_items').insert({ folder_id: newFolder.id, ai_tool_id: toolId });
    }
  };

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const q = searchQuery.toLowerCase();
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [tools, searchQuery]);

  const selectedCatName = categories.find((c) => c.id === selectedCategory)?.name ?? 'All Tools';

  const sortLabels: Record<SortOption, string> = {
    popular: 'Most Popular',
    featured: 'Featured',
    name: 'Name A-Z',
    newest: 'Newest',
  };

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-ink-100 bg-ink-50/50">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-balance text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
            Every AI tool,<br className="hidden sm:block" /> all in one place.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-500">
            Browse {tools.length || '184'}+ AI applications across {categories.length} categories.
            Save your favorites, star the ones you love, and discover what's next.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Mobile category dropdown */}
        <div className="mb-6 lg:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-ink-400" />
              {selectedCatName}
            </span>
            <ChevronDown className={`h-4 w-4 text-ink-400 transition ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
          {sidebarOpen && (
            <div className="mt-2 rounded-lg border border-ink-100 bg-white p-2">
              <CategoryList
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={(id) => {
                  setSelectedCategory(id);
                  setSidebarOpen(false);
                }}
                toolCounts={tools.reduce((acc, t) => {
                  if (t.category_id) acc[t.category_id] = (acc[t.category_id] ?? 0) + 1;
                  return acc;
                }, {} as Record<string, number>)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-24">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
                Categories
              </h2>
              <CategoryList
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                toolCounts={undefined}
              />
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Sort bar */}
            <div className="mb-6 flex items-center justify-between border-b border-ink-100 pb-4">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-bold text-ink-900">{selectedCatName}</h2>
                <span className="text-sm text-ink-400">
                  {loading ? '...' : `${filteredTools.length} tools`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-ink-400 sm:inline">Sort</span>
                <div className="flex overflow-hidden rounded-lg border border-ink-100">
                  {(Object.keys(sortLabels) as SortOption[]).map((key, i) => (
                    <button
                      key={key}
                      onClick={() => setSort(key)}
                      className={`px-3 py-1.5 text-xs font-medium transition ${
                        i > 0 ? 'border-l border-ink-100' : ''
                      } ${
                        sort === key
                          ? 'bg-ink-900 text-white'
                          : 'bg-white text-ink-500 hover:bg-ink-50 hover:text-ink-900'
                      }`}
                    >
                      {sortLabels[key]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-ink-300" />
              </div>
            ) : filteredTools.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-ink-400">No AI tools found. Try a different search or category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredTools.map((tool) => (
                  <AICard
                    key={tool.id}
                    tool={tool}
                    isFavorited={favoriteIds.has(tool.id)}
                    isStarred={starIds.has(tool.id)}
                    onToggleFavorite={toggleFavorite}
                    onToggleStar={toggleStar}
                    requiresAuth={requiresAuth}
                    folders={user ? folders : undefined}
                    toolFolderIds={user ? (toolFolderMap[tool.id] ?? []) : undefined}
                    onAddToFolder={user ? addToFolder : undefined}
                    onCreateFolderForTool={user ? createFolderForTool : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AIAssistant tools={tools} categories={categories} onAuthRequired={onAuthRequired} />
    </div>
  );
}

function CategoryList({
  categories,
  selectedCategory,
  onSelect,
  toolCounts,
}: {
  categories: Category[];
  selectedCategory: string;
  onSelect: (id: string) => void;
  toolCounts?: Record<string, number>;
}) {
  return (
    <nav className="space-y-0.5">
      <button
        onClick={() => onSelect('all')}
        className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
          selectedCategory === 'all'
            ? 'bg-ink-900 text-white'
            : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
        }`}
      >
        All Tools
      </button>
      {categories.map((cat) => {
        const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[cat.icon] ?? Icons.Bot;
        const count = toolCounts?.[cat.id];
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
              selectedCategory === cat.id
                ? 'bg-ink-900 font-medium text-white'
                : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-70" />
            <span className="flex-1 truncate">{cat.name}</span>
            {count !== undefined && (
              <span className={`text-xs ${selectedCategory === cat.id ? 'text-ink-300' : 'text-ink-300'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
