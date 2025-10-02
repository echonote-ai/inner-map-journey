-- Add saved field to reflections table to track if user has saved their journal
ALTER TABLE public.reflections
ADD COLUMN saved BOOLEAN DEFAULT false;