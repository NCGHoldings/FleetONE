import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle, Send, Bus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

interface PublicSpecialHireFormData {
  companyName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  specialRequest: string;
  hireType: string;
  numberOfBuses: number;
  pickupLocation: string;
  dropLocation: string;
  numberOfPassengers: number;
  pickupDateTime: Date | null;
  dropDateTime: Date | null;
}

export default function PublicSpecialHireForm() {
  const [formData, setFormData] = useState<PublicSpecialHireFormData>({
    companyName: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    specialRequest: '',
    hireType: '',
    numberOfBuses: 1,
    pickupLocation: '',
    dropLocation: '',
    numberOfPassengers: 1,
    pickupDateTime: null,
    dropDateTime: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone || !formData.pickupLocation || 
        !formData.dropLocation || !formData.pickupDateTime || !formData.dropDateTime || 
        !formData.hireType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.pickupDateTime >= formData.dropDateTime) {
      toast({
        title: "Error",
        description: "Drop date/time must be after pickup date/time",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Attempting to submit form data:', {
        company_name: formData.companyName || null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail || null,
        special_request: formData.specialRequest || null,
        hire_type: formData.hireType,
        number_of_buses: formData.numberOfBuses,
        pickup_location: formData.pickupLocation,
        drop_location: formData.dropLocation,
        number_of_passengers: formData.numberOfPassengers,
        pickup_datetime: formData.pickupDateTime?.toISOString(),
        drop_datetime: formData.dropDateTime?.toISOString(),
        submission_status: 'pending'
      });

      const { data, error } = await supabase
        .from('special_hire_submissions')
        .insert({
          company_name: formData.companyName || null,
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          customer_email: formData.customerEmail || null,
          special_request: formData.specialRequest || null,
          hire_type: formData.hireType,
          number_of_buses: formData.numberOfBuses,
          pickup_location: formData.pickupLocation,
          drop_location: formData.dropLocation,
          number_of_passengers: formData.numberOfPassengers,
          pickup_datetime: formData.pickupDateTime.toISOString(),
          drop_datetime: formData.dropDateTime.toISOString(),
          submission_status: 'pending'
        })
        .select('submission_no')
        .single();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      setSubmissionId(data.submission_no);
      setSubmitted(true);

      toast({
        title: "Success",
        description: `Special hire request submitted successfully! Reference: ${data.submission_no}`,
      });

    } catch (error) {
      console.error('Error creating submission:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast({
        title: "Error",
        description: `Failed to submit request: ${error.message || 'Unknown error'}. Please try again.`,
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
            <CardTitle className="text-2xl text-success">Request Submitted!</CardTitle>
            <CardDescription>
              Thank you for your special hire request. Our team will review it and contact you shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Your Reference Number:</p>
              <p className="text-xl font-mono font-bold">{submissionId}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please save this reference number for tracking your request status.
              We will review your request and provide a quotation within 24 hours.
            </p>
            <Button 
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  companyName: '',
                  customerName: '',
                  customerPhone: '',
                  customerEmail: '',
                  specialRequest: '',
                  hireType: '',
                  numberOfBuses: 1,
                  pickupLocation: '',
                  dropLocation: '',
                  numberOfPassengers: 1,
                  pickupDateTime: null,
                  dropDateTime: null
                });
              }}
              variant="outline"
              className="w-full"
            >
              Submit Another Request
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
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Bus className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Special Hire Request
          </h1>
          <p className="text-lg text-muted-foreground">
            Get a custom quotation for your transportation needs
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Please provide complete information to help us prepare an accurate quotation for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                
                <div>
                  <Label htmlFor="companyName">Company Name (Optional)</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Your company name"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="Your phone number"
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

              {/* Trip Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Trip Details</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="hireType">Hire Type *</Label>
                    <Select value={formData.hireType} onValueChange={(value) => setFormData(prev => ({ ...prev, hireType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select hire type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Outside">Outside Hire</SelectItem>
                        <SelectItem value="Lyceum">Lyceum Hire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="numberOfBuses">Number of Buses *</Label>
                    <Input
                      id="numberOfBuses"
                      type="number"
                      min="1"
                      value={formData.numberOfBuses}
                      onChange={(e) => setFormData(prev => ({ ...prev, numberOfBuses: parseInt(e.target.value) || 1 }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="numberOfPassengers">Number of Passengers *</Label>
                  <Input
                    id="numberOfPassengers"
                    type="number"
                    min="1"
                    value={formData.numberOfPassengers}
                    onChange={(e) => setFormData(prev => ({ ...prev, numberOfPassengers: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="pickupLocation">Pickup Location *</Label>
                    <LocationAutocomplete
                      value={formData.pickupLocation}
                      onChange={(value) => setFormData(prev => ({ ...prev, pickupLocation: value }))}
                      placeholder="Enter pickup location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dropLocation">Drop Location *</Label>
                    <LocationAutocomplete
                      value={formData.dropLocation}
                      onChange={(value) => setFormData(prev => ({ ...prev, dropLocation: value }))}
                      placeholder="Enter drop location"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Pickup Date & Time *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.pickupDateTime && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.pickupDateTime ? format(formData.pickupDateTime, "PPP p") : "Select pickup date & time"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.pickupDateTime}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date);
                              newDate.setHours(9, 0, 0, 0); // Default to 9 AM
                              setFormData(prev => ({ ...prev, pickupDateTime: newDate }));
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                        {formData.pickupDateTime && (
                          <div className="p-3 border-t">
                            <Label htmlFor="pickupTime">Time:</Label>
                            <Input
                              id="pickupTime"
                              type="time"
                              value={format(formData.pickupDateTime, "HH:mm")}
                              onChange={(e) => {
                                if (formData.pickupDateTime) {
                                  const [hours, minutes] = e.target.value.split(':');
                                  const newDate = new Date(formData.pickupDateTime);
                                  newDate.setHours(parseInt(hours), parseInt(minutes));
                                  setFormData(prev => ({ ...prev, pickupDateTime: newDate }));
                                }
                              }}
                            />
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Drop Date & Time *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dropDateTime && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dropDateTime ? format(formData.dropDateTime, "PPP p") : "Select drop date & time"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.dropDateTime}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date);
                              newDate.setHours(18, 0, 0, 0); // Default to 6 PM
                              setFormData(prev => ({ ...prev, dropDateTime: newDate }));
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                        {formData.dropDateTime && (
                          <div className="p-3 border-t">
                            <Label htmlFor="dropTime">Time:</Label>
                            <Input
                              id="dropTime"
                              type="time"
                              value={format(formData.dropDateTime, "HH:mm")}
                              onChange={(e) => {
                                if (formData.dropDateTime) {
                                  const [hours, minutes] = e.target.value.split(':');
                                  const newDate = new Date(formData.dropDateTime);
                                  newDate.setHours(parseInt(hours), parseInt(minutes));
                                  setFormData(prev => ({ ...prev, dropDateTime: newDate }));
                                }
                              }}
                            />
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="specialRequest">Special Requests</Label>
                  <Textarea
                    id="specialRequest"
                    value={formData.specialRequest}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialRequest: e.target.value }))}
                    placeholder="Any special requirements, requests, or additional information..."
                    rows={4}
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
                      Submit Request
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                <p className="font-semibold mb-1">Privacy Notice:</p>
                <p>
                  Your request will be reviewed by our team. Any personal information provided 
                  will be used solely for the purpose of preparing your quotation and will be 
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