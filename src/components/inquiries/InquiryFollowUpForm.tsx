import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface InquiryFollowUpFormProps {
  inquiryId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InquiryFollowUpForm = ({
  inquiryId,
  open,
  onClose,
  onSuccess,
}: InquiryFollowUpFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [followUpType, setFollowUpType] = useState("call");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");

  const addFollowUpMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inquiry_follow_ups").insert({
        inquiry_id: inquiryId,
        follow_up_type: followUpType,
        notes,
        next_follow_up_date: nextFollowUpDate || null,
        created_by: user?.id,
      });

      if (error) throw error;

      // Update inquiry's follow_up_date if provided
      if (nextFollowUpDate) {
        await supabase
          .from("vehicle_inquiries")
          .update({ follow_up_date: nextFollowUpDate })
          .eq("id", inquiryId);
      }
    },
    onSuccess: () => {
      toast({ title: "Follow-up added successfully" });
      onSuccess();
      setNotes("");
      setNextFollowUpDate("");
    },
    onError: (error) => {
      toast({
        title: "Error adding follow-up",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast({
        title: "Notes required",
        description: "Please add notes about this follow-up",
        variant: "destructive",
      });
      return;
    }
    addFollowUpMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Follow-up</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Follow-up Type</Label>
            <Select value={followUpType} onValueChange={setFollowUpType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Phone Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes *</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed or planned..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Next Follow-up Date (Optional)</Label>
            <Input
              type="datetime-local"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addFollowUpMutation.isPending}>
              {addFollowUpMutation.isPending ? "Adding..." : "Add Follow-up"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};