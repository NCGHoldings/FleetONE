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
      // Call the RPC function to update active themes
      const { error } = await supabase.rpc('update_active_seasonal_themes');
      
      if (error) throw error;
      
      toast.success("Theme status refreshed successfully");
      
      // Reload the page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error refreshing themes:', error);
      toast.error("Failed to refresh theme status");
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
