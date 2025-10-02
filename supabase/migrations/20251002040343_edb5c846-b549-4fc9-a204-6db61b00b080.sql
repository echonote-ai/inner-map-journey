-- Add UPDATE and DELETE policies for reflection_messages table
-- These policies ensure users can only modify/delete their own messages through reflection ownership

CREATE POLICY "Users can update own reflection messages" 
ON public.reflection_messages 
FOR UPDATE 
USING (EXISTS (
  SELECT 1
  FROM reflections
  WHERE reflections.id = reflection_messages.reflection_id 
    AND reflections.user_id = auth.uid()
));

CREATE POLICY "Users can delete own reflection messages" 
ON public.reflection_messages 
FOR DELETE 
USING (EXISTS (
  SELECT 1
  FROM reflections
  WHERE reflections.id = reflection_messages.reflection_id 
    AND reflections.user_id = auth.uid()
));