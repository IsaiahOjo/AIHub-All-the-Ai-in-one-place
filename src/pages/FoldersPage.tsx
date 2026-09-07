import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AICard } from '@/components/AICard';
import type { AITool, Folder } from '@/types';
import {
  Loader2, Plus, FolderClosed, Trash2, Pencil, X, Check, LogIn, ChevronLeft,
} from 'lucide-react';

interface FoldersPageProps {
  searchQuery: string;
  onAuthRequired: () => void;
}

const FOLDER_COLORS = [
  { name: 'ink', class: 'bg-ink-900', text: 'text-ink-900' },
  { name: 'blue', class: 'bg-blue-500', text: 'text-blue-500' },
  { name: 'teal', class: 'bg-teal-500', text: 'text-teal-500' },
  { name: 'amber', class: 'bg-amber-500', text: 'text-amber-500' },
  { name: 'rose', class: 'bg-rose-500', text: 'text-rose-500' },
  { name: 'green', class: 'bg-green-500', text: 'text-green-500' },
  { name: 'violet', class: 'bg-violet-500', text: 'text-violet-500' },
  { name: 'orange', class: 'bg-orange-500', text: 'text-orange-500' },
];

function getColorClass(colorName: string): string {
  return FOLDER_COLORS.find((c) => c.name === colorName)?.class ?? 'bg-ink-900';
}

function getColorTextClass(colorName: string): string {
  return FOLDER_COLORS.find((c) => c.name === colorName)?.text ?? 'text-ink-900';
}

export function FoldersPage({ searchQuery: _searchQuery, onAuthRequired }: FoldersPageProps) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderItemCounts, setFolderItemCounts] = useState<Record<string, number>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderTools, setFolderTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTools, setLoadingTools] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('ink');
  const [saving, setSaving] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [starIds, setStarIds] = useState<Set<string>>(new Set());
  const [toolFolderMap, setToolFolderMap] = useState<Record<string, string[]>>({});

  const loadFolders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: folderData } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    const folderList = (folderData as Folder[]) ?? [];
    setFolders(folderList);

    // Load item counts for each folder
    const counts: Record<string, number> = {};
    for (const folder of folderList) {
      const { count } = await supabase
        .from('folder_items')
        .select('*', { count: 'exact', head: true })
        .eq('folder_id', folder.id);
      counts[folder.id] = count ?? 0;
    }
    setFolderItemCounts(counts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadFolders();

    // Load favorites and stars
    supabase
      .from('favorites')
      .select('ai_tool_id')
      .eq('user_id', user.id)
      .then(({ data }) => setFavoriteIds(new Set((data ?? []).map((d) => d.ai_tool_id))));

    supabase
      .from('stars')
      .select('ai_tool_id')
      .eq('user_id', user.id)
      .then(({ data }) => setStarIds(new Set((data ?? []).map((d) => d.ai_tool_id))));
  }, [user, loadFolders]);

  // Load tools for selected folder
  useEffect(() => {
    if (!user || !selectedFolderId) {
      setFolderTools([]);
      return;
    }

    setLoadingTools(true);
    const loadFolderTools = async () => {
      const { data: items } = await supabase
        .from('folder_items')
        .select('ai_tool_id')
        .eq('folder_id', selectedFolderId);

      const toolIds = (items ?? []).map((i) => i.ai_tool_id);
      if (toolIds.length === 0) {
        setFolderTools([]);
        setToolFolderMap({});
        setLoadingTools(false);
        return;
      }

      const { data: tools } = await supabase
        .from('ai_tools')
        .select('*, category:categories(*)')
        .in('id', toolIds)
        .order('name');

      const toolList = (tools as AITool[]) ?? [];
      setFolderTools(toolList);

      // Build tool→folder map for folder indicators
      const map: Record<string, string[]> = {};
      for (const t of toolList) {
        map[t.id] = [selectedFolderId];
      }
      setToolFolderMap(map);
      setLoadingTools(false);
    };

    loadFolderTools();
  }, [user, selectedFolderId]);

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

  const removeFromFolder = async (toolId: string) => {
    if (!selectedFolderId) return;
    setFolderTools((prev) => prev.filter((t) => t.id !== toolId));
    setFolderItemCounts((prev) => ({
      ...prev,
      [selectedFolderId]: Math.max(0, (prev[selectedFolderId] ?? 1) - 1),
    }));
    await supabase
      .from('folder_items')
      .delete()
      .eq('folder_id', selectedFolderId)
      .eq('ai_tool_id', toolId);
  };

  const createFolder = async () => {
    if (!user || !folderName.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('folders')
      .insert({ user_id: user.id, name: folderName.trim(), color: folderColor })
      .select()
      .single();

    if (!error && data) {
      setShowCreateModal(false);
      setFolderName('');
      setFolderColor('ink');
      await loadFolders();
    }
    setSaving(false);
  };

  const renameFolder = async () => {
    if (!editingFolder || !folderName.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from('folders')
      .update({ name: folderName.trim(), color: folderColor })
      .eq('id', editingFolder.id);

    if (!error) {
      setEditingFolder(null);
      setFolderName('');
      setFolderColor('ink');
      await loadFolders();
    }
    setSaving(false);
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder? AI tools in it will be unorganized but not deleted.')) return;
    if (selectedFolderId === folderId) setSelectedFolderId(null);
    await supabase.from('folders').delete().eq('id', folderId);
    await loadFolders();
  };

  const openCreateModal = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderColor('ink');
    setShowCreateModal(true);
  };

  const openEditModal = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderColor(folder.color);
    setShowCreateModal(true);
  };

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50">
            <FolderClosed className="h-6 w-6 text-ink-400" />
          </div>
          <h2 className="text-2xl font-bold text-ink-900">Sign in to use folders</h2>
          <p className="mt-3 text-ink-500">
            Create an account to organize AI tools into custom folders for your own needs.
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
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-ink-300" />
        </div>
      ) : selectedFolder ? (
        // Folder detail view
        <div>
          <button
            onClick={() => setSelectedFolderId(null)}
            className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-400 transition hover:text-ink-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to folders
          </button>

          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${getColorClass(selectedFolder.color)}`}>
                <FolderClosed className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-ink-900">{selectedFolder.name}</h1>
                <p className="text-sm text-ink-400">{folderTools.length} tools in this folder</p>
              </div>
            </div>
            <button
              onClick={() => openEditModal(selectedFolder)}
              className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
          </div>

          {loadingTools ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-ink-300" />
            </div>
          ) : folderTools.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-ink-400">
                No tools in this folder yet. Browse the directory and use the folder button on any AI card to add it here.
              </p>
              <button
                onClick={() => {
                  const event = new CustomEvent('navigate', { detail: 'browse' });
                  window.dispatchEvent(event);
                }}
                className="mt-4 rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
              >
                Browse AI Tools
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {folderTools.map((tool) => (
                <div key={tool.id} className="relative">
                  <AICard
                    tool={tool}
                    isFavorited={favoriteIds.has(tool.id)}
                    isStarred={starIds.has(tool.id)}
                    onToggleFavorite={toggleFavorite}
                    onToggleStar={toggleStar}
                    requiresAuth={requiresAuth}
                    folders={folders}
                    toolFolderIds={toolFolderMap[tool.id] ?? []}
                    onAddToFolder={() => {}}
                    onCreateFolderForTool={() => {}}
                  />
                  <button
                    onClick={() => removeFromFolder(tool.id)}
                    className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-ink-300 shadow-sm transition hover:text-red-500"
                    title="Remove from folder"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Folders overview
        <div>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-ink-900">My Folders</h1>
              <p className="mt-1 text-ink-400">Organize AI tools into custom groups for your needs.</p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
            >
              <Plus className="h-4 w-4" />
              New Folder
            </button>
          </div>

          {folders.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-50">
                <FolderClosed className="h-7 w-7 text-ink-300" />
              </div>
              <h2 className="text-lg font-bold text-ink-900">No folders yet</h2>
              <p className="mt-2 text-ink-400">
                Create folders like "Gaming AIs", "Food AI", or "Work Tools" to organize your favorite AI tools.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-6 flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
              >
                <Plus className="h-4 w-4" />
                Create your first folder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="group flex flex-col rounded-xl border border-ink-100 bg-white p-5 transition-all duration-200 hover:border-ink-200 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${getColorClass(folder.color)}`}
                    >
                      <FolderClosed className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => openEditModal(folder)}
                        className="rounded-lg p-1.5 text-ink-300 transition hover:bg-ink-50 hover:text-ink-900"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteFolder(folder.id)}
                        className="rounded-lg p-1.5 text-ink-300 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="mb-1 font-semibold text-ink-900">{folder.name}</h3>
                  <p className="mb-4 text-sm text-ink-400">
                    {folderItemCounts[folder.id] ?? 0} tools
                  </p>

                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`mt-auto flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${getColorTextClass(folder.color)} hover:bg-ink-50`}
                  >
                    Open folder
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit folder modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-ink-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-ink-100 p-5">
              <h2 className="text-lg font-bold text-ink-900">
                {editingFolder ? 'Rename folder' : 'New folder'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-ink-300 transition hover:text-ink-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Folder name</label>
                <input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (editingFolder ? renameFolder() : createFolder())}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-900 placeholder-ink-300 outline-none focus:border-ink-900"
                  placeholder="e.g. Gaming AIs"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Color</label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setFolderColor(c.name)}
                      className={`h-8 w-8 rounded-lg transition ${c.class} ${
                        folderColor === c.name
                          ? 'ring-2 ring-offset-2 ring-ink-900'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-ink-200 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingFolder ? renameFolder : createFolder}
                  disabled={saving || !folderName.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingFolder ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingFolder ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
