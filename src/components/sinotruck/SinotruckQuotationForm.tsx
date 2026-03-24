import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileText, Link2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCustomerCategories } from "@/hooks/useCustomerCategories";

// Interface for inquiry data passed from Vehicle Inquiry Hub
interface InquiryInitialData {
  inquiryId: string;
  inquiryNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  companyName: string;
  address: string;
  interestedModel: string;
  quantity: number;
}

interface SinotruckQuotationFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: InquiryInitialData | null;
}

const DEFAULT_PAYMENT_TERMS = `Payment Terms:
Bank: Commercial Bank of Ceylon PLC
Account Name: NCG Holdings (Pvt) Ltd.
Account Number: 8010015896
Branch: Nugegoda

Payment Schedule:
- 50% Advance payment upon order confirmation
- 50% Balance payment before delivery`;

const DEFAULT_TERMS_AND_CONDITIONS = [
  "The above quotation is valid for 30 days from the date of issue.",
  "Prices are quoted in USD and subject to change without prior notice.",
  "Delivery time: 60-90 days from the date of advance payment confirmation.",
  "All vehicles are brand new with manufacturer's warranty.",
  "Import duties, taxes, and registration charges are not included in the quoted price.",
  "The buyer is responsible for all customs clearance procedures.",
  "Installation and commissioning of charging infrastructure is available at additional cost.",
  "Training for drivers and maintenance staff will be provided free of charge.",
  "Spare parts availability is guaranteed for a minimum of 10 years.",
  "After-sales service and technical support will be provided by NCG Holdings.",
  "This quotation is subject to final approval by management."
];

export const SinotruckQuotationForm = ({ open, onClose, onSuccess, initialData }: SinotruckQuotationFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [truckModels, setTruckModels] = useState<any[]>([]);
  const [referralAgents, setReferralAgents] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customer_id: "",
    customer_name: initialData?.customerName || "",
    customer_address: initialData?.address || "",
    contact_number: initialData?.customerPhone || "",
    truck_model_id: "",
    quantity: initialData?.quantity || 1,
    payment_terms: DEFAULT_PAYMENT_TERMS,
    valid_until: "",
    referral_agent_id: "",
  });

  useEffect(() => {
    loadCustomers();
    loadTruckModels();
    loadReferralAgents();
  }, []);

  const loadReferralAgents = async () => {
    const { data } = await supabase
      .from("referral_agents")
      .select("*")
      .eq("status", "active")
      .order("agent_name");
    if (data) setReferralAgents(data);
  };

  const loadCustomers = async () => {
    const { data } = await supabase
      .from("sinotruck_customers")
      .select("*")
      .eq("is_active", true)
      .order("customer_name");
    if (data) setCustomers(data);
  };

  const loadTruckModels = async () => {
    const { data } = await supabase
      .from("sinotruck_truck_models")
      .select("*")
      .eq("is_active", true)
      .order("truck_name");
    if (data) setTruckModels(data);
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customerId,
        customer_name: customer.customer_name,
        customer_address: customer.address || "",
        contact_number: customer.contact_number || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedModel = truckModels.find((m) => m.id === formData.truck_model_id);
      if (!selectedModel) {
        toast.error("Please select a truck model");
        return;
      }

      const totalPrice = (selectedModel.base_price + (selectedModel.charger_price || 0)) * formData.quantity;

      const { error } = await supabase.from("sinotruck_quotations").insert([{
        quotation_no: "",
        customer_id: formData.customer_id || null,
        customer_name: formData.customer_name,
        customer_address: formData.customer_address,
        contact_number: formData.contact_number,
        truck_model_id: formData.truck_model_id,
        truck_model_name: selectedModel.truck_name,
        capacity_kw: selectedModel.capacity_kw,
        year: selectedModel.year,
        condition: selectedModel.condition,
        unit_price: selectedModel.base_price,
        charger_price: selectedModel.charger_price,
        charger_capacity_kw: selectedModel.charger_capacity_kw,
        quantity: formData.quantity,
        total_price: totalPrice,
        payment_terms: formData.payment_terms,
        terms_and_conditions: DEFAULT_TERMS_AND_CONDITIONS,
        status: "draft",
        valid_until: formData.valid_until || null,
        created_by: user?.id,
        inquiry_id: initialData?.inquiryId || null,
        referral_agent_id: formData.referral_agent_id || null,
      }]);

      if (error) throw error;

      toast.success("Quotation created successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("Error creating quotation:", error);
      toast.error(error.message || "Failed to create quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create New Quotation
            {initialData?.inquiryNumber && (
              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">
                <Link2 className="h-3 w-3 mr-1" />
                {initialData.inquiryNumber}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Inquiry Reference Banner */}
        {initialData?.inquiryId && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">Generating Quotation Against Inquiry</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400">
              <div className="flex flex-wrap gap-4 mt-1">
                <span><strong>Inquiry No:</strong> {initialData.inquiryNumber}</span>
                <span><strong>Customer:</strong> {initialData.customerName}</span>
                {initialData.interestedModel && (
                  <span><strong>Model Interest:</strong> {initialData.interestedModel}</span>
                )}
              </div>
              <p className="text-sm mt-2 opacity-80">This quotation will be automatically linked to the inquiry for tracking.</p>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Customer</Label>
              <Select onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customer_name} ({customer.customer_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="customer_address">Address</Label>
              <Textarea
                id="customer_address"
                value={formData.customer_address}
                onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number</Label>
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Truck Model *</Label>
              <Select
                value={formData.truck_model_id}
                onValueChange={(value) => setFormData({ ...formData, truck_model_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select truck model" />
                </SelectTrigger>
                <SelectContent>
                  {truckModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.truck_name} - {model.capacity_kw}KW ({model.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Referral Agent (Optional)</Label>
              <Select
                value={formData.referral_agent_id}
                onValueChange={(value) => setFormData({ ...formData, referral_agent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select referral agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No Agent</SelectItem>
                  {referralAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.agent_name} ({agent.default_commission_pct}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Textarea
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                rows={6}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Quotation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
