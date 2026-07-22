-- Create custom_patterns table
CREATE TABLE IF NOT EXISTS public.custom_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pattern_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.custom_patterns ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone (or authenticated users) to SELECT
CREATE POLICY "Allow read access to all users" 
ON public.custom_patterns 
FOR SELECT 
USING (true);

-- Create policy for admins to INSERT, UPDATE, DELETE
CREATE POLICY "Allow write access for admins only" 
ON public.custom_patterns 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
