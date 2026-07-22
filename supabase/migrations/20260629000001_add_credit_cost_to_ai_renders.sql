-- Add credit_cost column to ai_renders table
ALTER TABLE public.ai_renders 
ADD COLUMN IF NOT EXISTS credit_cost INTEGER DEFAULT 1;

-- Update existing records if any have NULL credit_cost (though default handles new ones)
UPDATE public.ai_renders 
SET credit_cost = 1 
WHERE credit_cost IS NULL;
