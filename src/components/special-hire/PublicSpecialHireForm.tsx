import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WheelTimePicker } from "@/components/ui/wheel-time-picker";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, CheckCircle, Send, Bus, Plus, X, MapPin, Search, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { createAnonymousClient } from "@/integrations/supabase/public-client";
import { useToast } from "@/hooks/use-toast";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { publicSpecialHireSchema } from "@/lib/validation";
import { z } from "zod";

const INTERNAL_COMPANIES = [
  { name: 'LYCEUM GLOBAL HOLDINGS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM EDUCATION HOLDINGS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM LEAF SCHOOL (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM INTERNATIONAL SCHOOL (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM DAY CARE (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'THE LYCEUM CAMPUS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM PLACEMENTS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM GUARDIAN (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM ASSESSMENTS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'THE LYCEUM ACADEMY (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM COLLECTION (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'N C G HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'N C G SPEED HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'N C G AUTOMOTIVE SOLUTIONS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'N C G EXPRESS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG FLEET MANAGEMENT (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'N C G SPARES (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG Maxload (Private) Limited', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG READ HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG BUILD HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG SERENGETI PROPERTY MANAGEMENT (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG WAREHOUSE SOLUTIONS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG TECH HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG KIT HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NEXTGEN HUMAN CAPITAL SOLUTIONS (PRIVATE) LIMITED', group: 'NextGen & Specialized Services' },
  { name: 'NEXTGEN PUBLICATIONS (PRIVATE) LIMITED', group: 'NextGen & Specialized Services' }
];

const LYCEUM_BRANCHES = [
  "Nugegoda", "Panadura", "Wattala", "Ratnapura", "Galle", "Kandy", 
  "Kurunegala", "Anuradhapura", "Gampaha", "Nuwara Eliya", "Jaffna"
];

const NCG_BRANCHES = [
  "Head Office", "Colombo", "Kandy", "Galle"
];

interface PublicSpecialHireFormData {
  companyName: string;
  branch: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  specialRequest: string;
  hireType: string;
  busTypeId: string;
  numberOfBuses: number;
  pickupLocation: string;
  dropLocation: string;
  intermediatePlaces: string[];
  numberOfPassengers: number;
  pickupDateTime: Date | null;
  dropDateTime: Date | null;
}

interface BusType {
  id: string;
  name: string;
  capacity: number;
  features: string;
}

type Language = 'en' | 'si' | 'ta';

export default function PublicSpecialHireForm() {
  const [formData, setFormData] = useState<PublicSpecialHireFormData>({
    companyName: '',
    branch: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    specialRequest: '',
    hireType: '',
    busTypeId: '',
    numberOfBuses: 1,
    pickupLocation: '',
    dropLocation: '',
    intermediatePlaces: [],
    numberOfPassengers: 1,
    pickupDateTime: null,
    dropDateTime: null
  });
  const [openCompanyPopover, setOpenCompanyPopover] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [language, setLanguage] = useState<Language>('en');
  const { toast } = useToast();

  useEffect(() => {
    fetchBusTypes();
  }, []);

  const fetchBusTypes = async () => {
    try {
      const anonClient = createAnonymousClient();
      const { data, error } = await anonClient
        .from('bus_types')
        .select('id, name, capacity, features')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setBusTypes(data || []);
    } catch (error) {
      console.error('Error fetching bus types:', error);
    }
  };

  const getDropPointMessage = (lang: Language) => {
    const messages = {
      en: "Drop point means the final destination where you will finish the trip. If you finish the trip at the same pickup point, that is your drop point. Trip places (intermediate stops) can be added with the plus button below.",
      si: "සැරසැර ස්ථානය යනු ගමන අවසන් කරන අවසාන ගමනාන්තයයි. ඔබ එම පිටත් වීමේ ස්ථානයේම ගමන අවසන් කරන්නේ නම්, එය ඔබේ සැරසැර ස්ථානයයි. ගමන් ස්ථාන (අතරමැදි නැවතුම්) පහත ප්ලස් බටනයෙන් එකතු කළ හැක.",
      ta: "இறக்கும் இடம் என்பது பயணத்தை முடிக்கும் இறுதி இலக்கு ஆகும். நீங்கள் அதே ஏறும் இடத்தில் பயணத்தை முடித்தால், அதுவே உங்கள் இறக்கும் இடம். பயண இடங்கள் (இடையிலான நிறுத்தங்கள்) கீழே உள்ள பிளஸ் பொத்தானைக் கொண்டு சேர்க்கலாம்."
    };
    return messages[lang];
  };

  const addIntermediatePlace = () => {
    setFormData(prev => ({
      ...prev,
      intermediatePlaces: [...prev.intermediatePlaces, '']
    }));
  };

  const removeIntermediatePlace = (index: number) => {
    setFormData(prev => ({
      ...prev,
      intermediatePlaces: prev.intermediatePlaces.filter((_, i) => i !== index)
    }));
  };

  const updateIntermediatePlace = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      intermediatePlaces: prev.intermediatePlaces.map((place, i) => i === index ? value : place)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      publicSpecialHireSchema.parse(formData);
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
      console.log('Submitting via edge function...');
      
      const allLocations = `${formData.pickupLocation}${formData.intermediatePlaces.filter(p => p.trim()).length > 0 ? ' → ' + formData.intermediatePlaces.filter(p => p.trim()).join(' → ') : ''} → ${formData.dropLocation}`;
      const busTypeName = busTypes.find(bt => bt.id === formData.busTypeId)?.name || 'Not specified';
      
      const response = await fetch(
        `https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/submit-special-hire`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4`,
          },
          body: JSON.stringify({
            company_name: formData.companyName || null,
            customer_name: formData.customerName,
            customer_phone: formData.customerPhone,
            customer_email: formData.customerEmail || null,
            special_request: `${formData.specialRequest || ''}\n\nBus Type: ${busTypeName}\nRoute: ${allLocations}`.trim(),
            hire_type: formData.hireType,
            number_of_buses: formData.numberOfBuses,
            pickup_location: formData.pickupLocation,
            drop_location: formData.dropLocation,
            number_of_passengers: formData.numberOfPassengers,
            pickup_datetime: formData.pickupDateTime.toISOString(),
            drop_datetime: formData.dropDateTime.toISOString(),
            branch: formData.branch || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      const result = await response.json();
      const submissionNo = result.data?.submission_no;

      setSubmissionId(submissionNo);
      setSubmitted(true);

      toast({
        title: "Success",
        description: `Special hire request submitted successfully! Reference: ${submissionNo}`,
      });

    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit request. Please try again.",
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
                  branch: '',
                  customerName: '',
                  customerPhone: '',
                  customerEmail: '',
                  specialRequest: '',
                  hireType: '',
                  busTypeId: '',
                  numberOfBuses: 1,
                  pickupLocation: '',
                  dropLocation: '',
                  intermediatePlaces: [],
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-3 py-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <Bus className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Special Hire Request
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground px-2">
            Get a custom quotation for your transportation needs
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl">Request Details</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Please provide complete information to help us prepare an accurate quotation for you.
                </CardDescription>
              </div>
              <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                <SelectTrigger className="w-20 sm:w-24 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="si">සි</SelectItem>
                  <SelectItem value="ta">த</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* Customer Information */}
                <h3 className="text-base sm:text-lg font-semibold">Request Category</h3>
                
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="hireType" className="text-sm">Hire Type *</Label>
                    <Select value={formData.hireType} onValueChange={(value) => setFormData(prev => ({ ...prev, hireType: value, companyName: '', branch: '' }))}>
                      <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
                        <SelectValue placeholder="Select hire type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Outside">Outside Hire</SelectItem>
                        <SelectItem value="Lyceum">Lyceum Hire</SelectItem>
                        <SelectItem value="Internal">Internal Hire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-base sm:text-lg font-semibold">Customer Information</h3>
                </div>
                
                <div>
                  <Label htmlFor="companyName" className="text-sm">
                    {formData.hireType === 'Outside' ? 'Company Name (Optional)' : 'Company Name *'}
                  </Label>
                  {formData.hireType === 'Outside' ? (
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Your company name"
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  ) : (
                    <Popover open={openCompanyPopover} onOpenChange={setOpenCompanyPopover}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCompanyPopover}
                          className={cn(
                            "w-full justify-between h-11 sm:h-10 text-base sm:text-sm font-normal",
                            !formData.companyName && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate">
                            {formData.companyName || "Select company..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search company..." />
                          <CommandList>
                            <CommandEmpty>No company found.</CommandEmpty>
                            {Object.entries(
                              INTERNAL_COMPANIES
                                .filter(c => {
                                  if (formData.hireType === 'Lyceum') return c.group.includes('Lyceum');
                                  if (formData.hireType === 'Internal') return c.group.includes('NCG') || c.group.includes('NextGen');
                                  return true;
                                })
                                .reduce((acc, curr) => {
                                  if (!acc[curr.group]) acc[curr.group] = [];
                                  acc[curr.group].push(curr.name);
                                  return acc;
                                }, {} as Record<string, string[]>)
                            ).map(([group, companies]) => (
                              <CommandGroup key={group} heading={group}>
                                {companies.map(company => (
                                  <CommandItem
                                    key={company}
                                    value={company}
                                    onSelect={(currentValue) => {
                                      setFormData(prev => ({ ...prev, companyName: currentValue }));
                                      setOpenCompanyPopover(false);
                                    }}
                                    className="text-sm"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.companyName === company ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {company}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                <div>
                  <Label htmlFor="branch" className="text-sm">Branch / Department {formData.hireType !== 'Outside' && '*'}</Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                    placeholder={formData.hireType === 'Lyceum' ? "e.g. Nugegoda, Panadura" : "e.g. Finance, Head Office"}
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    required={formData.hireType !== 'Outside'}
                  />
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="customerName" className="text-sm">Full Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Your full name"
                      required
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone" className="text-sm">Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      placeholder="+94771234567"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      maxLength={15}
                      required
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Format: +94XXXXXXXXX or 10-15 digits</p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="customerEmail" className="text-sm">Email Address</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="Your email address"
                    className="h-11 sm:h-10 text-base sm:text-sm"
                  />
                </div>

              {/* Trip Details */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-base sm:text-lg font-semibold">Trip Details</h3>
                
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="busType" className="text-sm">Bus Type *</Label>
                    <Select value={formData.busTypeId} onValueChange={(value) => setFormData(prev => ({ ...prev, busTypeId: value }))}>
                      <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
                        <SelectValue placeholder="Select bus type" />
                      </SelectTrigger>
                      <SelectContent>
                        {busTypes.map((busType) => (
                          <SelectItem key={busType.id} value={busType.id}>
                            {busType.name} ({busType.capacity} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="numberOfBuses" className="text-sm">Number of Buses *</Label>
                    <Input
                      id="numberOfBuses"
                      type="number"
                      value={formData.numberOfBuses === 0 ? '' : formData.numberOfBuses}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setFormData(prev => ({ ...prev, numberOfBuses: 0 }));
                        } else {
                          const num = parseInt(value);
                          if (!isNaN(num) && num > 0) {
                            setFormData(prev => ({ ...prev, numberOfBuses: num }));
                          }
                        }
                      }}
                      placeholder="Enter number of buses"
                      required
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="numberOfPassengers" className="text-sm">Number of Passengers *</Label>
                    <Input
                      id="numberOfPassengers"
                      type="number"
                      value={formData.numberOfPassengers === 0 ? '' : formData.numberOfPassengers}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setFormData(prev => ({ ...prev, numberOfPassengers: 0 }));
                        } else {
                          const num = parseInt(value);
                          if (!isNaN(num) && num > 0) {
                            setFormData(prev => ({ ...prev, numberOfPassengers: num }));
                          }
                        }
                      }}
                      placeholder="Enter number of passengers"
                      required
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </div>

                {/* Route Section */}
                <div className="space-y-4">
                  <h4 className="text-sm sm:text-md font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Route Information
                  </h4>
                  
                  <Alert className="py-3">
                    <MapPin className="h-4 w-4" />
                    <AlertDescription className="text-xs sm:text-sm">
                      {getDropPointMessage(language)}
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="pickupLocation" className="text-sm">Pickup Location *</Label>
                      <LocationAutocomplete
                        value={formData.pickupLocation}
                        onChange={(value) => setFormData(prev => ({ ...prev, pickupLocation: value }))}
                        placeholder="Enter pickup location"
                        className="h-11 sm:h-10 text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dropLocation" className="text-sm">Drop Location *</Label>
                      <LocationAutocomplete
                        value={formData.dropLocation}
                        onChange={(value) => setFormData(prev => ({ ...prev, dropLocation: value }))}
                        placeholder="Enter drop location"
                        className="h-11 sm:h-10 text-base sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Intermediate Places */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Trip Places (Optional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addIntermediatePlace}
                        className="flex items-center gap-1 h-9 sm:h-8 text-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="hidden sm:inline">Add Place</span>
                        <span className="sm:hidden">Add</span>
                      </Button>
                    </div>
                    
                    {formData.intermediatePlaces.map((place, index) => (
                      <div key={index} className="flex gap-2">
                        <LocationAutocomplete
                          value={place}
                          onChange={(value) => updateIntermediatePlace(index, value)}
                          placeholder={`Trip place ${index + 1}`}
                          className="flex-1 h-11 sm:h-10 text-base sm:text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeIntermediatePlace(index)}
                          className="px-3 h-11 sm:h-10"
                        >
                          <X className="w-4 h-4 sm:w-3 sm:h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm">Pickup Date & Time *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11 sm:h-10 text-sm",
                            !formData.pickupDateTime && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {formData.pickupDateTime ? format(formData.pickupDateTime, "PPP p") : "Select pickup date & time"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
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
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                        />
                        {formData.pickupDateTime && (
                          <div className="p-3 border-t">
                            <Label htmlFor="pickupTime" className="text-sm">Time:</Label>
                            <WheelTimePicker
                              value={format(formData.pickupDateTime, "HH:mm")}
                              onChange={(time) => {
                                if (formData.pickupDateTime) {
                                  const [hours, minutes] = time.split(':');
                                  const newDate = new Date(formData.pickupDateTime);
                                  newDate.setHours(parseInt(hours), parseInt(minutes));
                                  setFormData(prev => ({ ...prev, pickupDateTime: newDate }));
                                }
                              }}
                              className="mt-2"
                            />
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="text-sm">Drop Date & Time *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11 sm:h-10 text-sm",
                            !formData.dropDateTime && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {formData.dropDateTime ? format(formData.dropDateTime, "PPP p") : "Select drop date & time"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
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
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                        />
                        {formData.dropDateTime && (
                          <div className="p-3 border-t">
                            <Label htmlFor="dropTime" className="text-sm">Time:</Label>
                            <WheelTimePicker
                              value={format(formData.dropDateTime, "HH:mm")}
                              onChange={(time) => {
                                if (formData.dropDateTime) {
                                  const [hours, minutes] = time.split(':');
                                  const newDate = new Date(formData.dropDateTime);
                                  newDate.setHours(parseInt(hours), parseInt(minutes));
                                  setFormData(prev => ({ ...prev, dropDateTime: newDate }));
                                }
                              }}
                              className="mt-2"
                            />
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="specialRequest" className="text-sm">Special Requests</Label>
                  <Textarea
                    id="specialRequest"
                    value={formData.specialRequest}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialRequest: e.target.value }))}
                    placeholder="Any special requirements, requests, or additional information..."
                    rows={3}
                    className="text-base sm:text-sm resize-none"
                  />
                </div>
              </div>

              {/* Sticky Submit Button on Mobile */}
              <div className="flex gap-4 pt-4 sticky bottom-0 bg-background pb-4 sm:relative sm:pb-0 sm:bg-transparent border-t sm:border-t-0 -mx-4 px-4 sm:mx-0 sm:px-0">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 h-12 sm:h-10 text-base sm:text-sm"
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