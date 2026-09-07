/*
# Add popularity column to ai_tools

## Overview
Adds a `popularity` integer column to the `ai_tools` table to support a "Popular" sort/filter.
Higher values = more popular. Values are set based on general market awareness and usage.

## Changes
- New column: `ai_tools.popularity` (int, default 0, not null)
- Index on popularity for efficient sorting

## Security
- No RLS policy changes needed — column is readable by existing SELECT policies.
*/

ALTER TABLE ai_tools ADD COLUMN IF NOT EXISTS popularity int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ai_tools_popularity ON ai_tools(popularity DESC);
