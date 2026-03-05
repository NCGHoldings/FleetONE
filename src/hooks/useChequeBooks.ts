import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

interface ChequeBook {
  id: string;
  bank_account_id: string;
  company_id: string | null;
  prefix: string;
  start_number: number;
  end_number: number;
  next_number: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface NextChequeResult {
  success: boolean;
  cheque_number?: string;
  book_id?: string;
  remaining?: number;
  error?: string;
}

export const useChequeBooks = (bankAccountId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["cheque_books", bankAccountId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("cheque_books" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ChequeBook[];
    },
    enabled: !!selectedCompanyId,
  });
};

export const useActiveChequeBook = (bankAccountId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["active_cheque_book", bankAccountId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("cheque_books" as any)
        .select("*")
        .eq("bank_account_id", bankAccountId!)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle() as any);

      if (error) throw error;
      return data as unknown as ChequeBook | null;
    },
    enabled: !!bankAccountId,
  });
};

export const useNextChequeNumber = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (bankAccountId: string) => {
      const { data, error } = await supabase.rpc("get_next_cheque_number", {
        p_bank_account_id: bankAccountId,
      } as any);

      if (error) throw error;
      const result = data as unknown as NextChequeResult;
      if (!result.success) {
        throw new Error(result.error || "Failed to get cheque number");
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cheque_books"] });
      queryClient.invalidateQueries({ queryKey: ["active_cheque_book"] });
      if (data.remaining !== undefined && data.remaining <= 10) {
        toast({
          title: "Cheque Book Running Low",
          description: `Only ${data.remaining} cheque leaves remaining.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Cheque Number Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCreateChequeBook = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (book: {
      bank_account_id: string;
      prefix?: string;
      start_number: number;
      end_number: number;
      notes?: string;
    }) => {
      // Deactivate existing active books for this bank account
      await (supabase
        .from("cheque_books" as any)
        .update({ is_active: false } as any)
        .eq("bank_account_id", book.bank_account_id)
        .eq("is_active", true) as any);

      const { data, error } = await (supabase
        .from("cheque_books" as any)
        .insert({
          bank_account_id: book.bank_account_id,
          company_id: selectedCompanyId,
          prefix: book.prefix || "",
          start_number: book.start_number,
          end_number: book.end_number,
          next_number: book.start_number,
          is_active: true,
          notes: book.notes || null,
        } as any)
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheque_books"] });
      queryClient.invalidateQueries({ queryKey: ["active_cheque_book"] });
      toast({ title: "Cheque book registered successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create cheque book",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateChequeBook = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_active?: boolean; notes?: string }) => {
      const { data, error } = await (supabase
        .from("cheque_books" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheque_books"] });
      queryClient.invalidateQueries({ queryKey: ["active_cheque_book"] });
      toast({ title: "Cheque book updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
