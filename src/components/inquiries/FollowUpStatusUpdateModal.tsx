import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, RefreshCw, PhoneOff, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface FollowUpStatusUpdateModalProps {
  open: boolean;
  onClose: () => void;
  followUpId: string;
  inquiryId: string;
  inquiry: any;
}

export const FollowUpStatusUpdateModal = ({
  open,
  onClose,
  followUpId,
  inquiryId,
  inquiry,
}: FollowUpStatusUpdateModalProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [completionStatus, setCompletionStatus] = useState<string>("completed");
  const [outcome, setOutcome] = useState<string>("positive");
  const [outcomeNotes, setOutcomeNotes] = useState<string>("");

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      // Update follow-up status
      const { error } = await supabase
        .from("inquiry_follow_ups")
        .update({
          completion_status: completionStatus,
          completed_at: completionStatus === "completed" ? new Date().toISOString() : null,
          outcome: completionStatus === "completed" ? outcome : null,
          outcome_notes: outcomeNotes,
        })
        .eq("id", followUpId);

      if (error) throw error;

      // Log activity
      await supabase.from("inquiry_activity_log").insert({
        inquiry_id: inquiryId,
        activity_type: "follow_up_completed",
        new_value: {
          status: completionStatus,
          outcome: outcome,
          notes: outcomeNotes,
        },
      });

      // Auto-update inquiry status if outcome is very positive
      if (completionStatus === "completed" && outcome === "positive") {
        await supabase
          .from("vehicle_inquiries")
          .update({ status: "contacted" })
          .eq("id", inquiryId)
          .eq("status", "new"); // Only update if still in "new" status
      }
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Follow-up status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["inquiry-details", inquiryId] });
      queryClient.invalidateQueries({ queryKey: ["inquiry-follow-ups", inquiryId] });
      onClose();
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCompletionStatus("completed");
    setOutcome("positive");
    setOutcomeNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeNotes.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide notes about the outcome.",
        variant: "destructive",
      });
      return;
    }
    updateStatusMutation.mutate();
  };

  const handleCreateQuotation = () => {
    const productType = inquiry?.product_type;
    const quotationPath = productType === "yutong" ? "/yutong-quotations" : "/sinotruck-quotations";
    const params = new URLSearchParams({
      fromInquiry: inquiryId,
      customerName: inquiry?.customer_name || "",
      email: inquiry?.email || "",
      phone: inquiry?.phone || "",
      company: inquiry?.company_name || "",
      model: inquiry?.model_interest || "",
    });
    navigate(`${quotationPath}?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Update Follow-up Status
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Completion Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={completionStatus} onValueChange={setCompletionStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Completed
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Cancelled
                  </div>
                </SelectItem>
                <SelectItem value="rescheduled">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-yellow-500" />
                    Rescheduled
                  </div>
                </SelectItem>
                <SelectItem value="no_response">
                  <div className="flex items-center gap-2">
                    <PhoneOff className="h-4 w-4 text-gray-500" />
                    No Response
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Outcome (only for completed status) */}
          {completionStatus === "completed" && (
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Positive - Customer Interested
                    </div>
                  </SelectItem>
                  <SelectItem value="neutral">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      Neutral - Needs More Information
                    </div>
                  </SelectItem>
                  <SelectItem value="negative">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      Negative - Not Interested
                    </div>
                  </SelectItem>
                  <SelectItem value="no_response">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-500" />
                      No Response
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Outcome Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Detailed notes from the meeting/call..."
              rows={6}
              required
            />
          </div>

          {/* Next Steps (for positive outcome) */}
          {completionStatus === "completed" && outcome === "positive" && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">Next Steps</h4>
              <p className="text-sm text-muted-foreground">
                The customer is interested! What would you like to do next?
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    // Open future planning modal (you can implement this)
                  }}
                >
                  Schedule Another Meeting
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    updateStatusMutation.mutate();
                    setTimeout(() => handleCreateQuotation(), 1000);
                  }}
                >
                  Create Quotation
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
