import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { format } from "date-fns";
import { UserPlus, FileText, Phone, MessageSquare, Mail, Building, MapPin, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InquiryFollowUpForm } from "./InquiryFollowUpForm";
import { InquiryAssignmentModal } from "./InquiryAssignmentModal";
import { ConvertToQuotationModal } from "./ConvertToQuotationModal";

interface InquiryDetailsModalProps {
  inquiryId: string;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const InquiryDetailsModal = ({
  inquiryId,
  open,
  onClose,
  onRefresh,
}: InquiryDetailsModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const { data: inquiry, isLoading } = useQuery({
    queryKey: ["inquiry-details", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inquiries")
        .select(`
          *,
          assigned_profile:profiles!vehicle_inquiries_assigned_to_fkey(first_name, last_name)
        `)
        .eq("id", inquiryId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!inquiryId && open,
  });

  const { data: followUps } = useQuery({
    queryKey: ["inquiry-follow-ups", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiry_follow_ups")
        .select(`
          *,
          created_by_profile:profiles!inquiry_follow_ups_created_by_fkey(first_name, last_name)
        `)
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!inquiryId && open,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("vehicle_inquiries")
        .update({ status: newStatus })
        .eq("id", inquiryId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["inquiry-details", inquiryId] });
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      onRefresh();
    },
  });

  if (isLoading || !inquiry) {
    return null;
  }

  const statusOptions = ["new", "contacted", "qualified", "converted", "lost"];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Inquiry Details - {inquiry.inquiry_number}</span>
              <div className="flex items-center gap-2">
                <Badge>{inquiry.product_type.toUpperCase()}</Badge>
                <Badge variant="outline">{inquiry.status.toUpperCase()}</Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Details */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium">{inquiry.customer_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </div>
                  <div className="font-medium">{inquiry.customer_phone || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </div>
                  <div className="font-medium">{inquiry.customer_email || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building className="h-3 w-3" /> Company
                  </div>
                  <div className="font-medium">{inquiry.company_name || "-"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Address
                  </div>
                  <div className="font-medium">{inquiry.address || "-"}</div>
                </div>
              </div>
            </Card>

            {/* Inquiry Details */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Inquiry Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Interested Model</div>
                  <div className="font-medium">{inquiry.interested_model || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Quantity</div>
                  <div className="font-medium">{inquiry.quantity}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Budget Range
                  </div>
                  <div className="font-medium">{inquiry.budget_range || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Source</div>
                  <div className="font-medium">{inquiry.source}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Message</div>
                  <div className="font-medium whitespace-pre-wrap">{inquiry.inquiry_message || "-"}</div>
                </div>
              </div>
            </Card>

            {/* Status & Assignment */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Status & Assignment</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Status</div>
                  <div className="flex gap-2">
                    {statusOptions.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={inquiry.status === status ? "default" : "outline"}
                        onClick={() => updateStatusMutation.mutate(status)}
                      >
                        {status.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Assigned To</div>
                  <div className="flex items-center gap-2">
                    {inquiry.assigned_profile ? (
                      <div>
                        {inquiry.assigned_profile.first_name} {inquiry.assigned_profile.last_name}
                      </div>
                    ) : (
                      <Badge variant="outline">Unassigned</Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setShowAssignModal(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {inquiry.assigned_profile ? "Reassign" : "Assign"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Follow-up History */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Follow-up History</h3>
                <Button size="sm" onClick={() => setShowFollowUpForm(true)}>
                  Add Follow-up
                </Button>
              </div>
              <div className="space-y-3">
                {followUps?.map((followUp: any) => (
                  <div key={followUp.id} className="border-l-2 border-primary pl-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{followUp.follow_up_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(followUp.created_at), "MMM dd, yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{followUp.notes}</p>
                    {followUp.created_by_profile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {followUp.created_by_profile.first_name} {followUp.created_by_profile.last_name}
                      </p>
                    )}
                  </div>
                ))}
                {!followUps || followUps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No follow-up history yet
                  </p>
                ) : null}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => setShowConvertModal(true)} disabled={inquiry.status === "converted"}>
                <FileText className="h-4 w-4 mr-2" />
                Convert to Quotation
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showFollowUpForm && (
        <InquiryFollowUpForm
          inquiryId={inquiryId}
          open={showFollowUpForm}
          onClose={() => setShowFollowUpForm(false)}
          onSuccess={() => {
            setShowFollowUpForm(false);
            queryClient.invalidateQueries({ queryKey: ["inquiry-follow-ups", inquiryId] });
          }}
        />
      )}

      {showAssignModal && (
        <InquiryAssignmentModal
          inquiryId={inquiryId}
          currentAssignee={inquiry.assigned_to}
          open={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            queryClient.invalidateQueries({ queryKey: ["inquiry-details", inquiryId] });
            onRefresh();
          }}
        />
      )}

      {showConvertModal && (
        <ConvertToQuotationModal
          inquiry={inquiry}
          open={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => {
            setShowConvertModal(false);
            onClose();
            onRefresh();
          }}
        />
      )}
    </>
  );
};