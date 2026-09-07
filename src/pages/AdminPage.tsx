import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { AITool, Category } from '@/types';
import * as Icons from 'lucide-react';
import {
  Loader2, Plus, Pencil, Trash2, X, Tag, Bot, ArrowUp, ArrowDown, Search,
} from 'lucide-react';
import { getLogoUrl } from '@/lib/logo';

interface AdminPageProps {
  onAuthRequired: () => void;
}

interface ToolFormData {
  name: string;
  description: string;
  website_url: string;
  category_id: string;
  tags: string;
  is_featured: boolean;
  logo_url: string;
  popularity: string;
}

const emptyForm: ToolFormData = {
  name: '', description: '', website_url: '', category_id: '', tags: '', is_featured: false, logo_url: '', popularity: '0',
};

export function AdminPage({ onAuthRequired }: AdminPageProps) {
  const { user } = useAuth();
  const [tools, setTools] = useState<AITool[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToolModal, setShowToolModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingTool, setEditingTool] = useState<AITool | null>(null);
  const [toolForm, setToolForm] = useState<ToolFormData>(emptyForm);
  const [catForm, setCatForm] = useState({ name: '', slug: '', description: '', icon: 'Bot' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'tools' | 'categories'>('tools');
  const [adminSearch, setAdminSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [toolsRes, catRes] = await Promise.all([
      supabase.from('ai_tools').select('*, category:categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('display_order'),
    ]);
    setTools((toolsRes.data as AITool[]) ?? []);
    setCategories((catRes.data as Category[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50">
            <Bot className="h-6 w-6 text-ink-400" />
          </div>
          <h2 className="text-2xl font-bold text-ink-900">Admin access required</h2>
          <p className="mt-3 text-ink-500">Sign in to manage AI tools and categories.</p>
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

  const openAddTool = () => {
    setEditingTool(null);
    setToolForm({ ...emptyForm, category_id: categories[0]?.id ?? '' });
    setError(null);
    setShowToolModal(true);
  };

  const openEditTool = (tool: AITool) => {
    setEditingTool(tool);
    setToolForm({
      name: tool.name,
      description: tool.description,
      website_url: tool.website_url,
      category_id: tool.category_id ?? '',
      tags: tool.tags.join(', '),
      is_featured: tool.is_featured,
      logo_url: tool.logo_url ?? '',
      popularity: String(tool.popularity ?? 0),
    });
    setError(null);
    setShowToolModal(true);
  };

  const saveTool = async () => {
    setSaving(true);
    setError(null);

    if (!toolForm.name || !toolForm.description || !toolForm.website_url) {
      setError('Name, description, and website URL are required.');
      setSaving(false);
      return;
    }

    const payload = {
      name: toolForm.name,
      description: toolForm.description,
      website_url: toolForm.website_url,
      category_id: toolForm.category_id || null,
      tags: toolForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_featured: toolForm.is_featured,
      logo_url: toolForm.logo_url || null,
      popularity: parseInt(toolForm.popularity) || 0,
      updated_at: new Date().toISOString(),
    };

    let hadError = false;
    if (editingTool) {
      const { error: err } = await supabase.from('ai_tools').update(payload).eq('id', editingTool.id);
      if (err) { setError(err.message); hadError = true; }
    } else {
      const { error: err } = await supabase.from('ai_tools').insert(payload);
      if (err) { setError(err.message); hadError = true; }
    }

    if (!hadError) {
      setShowToolModal(false);
      loadData();
    }
    setSaving(false);
  };

  const deleteTool = async (id: string) => {
    if (!confirm('Delete this AI tool? This cannot be undone.')) return;
    await supabase.from('ai_tools').delete().eq('id', id);
    loadData();
  };

  const saveCategory = async () => {
    setSaving(true);
    setError(null);

    if (!catForm.name || !catForm.slug) {
      setError('Name and slug are required.');
      setSaving(false);
      return;
    }

    const maxOrder = categories.reduce((max, c) => Math.max(max, c.display_order), 0);
    const { error: err } = await supabase.from('categories').insert({
      name: catForm.name,
      slug: catForm.slug.toLowerCase().replace(/\s+/g, '-'),
      description: catForm.description || null,
      icon: catForm.icon || 'Bot',
      display_order: maxOrder + 1,
    });

    if (err) {
      setError(err.message);
    } else {
      setShowCatModal(false);
      setCatForm({ name: '', slug: '', description: '', icon: 'Bot' });
      loadData();
    }
    setSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? AI tools in it will remain but become uncategorized.')) return;
    await supabase.from('categories').delete().eq('id', id);
    loadData();
  };

  const moveCategory = async (cat: Category, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swapCat = sorted[swapIdx];
    await Promise.all([
      supabase.from('categories').update({ display_order: swapCat.display_order }).eq('id', cat.id),
      supabase.from('categories').update({ display_order: cat.display_order }).eq('id', swapCat.id),
    ]);
    loadData();
  };

  const filteredAdminTools = adminSearch.trim()
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
          t.description.toLowerCase().includes(adminSearch.toLowerCase())
      )
    : tools;

  const availableIcons = [
    'Bot', 'Sparkles', 'MessageSquare', 'Image', 'Video', 'Music', 'PenLine', 'Code2',
    'Zap', 'Search', 'Palette', 'TrendingUp', 'Briefcase', 'GraduationCap', 'HeartPulse',
    'UtensilsCrossed', 'Gamepad2', 'Languages', 'Box', 'Cpu', 'Brain', 'Camera',
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">Admin Panel</h1>
          <p className="mt-1 text-ink-400">Add, edit, and organize AI tools and categories.</p>
        </div>
        <button
          onClick={adminTab === 'tools' ? openAddTool : () => { setError(null); setShowCatModal(true); }}
          className="flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
        >
          <Plus className="h-4 w-4" />
          {adminTab === 'tools' ? 'Add AI Tool' : 'Add Category'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 border-b border-ink-100">
        <button
          onClick={() => setAdminTab('tools')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            adminTab === 'tools' ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-400 hover:text-ink-900'
          }`}
        >
          <Bot className="h-4 w-4" />
          AI Tools ({tools.length})
        </button>
        <button
          onClick={() => setAdminTab('categories')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            adminTab === 'categories' ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-400 hover:text-ink-900'
          }`}
        >
          <Tag className="h-4 w-4" />
          Categories ({categories.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-ink-300" />
        </div>
      ) : adminTab === 'tools' ? (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              type="text"
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              placeholder="Search tools..."
              className="w-full rounded-lg border border-ink-100 bg-white py-2 pl-10 pr-4 text-sm text-ink-900 placeholder-ink-300 outline-none focus:border-ink-300"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-ink-100">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/50 text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Category</th>
                  <th className="px-4 py-3 font-medium">Featured</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {filteredAdminTools.map((tool) => (
                  <tr key={tool.id} className="transition hover:bg-ink-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getLogoUrl(tool.website_url, tool.logo_url)}
                          alt=""
                          className="h-8 w-8 rounded-md object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div>
                          <div className="font-medium text-ink-900">{tool.name}</div>
                          <div className="max-w-xs truncate text-xs text-ink-400">{tool.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-500 md:table-cell">
                      {tool.category?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {tool.is_featured ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-ink-300">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditTool(tool)}
                          className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-50 hover:text-ink-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteTool(tool.id)}
                          className="rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {categories
            .sort((a, b) => a.display_order - b.display_order)
            .map((cat) => {
              const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[cat.icon] ?? Icons.Bot;
              const toolCount = tools.filter((t) => t.category_id === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-4 transition hover:border-ink-200"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-50 text-ink-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-ink-900">{cat.name}</h3>
                      <span className="text-xs text-ink-400">{toolCount} tools</span>
                    </div>
                    {cat.description && <p className="text-sm text-ink-400">{cat.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveCategory(cat, 'up')}
                      className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-50 hover:text-ink-900"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveCategory(cat, 'down')}
                      className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-50 hover:text-ink-900"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Tool Modal */}
      {showToolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setShowToolModal(false)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-100 bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-ink-100 bg-white p-5">
              <h2 className="text-lg font-bold text-ink-900">
                {editingTool ? 'Edit AI Tool' : 'Add New AI Tool'}
              </h2>
              <button onClick={() => setShowToolModal(false)} className="text-ink-300 transition hover:text-ink-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Field label="Name *">
                <input
                  value={toolForm.name}
                  onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g. ChatGPT"
                />
              </Field>

              <Field label="Description *">
                <textarea
                  value={toolForm.description}
                  onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                  rows={3}
                  className="form-input resize-none"
                  placeholder="What does this AI tool do?"
                />
              </Field>

              <Field label="Website URL *">
                <input
                  value={toolForm.website_url}
                  onChange={(e) => setToolForm({ ...toolForm, website_url: e.target.value })}
                  className="form-input"
                  placeholder="https://example.com"
                />
              </Field>

              <Field label="Category">
                <select
                  value={toolForm.category_id}
                  onChange={(e) => setToolForm({ ...toolForm, category_id: e.target.value })}
                  className="form-input"
                >
                  <option value="">— Uncategorized —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Tags (comma-separated)">
                <input
                  value={toolForm.tags}
                  onChange={(e) => setToolForm({ ...toolForm, tags: e.target.value })}
                  className="form-input"
                  placeholder="chatbot, ai, productivity"
                />
              </Field>

              <Field label="Logo URL (optional — auto-generated from domain if blank)">
                <input
                  value={toolForm.logo_url}
                  onChange={(e) => setToolForm({ ...toolForm, logo_url: e.target.value })}
                  className="form-input"
                  placeholder="https://example.com/logo.png"
                />
              </Field>

              <Field label="Popularity (0-100, higher = more popular)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={toolForm.popularity}
                  onChange={(e) => setToolForm({ ...toolForm, popularity: e.target.value })}
                  className="form-input"
                  placeholder="50"
                />
              </Field>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={toolForm.is_featured}
                  onChange={(e) => setToolForm({ ...toolForm, is_featured: e.target.checked })}
                  className="h-4 w-4 rounded border-ink-200 text-ink-900 focus:ring-ink-900"
                />
                <span className="text-sm text-ink-700">Featured (highlight on homepage)</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowToolModal(false)}
                  className="flex-1 rounded-lg border border-ink-200 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTool}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingTool ? 'Save Changes' : 'Add Tool'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setShowCatModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-ink-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-ink-100 p-5">
              <h2 className="text-lg font-bold text-ink-900">Add New Category</h2>
              <button onClick={() => setShowCatModal(false)} className="text-ink-300 transition hover:text-ink-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Field label="Name *">
                <input
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({
                      ...catForm,
                      name: e.target.value,
                      slug:
                        catForm.slug === '' || catForm.slug === catForm.name.toLowerCase().replace(/\s+/g, '-')
                          ? e.target.value.toLowerCase().replace(/\s+/g, '-')
                          : catForm.slug,
                    })
                  }
                  className="form-input"
                  placeholder="e.g. Healthcare AI"
                />
              </Field>

              <Field label="Slug *">
                <input
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                  className="form-input"
                  placeholder="healthcare-ai"
                />
              </Field>

              <Field label="Description">
                <input
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="form-input"
                  placeholder="What kind of AI tools are in this category?"
                />
              </Field>

              <Field label="Icon">
                <div className="grid grid-cols-7 gap-2">
                  {availableIcons.map((iconName) => {
                    const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[iconName] ?? Icons.Bot;
                    return (
                      <button
                        key={iconName}
                        onClick={() => setCatForm({ ...catForm, icon: iconName })}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
                          catForm.icon === iconName
                            ? 'border-ink-900 bg-ink-50 text-ink-900'
                            : 'border-ink-100 text-ink-400 hover:border-ink-200'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCatModal(false)}
                  className="flex-1 rounded-lg border border-ink-200 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCategory}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}
