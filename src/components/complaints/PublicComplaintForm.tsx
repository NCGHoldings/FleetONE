import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabasePublic as supabase } from "@/integrations/supabase/public-client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, Send } from "lucide-react";
import { publicComplaintSchema } from "@/lib/validation";
import { z } from "zod";

interface PublicComplaintFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  title: string;
  description: string;
  category: string;
  priority: string;
}

export default function PublicComplaintForm() {
  const [formData, setFormData] = useState<PublicComplaintFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [complaintId, setComplaintId] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    try {
      publicComplaintSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Format contact info to include in description
      let enhancedDescription = formData.description;
      
      if (formData.customerName || formData.customerPhone || formData.customerEmail) {
        enhancedDescription += "\n\n--- Customer Contact Information ---";
        if (formData.customerName) enhancedDescription += `\nName: ${formData.customerName}`;
        if (formData.customerPhone) enhancedDescription += `\nPhone: ${formData.customerPhone}`;
        if (formData.customerEmail) enhancedDescription += `\nEmail: ${formData.customerEmail}`;
      }
      
      const { data, error } = await supabase
        .from('feedback_complaints')
        .insert({
          title: formData.title,
          description: enhancedDescription,
          category: formData.category,
          priority: formData.priority,
          type: 'complaint',
          status: 'new',
          reported_by: null, // Anonymous submission
          escalation_level: 1
        })
        .select('id')
        .single();

      if (error) throw error;

      const generatedId = `CMP-${data.id.slice(-6)}`;
      setComplaintId(generatedId);
      setSubmitted(true);

      toast({
        title: "Success",
        description: `Complaint submitted successfully! Reference: ${generatedId}`,
      });

    } catch (error) {
      console.error('Error creating complaint:', error);
      toast({
        title: "Error",
        description: "Failed to submit complaint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <CardTitle className="text-2xl text-success">Complaint Submitted!</CardTitle>
            <CardDescription>
              Thank you for your feedback. We take all complaints seriously.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Your Reference Number:</p>
              <p className="text-xl font-mono font-bold">{complaintId}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please save this reference number for tracking your complaint status.
              We will review your complaint and respond within 48 hours.
            </p>
            <Button 
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  customerName: '',
                  customerPhone: '',
                  customerEmail: '',
                  title: '',
                  description: '',
                  category: '',
                  priority: 'medium'
                });
              }}
              variant="outline"
              className="w-full"
            >
              Submit Another Complaint
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Submit a Complaint
          </h1>
          <p className="text-lg text-muted-foreground">
            We value your feedback and are committed to resolving your concerns
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complaint Details</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help us address your concern effectively.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information (Optional) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information (Optional)</h3>
                <p className="text-sm text-muted-foreground">
                  Providing your contact details helps us follow up on your complaint more effectively.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="customerName">Full Name</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone Number</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="Your phone number"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="customerEmail">Email Address</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="Your email address"
                  />
                </div>
              </div>

              {/* Complaint Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Complaint Details</h3>
                
                <div>
                  <Label htmlFor="title">Subject *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief description of your complaint"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select complaint category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="service">Service Quality</SelectItem>
                        <SelectItem value="driver">Driver Behavior</SelectItem>
                        <SelectItem value="vehicle">Vehicle Condition</SelectItem>
                        <SelectItem value="scheduling">Scheduling Issues</SelectItem>
                        <SelectItem value="safety">Safety Concerns</SelectItem>
                        <SelectItem value="billing">Billing Issues</SelectItem>
                        <SelectItem value="customer_service">Customer Service</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Please provide a detailed description of your complaint including what happened, when it occurred, and any other relevant information..."
                    rows={6}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Complaint
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                <p className="font-semibold mb-1">Privacy Notice:</p>
                <p>
                  Your complaint will be reviewed by our team. Any personal information provided 
                  will be used solely for the purpose of addressing your complaint and will be 
                  handled in accordance with our privacy policy.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}