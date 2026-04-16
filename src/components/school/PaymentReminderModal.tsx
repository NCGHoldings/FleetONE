import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Send, 
  Users,
  AlertCircle,
  Clock,
  CheckCircle
} from "lucide-react";

interface Student {
  id: string;
  student_name: string;
  payment_status: string;
  payment_amount: number;
  parent_name: string;
  father_contact_no: string;
  mother_contact_no: string;
  email_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  students: Student[];
}

export function PaymentReminderModal({ open, onOpenChange, branchId, students }: Props) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [reminderType, setReminderType] = useState<string>("overdue");
  const [method, setMethod] = useState<string>("sms");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  const overdueStudents = students.filter(s => s.payment_status === "overdue");
  const pendingStudents = students.filter(s => s.payment_status === "pending");
  
  const targetStudents = reminderType === "overdue" ? overdueStudents : pendingStudents;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(targetStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const generateMessage = (student: Student) => {
    if (customMessage) return customMessage;
    
    const defaultMessages = {
      overdue: `Dear ${student.parent_name}, your child ${student.student_name}'s school bus payment of LKR ${student.payment_amount} is overdue. Please make payment to avoid service disruption.`,
      pending: `Dear ${student.parent_name}, this is a friendly reminder that ${student.student_name}'s school bus payment of LKR ${student.payment_amount} is due soon. Thank you.`,
      final_notice: `FINAL NOTICE: Dear ${student.parent_name}, ${student.student_name}'s school bus payment of LKR ${student.payment_amount} is seriously overdue. Service may be suspended if payment is not received within 24 hours.`
    };

    return defaultMessages[reminderType as keyof typeof defaultMessages] || defaultMessages.pending;
  };

  const sendReminders = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student to send reminders.",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const studentId of selectedStudents) {
        const student = targetStudents.find(s => s.id === studentId);
        if (!student) continue;

        const message = generateMessage(student);
        const contactNumber = method === "sms" ? (student.father_contact_no || student.mother_contact_no) : student.email_id;

        if (!contactNumber) {
          failCount++;
          continue;
        }

        // Insert reminder log
        const { error } = await supabase
          .from("payment_reminders")
          .insert({
            student_id: studentId,
            branch_id: branchId,
            reminder_type: reminderType,
            message: message,
            sent_via: method,
            sent_to: contactNumber,
            status: 'sent'
          });

        if (error) {
          console.error("Error logging reminder:", error);
          failCount++;
        } else {
          successCount++;
        }
      }

      toast({
        title: "Reminders Sent",
        description: `Successfully sent ${successCount} reminders. ${failCount > 0 ? `${failCount} failed.` : ''}`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      if (successCount > 0) {
        onOpenChange(false);
        setSelectedStudents([]);
        setCustomMessage("");
      }

    } catch (error) {
      console.error("Error sending reminders:", error);
      toast({
        title: "Error",
        description: "Failed to send reminders. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Payment Reminders
          </DialogTitle>
          <DialogDescription>
            Send automated payment reminders to parents via SMS or email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Reminder Type</Label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overdue">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Overdue Payments
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      Upcoming Due
                    </div>
                  </SelectItem>
                  <SelectItem value="final_notice">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      Final Notice
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      SMS
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => handleSelectAll(selectedStudents.length !== targetStudents.length)}
                variant="outline"
                className="w-full"
              >
                {selectedStudents.length === targetStudents.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">{overdueStudents.length}</div>
                    <div className="text-sm text-muted-foreground">Overdue Payments</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">{pendingStudents.length}</div>
                    <div className="text-sm text-muted-foreground">Pending Payments</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{selectedStudents.length}</div>
                    <div className="text-sm text-muted-foreground">Selected</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Custom Message */}
          <div>
            <Label>Custom Message (Optional)</Label>
            <Textarea
              placeholder="Leave empty to use default message template..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {reminderType === "overdue" ? "Overdue" : "Pending"} Students ({targetStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {targetStudents.map((student) => (
                  <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => handleStudentSelect(student.id, !!checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{student.student_name}</div>
                          <div className="text-sm text-muted-foreground">{student.parent_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">LKR {student.payment_amount?.toLocaleString()}</div>
                          <Badge variant={student.payment_status === "overdue" ? "destructive" : "secondary"}>
                            {student.payment_status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Contact: {method === "sms" ? (student.father_contact_no || student.mother_contact_no) : student.email_id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={sendReminders} disabled={sending || selectedStudents.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : `Send ${selectedStudents.length} Reminder${selectedStudents.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}