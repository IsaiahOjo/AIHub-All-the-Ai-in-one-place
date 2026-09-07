/*
# Add AI folders and folder items

## Overview
Allows logged-in users to create custom folders/groups to organize AI tools for their own needs.
For example: a "Gaming AIs" folder, a "Food AI" folder, a "Work Tools" folder, etc.
Users can add any AI tool to any of their folders.

## New Tables

### folders
- `id` (uuid, PK)
- `user_id` (uuid, not null, default auth.uid(), FK to auth.users ON DELETE CASCADE)
- `name` (text, not null) — folder name, e.g. "Gaming AIs"
- `color` (text, default 'ink') — color tag for the folder
- `created_at` (timestamptz)

### folder_items
- `id` (uuid, PK)
- `folder_id` (uuid, not null, FK to folders ON DELETE CASCADE)
- `ai_tool_id` (uuid, not null, FK to ai_tools ON DELETE CASCADE)
- `created_at` (timestamptz)
- UNIQUE (folder_id, ai_tool_id) — a tool can only appear once per folder

## Security (RLS)

### folders — owner-scoped
- SELECT/INSERT/UPDATE/DELETE: authenticated, owner only (auth.uid() = user_id)

### folder_items — owner-scoped via folder ownership
- SELECT: authenticated, only if the folder belongs to the user
- INSERT: authenticated, only if the folder belongs to the user
- DELETE: authenticated, only if the folder belongs to the user

## Indexes
- folders by user_id
- folder_items by folder_id
*/

CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT 'ink',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_folders" ON folders;
CREATE POLICY "select_own_folders" ON folders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_folders" ON folders;
CREATE POLICY "insert_own_folders" ON folders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_folders" ON folders;
CREATE POLICY "update_own_folders" ON folders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_folders" ON folders;
CREATE POLICY "delete_own_folders" ON folders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  ai_tool_id uuid NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, ai_tool_id)
);

ALTER TABLE folder_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_folder_items" ON folder_items;
CREATE POLICY "select_own_folder_items" ON folder_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM folders WHERE folders.id = folder_items.folder_id AND folders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_folder_items" ON folder_items;
CREATE POLICY "insert_own_folder_items" ON folder_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM folders WHERE folders.id = folder_items.folder_id AND folders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_folder_items" ON folder_items;
CREATE POLICY "delete_own_folder_items" ON folder_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM folders WHERE folders.id = folder_items.folder_id AND folders.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_folder_id ON folder_items(folder_id);
