-- Add life_stage column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN life_stage TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.profiles.life_stage IS 'User selected life stage: 20s, 30s, 40s, 50s+, other, or null';