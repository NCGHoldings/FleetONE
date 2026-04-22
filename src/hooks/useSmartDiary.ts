import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DiaryEntry {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiaryTask {
  id: string;
  user_id: string;
  diary_entry_id: string | null;
  task_text: string;
  status: string;
  deadline: string | null;
  created_at: string;
}

export const useSmartDiary = () => {
  const queryClient = useQueryClient();

  const { data: entries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ['smart-diary-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_diary_entries')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as DiaryEntry[];
    }
  });

  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['smart-diary-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_diary_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DiaryTask[];
    }
  });

  const createEntry = useMutation({
    mutationFn: async (newEntry: { title: string, content?: string, is_bookmarked?: boolean }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('user_diary_entries')
        .insert({
          user_id: user.data.user.id,
          title: newEntry.title,
          content: newEntry.content || "",
          is_bookmarked: newEntry.is_bookmarked || false
        })
        .select()
        .single();

      if (error) throw error;
      return data as DiaryEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-diary-entries'] });
      toast.success("Diary entry created");
    },
    onError: (error: any) => {
      toast.error("Failed to create entry: " + error.message);
    }
  });

  const updateEntry = useMutation({
    mutationFn: async (updatedEntry: { id: string, title: string, content?: string, is_bookmarked?: boolean }) => {
      const { data, error } = await supabase
        .from('user_diary_entries')
        .update({
          title: updatedEntry.title,
          content: updatedEntry.content || "",
          is_bookmarked: updatedEntry.is_bookmarked
        })
        .eq('id', updatedEntry.id)
        .select()
        .single();

      if (error) throw error;
      return data as DiaryEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-diary-entries'] });
      toast.success("Diary entry saved");
    },
    onError: (error: any) => {
      toast.error("Failed to update entry: " + error.message);
    }
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_diary_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-diary-entries'] });
      queryClient.invalidateQueries({ queryKey: ['smart-diary-tasks'] }); // tasks cascade delete
      toast.success("Diary entry deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete entry: " + error.message);
    }
  });

  const toggleTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data, error } = await supabase
        .from('user_diary_tasks')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DiaryTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-diary-tasks'] });
    },
    onError: (error: any) => {
      toast.error("Failed to update task: " + error.message);
    }
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_diary_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-diary-tasks'] });
      toast.success("Task deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete task: " + error.message);
    }
  });

  const createTask = useMutation({
    mutationFn: async ({ diary_entry_id, task_text }: { diary_entry_id: string, task_text: string }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('user_diary_tasks')
        .insert({
          user_id: user.data.user.id,
          diary_entry_id,
          task_text,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data as DiaryTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-diary-tasks'] });
      toast.success("Task added manually");
    },
    onError: (error: any) => {
      toast.error("Failed to add task: " + error.message);
    }
  });

  return {
    entries,
    tasks,
    isLoading: isLoadingEntries || isLoadingTasks,
    createEntry,
    updateEntry,
    deleteEntry,
    toggleTaskStatus,
    deleteTask,
    createTask
  };
};
