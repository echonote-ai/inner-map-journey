-- Add new profile fields for user information
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_nickname text,
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS gender text;

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);