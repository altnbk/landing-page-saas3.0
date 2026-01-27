-- Landing Page Generator Database Schema
-- Run this in your Supabase SQL Editor

-- Create the deployments table
CREATE TABLE IF NOT EXISTS public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  title text NOT NULL,
  subtitle text NOT NULL,
  cta text NOT NULL,
  theme_color text DEFAULT '#667eea',
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS deployments_user_id_idx ON public.deployments(user_id);
CREATE INDEX IF NOT EXISTS deployments_created_at_idx ON public.deployments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own deployments

-- Policy for SELECT: Users can view their own deployments
CREATE POLICY "Users can view their own deployments"
  ON public.deployments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for INSERT: Users can create deployments for themselves
CREATE POLICY "Users can create their own deployments"
  ON public.deployments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can delete their own deployments
CREATE POLICY "Users can delete their own deployments"
  ON public.deployments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy for UPDATE: Users can update their own deployments (if needed)
CREATE POLICY "Users can update their own deployments"
  ON public.deployments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.deployments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
