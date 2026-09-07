/*
# AI Directory Schema

## Overview
Creates the full schema for an all-in-one AI directory website. Users can browse categorized AI tools, create accounts, star/favourite their favourite AIs, and visit external AI websites. An admin backend allows organizing tools by category (generative AI, food AI, gaming AI, etc.).

## Tables

### categories
- `id` (uuid, PK)
- `name` (text, unique, not null) — e.g. "Generative AI", "Food AI", "Gaming AI"
- `slug` (text, unique, not null) — URL-friendly identifier
- `description` (text) — short description of the category
- `icon` (text) — lucide-react icon name for the category
- `display_order` (int, default 0) — ordering for display
- `created_at` (timestamptz)

### ai_tools
- `id` (uuid, PK)
- `name` (text, not null) — name of the AI tool
- `description` (text, not null) — what it does
- `website_url` (text, not null) — link to the AI's website
- `category_id` (uuid, FK to categories, ON DELETE SET NULL)
- `logo_url` (text) — optional logo image URL
- `tags` (text[]) — searchable tags
- `is_featured` (boolean, default false) — highlight on homepage
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### favorites
- `id` (uuid, PK)
- `user_id` (uuid, not null, default auth.uid(), FK to auth.users ON DELETE CASCADE)
- `ai_tool_id` (uuid, not null, FK to ai_tools ON DELETE CASCADE)
- `created_at` (timestamptz)
- UNIQUE constraint on (user_id, ai_tool_id) — one favorite per user per tool

### stars
- `id` (uuid, PK)
- `user_id` (uuid, not null, default auth.uid(), FK to auth.users ON DELETE CASCADE)
- `ai_tool_id` (uuid, not null, FK to ai_tools ON DELETE CASCADE)
- `created_at` (timestamptz)
- UNIQUE constraint on (user_id, ai_tool_id) — one star per user per tool

## Security (RLS)

### categories — public read, admin write
- SELECT: anon + authenticated (public catalog)
- INSERT/UPDATE/DELETE: authenticated only (admin manages)

### ai_tools — public read, admin write
- SELECT: anon + authenticated (public catalog)
- INSERT/UPDATE/DELETE: authenticated only (admin manages)

### favorites — owner-scoped
- SELECT/INSERT/UPDATE/DELETE: authenticated, owner only (auth.uid() = user_id)

### stars — owner-scoped
- SELECT/INSERT/UPDATE/DELETE: authenticated, owner only (auth.uid() = user_id)

## Indexes
- ai_tools by category_id
- ai_tools by is_featured
- favorites by user_id
- stars by user_id
- ai_tools name/description GIN trigram search index
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text DEFAULT 'Bot',
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_categories" ON categories;
CREATE POLICY "auth_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_categories" ON categories;
CREATE POLICY "auth_update_categories" ON categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_categories" ON categories;
CREATE POLICY "auth_delete_categories" ON categories FOR DELETE
  TO authenticated USING (true);

-- ai_tools table
CREATE TABLE IF NOT EXISTS ai_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  website_url text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  logo_url text,
  tags text[] DEFAULT '{}',
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ai_tools" ON ai_tools;
CREATE POLICY "anon_select_ai_tools" ON ai_tools FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_ai_tools" ON ai_tools;
CREATE POLICY "auth_insert_ai_tools" ON ai_tools FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_ai_tools" ON ai_tools;
CREATE POLICY "auth_update_ai_tools" ON ai_tools FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_ai_tools" ON ai_tools;
CREATE POLICY "auth_delete_ai_tools" ON ai_tools FOR DELETE
  TO authenticated USING (true);

-- favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_tool_id uuid NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ai_tool_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- stars table
CREATE TABLE IF NOT EXISTS stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_tool_id uuid NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ai_tool_id)
);

ALTER TABLE stars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_stars" ON stars;
CREATE POLICY "select_own_stars" ON stars FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_stars" ON stars;
CREATE POLICY "insert_own_stars" ON stars FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_stars" ON stars;
CREATE POLICY "delete_own_stars" ON stars FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_tools_category_id ON ai_tools(category_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_is_featured ON ai_tools(is_featured);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_stars_user_id ON stars(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_search ON ai_tools USING GIN (name gin_trgm_ops, description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ai_tools_tags ON ai_tools USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);
