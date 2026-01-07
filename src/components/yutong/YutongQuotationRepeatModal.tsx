import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface YutongQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name: string;
  bus_model: string;
  bus_model_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  valid_until: string;
  special_features?: string;
  delivery_timeline?: string;
  payment_terms?: string;
  warranty_terms?: string;
  discount_percentage?: number;
  notes?: string;
  vehicle_customization?: string;
}

interface YutongQuotationRepeatModalProps {
  quotation: YutongQuotation | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function YutongQuotationRepeatModal({
  quotation,
  open,
  onClose,
  onSuccess,
}: YutongQuotationRepeatModalProps) {
  const [numberOfCopies, setNumberOfCopies] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Generate a unique quotation number
  const generateQuotationNo = async (index: number): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get the count of quotations created today
    const { count } = await supabase
      .from('yutong_quotations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString().slice(0, 10));
    
    const nextNum = (count || 0) + index + 1;
    const paddedNum = String(nextNum).padStart(4, '0');
    
    return `YTQ-${dateStr}-${paddedNum}-v1.0`;
  };

  const handleRepeat = async () => {
    if (!quotation || !user) return;

    setLoading(true);
    try {
      // Fetch add-ons for this quotation
      const { data: addOns } = await supabase
        .from('yutong_quotation_addons')
        .select('*')
        .eq('quotation_id', quotation.id);

      // Create quotations one by one to get unique quotation numbers
      const newQuotations = [];
      
      for (let i = 0; i < numberOfCopies; i++) {
        const quotationNo = await generateQuotationNo(i);
        
        const duplicateData = {
          quotation_no: quotationNo,
          customer_name: quotation.customer_name,
          customer_phone: quotation.customer_phone,
          customer_email: quotation.customer_email || '',
          company_name: quotation.company_name,
          bus_model: quotation.bus_model,
          bus_model_id: quotation.bus_model_id,
          quantity: 1,
          unit_price: quotation.unit_price,
          total_price: quotation.unit_price,
          valid_until: quotation.valid_until,
          special_features: quotation.special_features,
          delivery_timeline: quotation.delivery_timeline,
          payment_terms: quotation.payment_terms,
          warranty_terms: quotation.warranty_terms,
          discount_percentage: quotation.discount_percentage,
          status: 'draft',
          version_number: '1.0',
          is_active_version: true,
          created_by: user.id,
        };

        const { data, error } = await supabase
          .from('yutong_quotations')
          .insert(duplicateData)
          .select()
          .single();

        if (error) throw error;
        newQuotations.push(data);
      }

      // Duplicate add-ons for each new quotation
      if (addOns && addOns.length > 0 && newQuotations.length > 0) {
        for (const newQuotation of newQuotations) {
          const addOnsCopy = addOns.map(addon => ({
            quotation_id: newQuotation.id,
            addon_id: addon.addon_id,
            quantity: addon.quantity,
            unit_price: addon.unit_price,
            total_price: addon.total_price,
            is_free_of_charge: addon.is_free_of_charge,
            notes: addon.notes,
          }));
          
          await supabase.from('yutong_quotation_addons').insert(addOnsCopy);
        }
      }

      toast({
        title: "Success",
        description: `${numberOfCopies} quotation${numberOfCopies > 1 ? 's' : ''} created successfully`,
      });

      onSuccess();
      onClose();
      setNumberOfCopies(1);
    } catch (error: any) {
      console.error('Error repeating quotation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create quotations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Repeat Quotation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Quotation:</span>
              <span className="font-medium">{quotation.quotation_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{quotation.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company:</span>
              <span className="font-medium">{quotation.company_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bus Model:</span>
              <span className="font-medium">{quotation.bus_model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit Price:</span>
              <span className="font-medium">LKR {quotation.unit_price.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label htmlFor="copies">Number of Copies</Label>
            <Input
              id="copies"
              type="number"
              min={1}
              max={20}
              value={numberOfCopies}
              onChange={(e) => setNumberOfCopies(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className="mt-2"
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">This will create {numberOfCopies} new quotation{numberOfCopies > 1 ? 's' : ''} with:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Same customer details</li>
              <li>Same bus model and price</li>
              <li>Same add-ons and customizations</li>
              <li>New unique quotation numbers</li>
              <li>Status set to "Draft"</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRepeat} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Create {numberOfCopies} Quotation{numberOfCopies > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
