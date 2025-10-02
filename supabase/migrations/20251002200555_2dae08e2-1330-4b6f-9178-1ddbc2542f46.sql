-- Add columns to reflections table for AI-generated titles
ALTER TABLE public.reflections 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS generated_title TEXT,
ADD COLUMN IF NOT EXISTS title_source TEXT CHECK (title_source IN ('ai', 'manual', 'default')),
ADD COLUMN IF NOT EXISTS title_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS title_model TEXT,
ADD COLUMN IF NOT EXISTS title_manual_override BOOLEAN DEFAULT false;

-- Create index for backfill queries
CREATE INDEX IF NOT EXISTS idx_reflections_title_source ON public.reflections(title_source);
CREATE INDEX IF NOT EXISTS idx_reflections_created_at ON public.reflections(created_at);

-- Backfill existing journals with default title source
UPDATE public.reflections 
SET title_source = 'default'
WHERE title_source IS NULL;