-- Add explicit restrictive policies for subscription modifications
-- These ensure that only system operations (using service role key) can modify subscriptions
-- Regular authenticated users are explicitly prevented from INSERT, UPDATE, or DELETE operations
-- Service role operations bypass RLS and can still modify subscriptions via edge functions

CREATE POLICY "Prevent user insertions on subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Prevent user updates on subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Prevent user deletions on subscriptions"
  ON public.subscriptions
  FOR DELETE
  TO authenticated
  USING (false);