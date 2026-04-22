-- Create user_diary_entries table
CREATE TABLE IF NOT EXISTS public.user_diary_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    is_bookmarked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_diary_tasks table
CREATE TABLE IF NOT EXISTS public.user_diary_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    diary_entry_id UUID REFERENCES public.user_diary_entries(id) ON DELETE CASCADE,
    task_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_diary_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for user_diary_entries
CREATE POLICY "Users can view their own diary entries" 
    ON public.user_diary_entries FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diary entries" 
    ON public.user_diary_entries FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diary entries" 
    ON public.user_diary_entries FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diary entries" 
    ON public.user_diary_entries FOR DELETE 
    USING (auth.uid() = user_id);

-- Policies for user_diary_tasks
CREATE POLICY "Users can view their own diary tasks" 
    ON public.user_diary_tasks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diary tasks" 
    ON public.user_diary_tasks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diary tasks" 
    ON public.user_diary_tasks FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diary tasks" 
    ON public.user_diary_tasks FOR DELETE 
    USING (auth.uid() = user_id);

-- Create an updated_at trigger for diary entries
CREATE OR REPLACE FUNCTION update_user_diary_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_diary_entries_updated_at ON public.user_diary_entries;
CREATE TRIGGER update_user_diary_entries_updated_at
    BEFORE UPDATE ON public.user_diary_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_user_diary_entries_updated_at();
