import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAccountingAccess = () => {
  const [isGranting, setIsGranting] = useState(false);

  const grantAccountingAccess = async () => {
    setIsGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke('grant-accounting-access');
      
      if (error) throw error;
      
      toast.success(data.message || "Accounting access granted successfully");
      
      // Refresh the page to update permissions
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      return data;
    } catch (error: any) {
      console.error("Error granting accounting access:", error);
      toast.error(error.message || "Failed to grant accounting access");
      throw error;
    } finally {
      setIsGranting(false);
    }
  };

  return { grantAccountingAccess, isGranting };
};
