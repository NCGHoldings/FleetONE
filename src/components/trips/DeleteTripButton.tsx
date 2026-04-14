import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteTripButtonProps {
  tripId: string;
  tripNo: string;
  busNo: string;
  routeName?: string;
  onDeleted: () => void;
  variant?: "icon" | "button";
  size?: "sm" | "default";
}

export function DeleteTripButton({
  tripId,
  tripNo,
  busNo,
  routeName,
  onDeleted,
  variant = "icon",
  size = "sm",
}: DeleteTripButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);

      // Delete from daily_trips
      const { error: tripError } = await supabase
        .from("daily_trips")
        .delete()
        .eq("id", tripId);

      if (tripError) throw tripError;

      // Also delete corresponding driver_allocation if exists
      const { error: allocError } = await supabase
        .from("driver_allocations")
        .delete()
        .eq("trip_id", tripNo);

      if (allocError) console.warn("No allocation to delete:", allocError);

      toast.success("Trip deleted successfully");
      setOpen(false);
      onDeleted();
    } catch (error: any) {
      console.error("Error deleting trip:", error);
      toast.error("Failed to delete trip");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size={size}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="destructive" size={size}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Trip
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Trip</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete:</p>
            <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
              <div>
                <span className="font-medium">Trip:</span> {tripNo}
              </div>
              <div>
                <span className="font-medium">Bus:</span> {busNo}
              </div>
              {routeName && (
                <div>
                  <span className="font-medium">Route:</span> {routeName}
                </div>
              )}
            </div>
            <p className="text-destructive font-medium">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Trip
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
