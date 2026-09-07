import { Star, Heart, ExternalLink, FolderPlus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { AITool, Folder } from '@/types';
import { getLogoUrl, getBrandColor, getInitial } from '@/lib/logo';

interface AICardProps {
  tool: AITool;
  isFavorited: boolean;
  isStarred: boolean;
  onToggleFavorite: (toolId: string) => void;
  onToggleStar: (toolId: string) => void;
  requiresAuth: () => boolean;
  folders?: Folder[];
  toolFolderIds?: string[];
  onAddToFolder?: (folderId: string, toolId: string) => void;
  onCreateFolderForTool?: (toolId: string, name: string) => void;
}

export function AICard({
  tool,
  isFavorited,
  isStarred,
  onToggleFavorite,
  onToggleStar,
  requiresAuth,
  folders,
  toolFolderIds,
  onAddToFolder,
  onCreateFolderForTool,
}: AICardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const logoUrl = getLogoUrl(tool.website_url, tool.logo_url);
  const brandColor = getBrandColor(tool.name);

  useEffect(() => {
    if (!folderMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setFolderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [folderMenuOpen]);

  const inFolderIds = new Set(toolFolderIds ?? []);

  const handleAddToFolder = (folderId: string) => {
    if (onAddToFolder) {
      onAddToFolder(folderId, tool.id);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !onCreateFolderForTool) return;
    onCreateFolderForTool(tool.id, newFolderName.trim());
    setNewFolderName('');
    setFolderMenuOpen(false);
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-ink-100 bg-white p-5 transition-all duration-200 hover:border-ink-200 hover:shadow-md">
      {/* Top: logo + name */}
      <div className="mb-3 flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg"
          style={{ backgroundColor: imgError ? brandColor : '#f4f4f2' }}
        >
          {logoUrl && !imgError ? (
            <>
              {!imgLoaded && <div className="h-full w-full animate-pulse bg-ink-50" />}
              <img
                src={logoUrl}
                alt={tool.name}
                className={`h-full w-full object-cover transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                loading="lazy"
              />
            </>
          ) : (
            <span className="text-lg font-bold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {getInitial(tool.name)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-ink-900">{tool.name}</h3>
            {tool.is_featured && (
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          {tool.category && (
            <span className="text-xs text-ink-400">{tool.category.name}</span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mb-4 flex-1 text-sm leading-relaxed text-ink-500 line-clamp-3">
        {tool.description}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <a
          href={tool.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink-50 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-ink-900"
        >
          Visit
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        {/* Folder button */}
        {folders && onAddToFolder && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                if (requiresAuth()) return;
                setFolderMenuOpen(!folderMenuOpen);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                inFolderIds.size > 0
                  ? 'border-blue-200 bg-blue-50 text-blue-500'
                  : 'border-ink-100 text-ink-300 hover:border-blue-200 hover:text-blue-500'
              }`}
              title="Add to folder"
            >
              <FolderPlus className="h-4 w-4" />
            </button>

            {folderMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-ink-100 bg-white p-2 shadow-lg">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Add to folder
                </p>
                <div className="max-h-40 overflow-y-auto">
                  {folders.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-ink-400">No folders yet. Create one below.</p>
                  ) : (
                    folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => handleAddToFolder(folder.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                          inFolderIds.has(folder.id)
                            ? 'bg-blue-50 font-medium text-blue-600'
                            : 'text-ink-700 hover:bg-ink-50'
                        }`}
                      >
                        <span className="truncate">{folder.name}</span>
                        {inFolderIds.has(folder.id) && (
                          <span className="ml-auto text-xs text-blue-400">Added</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                <div className="mt-2 border-t border-ink-100 pt-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                      placeholder="New folder name..."
                      className="flex-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-900 placeholder-ink-300 outline-none focus:border-ink-900"
                    />
                    <button
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim()}
                      className="rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-ink-800 disabled:opacity-30"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => { if (requiresAuth()) return; onToggleStar(tool.id); }}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
            isStarred
              ? 'border-amber-200 bg-amber-50 text-amber-500'
              : 'border-ink-100 text-ink-300 hover:border-amber-200 hover:text-amber-500'
          }`}
          title={isStarred ? 'Remove star' : 'Star this AI'}
        >
          <Star className="h-4 w-4" fill={isStarred ? 'currentColor' : 'none'} />
        </button>

        <button
          onClick={() => { if (requiresAuth()) return; onToggleFavorite(tool.id); }}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
            isFavorited
              ? 'border-rose-200 bg-rose-50 text-rose-500'
              : 'border-ink-100 text-ink-300 hover:border-rose-200 hover:text-rose-500'
          }`}
          title={isFavorited ? 'Remove favorite' : 'Add to favorites'}
        >
          <Heart className="h-4 w-4" fill={isFavorited ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}
