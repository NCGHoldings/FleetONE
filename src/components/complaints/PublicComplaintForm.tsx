import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createAnonymousClient } from "@/integrations/supabase/public-client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, Send, ThumbsUp, X } from "lucide-react";
import { publicComplaintSchema } from "@/lib/validation";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { value: "service", label: "Service Quality" },
  { value: "driver", label: "Driver Behavior" },
  { value: "vehicle", label: "Vehicle Condition" },
  { value: "scheduling", label: "Scheduling Issues" },
  { value: "safety", label: "Safety Concerns" },
  { value: "billing", label: "Billing Issues" },
  { value: "customer_service", label: "Customer Service" },
  { value: "other", label: "Other" },
];

interface PublicComplaintFormData {
  type: 'complaint' | 'good_feedback';
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  title: string;
  description: string;
  category: string[];
  priority: string;
  routeNumber: string;
  busNumber: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  driverName: string;
}

const initialFormData: PublicComplaintFormData = {
  type: 'complaint',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  title: '',
  description: '',
  category: [],
  priority: 'medium',
  routeNumber: '',
  busNumber: '',
  incidentDate: '',
  incidentTime: '',
  location: '',
  driverName: '',
};

export default function PublicComplaintForm() {
  const [formData, setFormData] = useState<PublicComplaintFormData>({ ...initialFormData });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [complaintId, setComplaintId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'NCG Express - Submit Feedback';
  }, []);

  const isGoodFeedback = formData.type === 'good_feedback';

  const toggleCategory = (value: string) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.includes(value)
        ? prev.category.filter(c => c !== value)
        : [...prev.category, value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      const relatedPersons = {
        customer_name: formData.customerName || null,
        customer_phone: formData.customerPhone || null,
        customer_email: formData.customerEmail || null,
        route_number: formData.routeNumber || null,
        bus_number: formData.busNumber || null,
        incident_date: formData.incidentDate || null,
        incident_time: formData.incidentTime || null,
        location: formData.location || null,
        driver_name: formData.driverName || null,
      };

      const clientRef = `${isGoodFeedback ? 'FBK' : 'CMP'}-${Date.now().toString(36).toUpperCase()}`;

      const anonClient = createAnonymousClient();
      const { error } = await anonClient
        .from('feedback_complaints')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category.join(','),
          priority: formData.priority,
          type: formData.type,
          status: 'new',
          reported_by: null,
          escalation_level: 1,
          related_persons: relatedPersons,
        });

      if (error) throw error;

      setComplaintId(clientRef);
      setSubmitted(true);

      toast({
        title: "Success",
        description: `${isGoodFeedback ? 'Feedback' : 'Complaint'} submitted successfully! Reference: ${clientRef}`,
      });

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Error creating submission:', errMsg, error);
      toast({
        title: "Error",
        description: errMsg || "Failed to submit. Please try again.",
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
            <div className={`mx-auto w-16 h-16 ${isGoodFeedback ? 'bg-green-500/10' : 'bg-success/10'} rounded-full flex items-center justify-center mb-4`}>
              <CheckCircle className={`w-8 h-8 ${isGoodFeedback ? 'text-green-500' : 'text-success'}`} />
            </div>
            <CardTitle className={`text-2xl ${isGoodFeedback ? 'text-green-600' : 'text-success'}`}>
              {isGoodFeedback ? 'Thank You for Your Feedback!' : 'Complaint Submitted!'}
            </CardTitle>
            <CardDescription>
              {isGoodFeedback
                ? 'We appreciate your positive feedback. It helps us recognize great service!'
                : 'Thank you for your feedback. We take all complaints seriously.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Your Reference Number:</p>
              <p className="text-xl font-mono font-bold">{complaintId}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {isGoodFeedback
                ? 'Your feedback has been recorded and will be shared with the relevant team.'
                : 'Please save this reference number for tracking your complaint status. We will review your complaint and respond within 48 hours.'}
            </p>
            <Button 
              onClick={() => {
                setSubmitted(false);
                setFormData({ ...initialFormData });
              }}
              variant="outline"
              className="w-full"
            >
              Submit Another {isGoodFeedback ? 'Feedback' : 'Complaint'}
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
          <div className={`mx-auto w-20 h-20 ${isGoodFeedback ? 'bg-green-500/10' : 'bg-destructive/10'} rounded-full flex items-center justify-center mb-6`}>
            {isGoodFeedback ? (
              <ThumbsUp className="w-10 h-10 text-green-500" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-destructive" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isGoodFeedback ? 'Submit Good Feedback' : 'Submit a Complaint'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isGoodFeedback
              ? 'Let us know about a great experience with our service'
              : 'We value your feedback and are committed to resolving your concerns'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isGoodFeedback ? 'Feedback Details' : 'Complaint Details'}</CardTitle>
            <CardDescription>
              {isGoodFeedback
                ? 'Tell us about the positive experience you had.'
                : 'Please provide as much detail as possible to help us address your concern effectively.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Submission Type *</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value: 'complaint' | 'good_feedback') => setFormData(prev => ({ ...prev, type: value }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="complaint" id="type-complaint" />
                    <Label htmlFor="type-complaint" className="flex items-center gap-1.5 cursor-pointer">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Complaint
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="good_feedback" id="type-feedback" />
                    <Label htmlFor="type-feedback" className="flex items-center gap-1.5 cursor-pointer">
                      <ThumbsUp className="w-4 h-4 text-green-500" />
                      Good Feedback
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                <p className="text-sm text-muted-foreground">
                  Providing your contact details helps us follow up more effectively.
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
                    <Label htmlFor="customerPhone">Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="e.g. 0771234567"
                      required
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

              {/* Incident Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {isGoodFeedback ? 'Trip Details' : 'Incident Details'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please provide at least a Route Number or Bus Number.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="routeNumber">
                      Route Number <span className="text-destructive">†</span>
                    </Label>
                    <Input
                      id="routeNumber"
                      value={formData.routeNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, routeNumber: e.target.value }))}
                      placeholder="e.g. 138, 155"
                    />
                  </div>
                  <div>
                    <Label htmlFor="busNumber">
                      Bus Number <span className="text-destructive">†</span>
                    </Label>
                    <Input
                      id="busNumber"
                      value={formData.busNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, busNumber: e.target.value }))}
                      placeholder="e.g. NK-1234"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">† At least one of Route Number or Bus Number is required</p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="incidentDate">Date *</Label>
                    <Input
                      id="incidentDate"
                      type="date"
                      value={formData.incidentDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, incidentDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="incidentTime">Time *</Label>
                    <Input
                      id="incidentTime"
                      type="time"
                      value={formData.incidentTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, incidentTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="location">Location / Bus Stop</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. Pettah, Panadura"
                    />
                  </div>
                  <div>
                    <Label htmlFor="driverName">Driver Name (if known)</Label>
                    <Input
                      id="driverName"
                      value={formData.driverName}
                      onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))}
                      placeholder="Driver's name"
                    />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {isGoodFeedback ? 'Feedback Details' : 'Complaint Details'}
                </h3>
                
                <div>
                  <Label htmlFor="title">Subject *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={isGoodFeedback ? "What was great about the experience?" : "Brief description of your complaint"}
                    required
                  />
                </div>

                {/* Multi-Category Selection */}
                <div>
                  <Label>Category * <span className="text-xs text-muted-foreground font-normal">(select one or more)</span></Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CATEGORIES.map((cat) => {
                      const isSelected = formData.category.includes(cat.value);
                      return (
                        <Badge
                          key={cat.value}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer select-none transition-colors ${
                            isSelected
                              ? isGoodFeedback
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : ''
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleCategory(cat.value)}
                        >
                          {cat.label}
                          {isSelected && <X className="w-3 h-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                  {formData.category.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Please select at least one category</p>
                  )}
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

                <div>
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={isGoodFeedback
                      ? "Tell us what made this a great experience..."
                      : "Please provide a detailed description of your complaint including what happened, when it occurred, and any other relevant information..."}
                    rows={6}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`flex-1 ${isGoodFeedback ? 'bg-green-500 hover:bg-green-600' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      {isGoodFeedback ? <ThumbsUp className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      {isGoodFeedback ? 'Submit Feedback' : 'Submit Complaint'}
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                <p className="font-semibold mb-1">Privacy Notice:</p>
                <p>
                  Your {isGoodFeedback ? 'feedback' : 'complaint'} will be reviewed by our team. Any personal information provided 
                  will be used solely for the purpose of addressing your {isGoodFeedback ? 'feedback' : 'complaint'} and will be 
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