-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the sync-subscriptions function to run every hour
SELECT cron.schedule(
  'sync-stripe-subscriptions',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://lzvycoujohuznnqplekx.supabase.co/functions/v1/sync-subscriptions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dnljb3Vqb2h1em5ucXBsZWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjE0MDAsImV4cCI6MjA3NDgzNzQwMH0.Fs-ACZ721Dj1xy6u9vlObFGmphMY-F0eYjagyVSywos"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);