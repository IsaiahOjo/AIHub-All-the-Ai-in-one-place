export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  display_order: number;
  created_at: string;
}

export interface AITool {
  id: string;
  name: string;
  description: string;
  website_url: string;
  category_id: string | null;
  logo_url: string | null;
  tags: string[];
  is_featured: boolean;
  popularity: number;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  ai_tool_id: string;
  created_at: string;
}

export interface Star {
  id: string;
  user_id: string;
  ai_tool_id: string;
  created_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface FolderItem {
  id: string;
  folder_id: string;
  ai_tool_id: string;
  created_at: string;
}

export type View = 'browse' | 'favorites' | 'folders' | 'admin';
export type SortOption = 'featured' | 'name' | 'newest' | 'popular';
