import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface FuturePlanningModalProps {
  open: boolean;
  onClose: () => void;
  inquiryId: string | null; // Allow null for standalone scheduling
}

export const FuturePlanningModal = ({ open, onClose, inquiryId: propInquiryId }: FuturePlanningModalProps) => {
  const [selectedInquiryId, setSelectedInquiryId] = useState<string>(propInquiryId || "");
  const queryClient = useQueryClient();
  const [followUpType, setFollowUpType] = useState<string>("phone_call");
  const [plannedDate, setPlannedDate] = useState<string>("");
  const [plannedTime, setPlannedTime] = useState<string>("");
  const [duration, setDuration] = useState<string>("30");
  const [location, setLocation] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("follow_up");
  const [notes, setNotes] = useState<string>("");
  const [reminderBefore, setReminderBefore] = useState<string>("1440"); // 1 day in minutes

  // Fetch all inquiries for the dropdown (if inquiryId is null)
  const { data: inquiries } = useQuery({
    queryKey: ["inquiries-for-planning"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inquiries")
        .select("id, inquiry_number, customer_name, product_type, status")
        .neq("status", "converted")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !propInquiryId, // Only fetch if no inquiry ID provided
  });

  const scheduleMeetingMutation = useMutation({
    mutationFn: async () => {
      const targetInquiryId = propInquiryId || selectedInquiryId;
      if (!targetInquiryId) {
        throw new Error("Please select an inquiry");
      }
      const plannedDateTime = `${plannedDate}T${plannedTime}:00`;
      const reminderDateTime = new Date(new Date(plannedDateTime).getTime() - parseInt(reminderBefore) * 60000).toISOString();

      // Insert follow-up with future planning data
      const { data: followUp, error } = await supabase
        .from("inquiry_follow_ups")
        .insert({
          inquiry_id: targetInquiryId,
          follow_up_type: followUpType,
          notes: notes,
          planned_date: plannedDateTime,
          planned_duration_minutes: parseInt(duration),
          location: followUpType === "in_person" || followUpType === "site_visit" ? location : null,
          completion_status: "pending",
          reminder_date: reminderDateTime,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from("inquiry_activity_log").insert({
        inquiry_id: targetInquiryId,
        activity_type: "meeting_scheduled",
        new_value: {
          type: followUpType,
          planned_date: plannedDateTime,
          duration: duration,
          purpose: purpose,
        },
      });

      return followUp;
    },
    onSuccess: () => {
      const targetInquiryId = propInquiryId || selectedInquiryId;
      toast({
        title: "Meeting Scheduled",
        description: "The meeting/call has been scheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["inquiry-details", targetInquiryId] });
      queryClient.invalidateQueries({ queryKey: ["inquiry-follow-ups", targetInquiryId] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-meetings"] });
      onClose();
      resetForm();
    },
    onError: (error) => {
      console.error("Error scheduling meeting:", error);
      toast({
        title: "Error",
        description: "Failed to schedule meeting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFollowUpType("phone_call");
    setPlannedDate("");
    setPlannedTime("");
    setDuration("30");
    setLocation("");
    setPurpose("follow_up");
    setNotes("");
    setReminderBefore("1440");
    if (!propInquiryId) {
      setSelectedInquiryId("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plannedDate || !plannedTime) {
      toast({
        title: "Missing Information",
        description: "Please select date and time for the meeting.",
        variant: "destructive",
      });
      return;
    }
    scheduleMeetingMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Schedule Future Meeting/Call
          </DialogTitle>
          <DialogDescription>
            Plan future interactions with your customer
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Inquiry Selection (if not pre-selected) */}
          {!propInquiryId && (
            <div className="space-y-2">
              <Label htmlFor="inquiry">Select Inquiry *</Label>
              <Select value={selectedInquiryId} onValueChange={setSelectedInquiryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an inquiry to schedule for..." />
                </SelectTrigger>
                <SelectContent>
                  {inquiries?.map((inquiry) => (
                    <SelectItem key={inquiry.id} value={inquiry.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {inquiry.product_type}
                        </Badge>
                        <span>{inquiry.customer_name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({inquiry.inquiry_number})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Meeting/Call Type</Label>
            <Select value={followUpType} onValueChange={setFollowUpType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone_call">Phone Call</SelectItem>
                <SelectItem value="video_call">Video Call</SelectItem>
                <SelectItem value="in_person">In-Person Meeting</SelectItem>
                <SelectItem value="site_visit">Site Visit</SelectItem>
                <SelectItem value="product_demo">Product Demo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Expected Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location (for in-person meetings) */}
          {(followUpType === "in_person" || followUpType === "site_visit" || followUpType === "video_call") && (
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {followUpType === "video_call" ? "Meeting Link" : "Location"}
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={
                  followUpType === "video_call"
                    ? "https://meet.google.com/..."
                    : "Enter address or location"
                }
              />
            </div>
          )}

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="initial_discussion">Initial Discussion</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="product_presentation">Product Presentation</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="final_decision">Final Decision</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label htmlFor="reminder">Send Reminder</Label>
            <Select value={reminderBefore} onValueChange={setReminderBefore}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="360">6 hours before</SelectItem>
                <SelectItem value="1440">1 day before</SelectItem>
                <SelectItem value="2880">2 days before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agenda & Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agenda items, preparation notes, attendees..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={scheduleMeetingMutation.isPending}>
              {scheduleMeetingMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
