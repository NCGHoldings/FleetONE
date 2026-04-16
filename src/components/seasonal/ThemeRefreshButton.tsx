import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const ThemeRefreshButton = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Call the edge function to update active themes
      const { data, error } = await supabase.functions.invoke('refresh-seasonal-themes');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(data.message, {
          description: `Activated ${data.activated_count} theme(s)`
        });
        
        // Reload the page to apply changes
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error refreshing themes:', error);
      toast.error("Failed to refresh theme status", {
        description: error.message
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      variant="outline"
      size="sm"
      disabled={isRefreshing}
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      Refresh Active Status
    </Button>
  );
};
