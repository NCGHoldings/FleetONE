import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, BarChart3, Copy, Check } from "lucide-react";
import { DailySalesForm } from "@/components/nsp/DailySalesForm";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface OtherIncomeItem {
  description: string;
  amount: number;
}

export interface NSPSalesData {
  sale_date: Date;
  lss_outside_sale: number;
  lss_inside_sale: number;
  tyre_sale: number;
  tyre_quantity: string;
  pepiliyana_sale: number;
  other_income: OtherIncomeItem[];
  notes: string;
}

const NSPDailySales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<NSPSalesData | null>(null);

  const handleSave = async (data: NSPSalesData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save sales data",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Check if entry exists for this date
      const { data: existing, error: checkError } = await supabase
        .from('nsp_daily_sales')
        .select('id')
        .eq('sale_date', data.sale_date.toISOString().split('T')[0])
        .maybeSingle();

      if (checkError) throw checkError;

      const salesData = {
        sale_date: data.sale_date.toISOString().split('T')[0],
        lss_outside_sale: data.lss_outside_sale,
        lss_inside_sale: data.lss_inside_sale,
        tyre_sale: data.tyre_sale,
        tyre_quantity: data.tyre_quantity,
        pepiliyana_sale: data.pepiliyana_sale,
        other_income: data.other_income as any,
        notes: data.notes,
        created_by: user.id,
      };

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('nsp_daily_sales')
          .update(salesData)
          .eq('id', existing.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Daily sales updated successfully",
        });
      } else {
        // Insert new record
        const { error } = await supabase
          .from('nsp_daily_sales')
          .insert([salesData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Daily sales saved successfully",
        });
      }

      setLastSavedData(data);
    } catch (error: any) {
      console.error('Error saving sales:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save sales data",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateTelegramMessage = (data: NSPSalesData) => {
    const dateStr = data.sale_date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const formatCurrency = (num: number) => `Rs. ${num.toLocaleString()}/-`;

    let message = `NSP daily sale update - ${dateStr}\n\n`;
    message += `LSS Sale\n`;
    message += `Outside sale     = ${formatCurrency(data.lss_outside_sale)}\n`;
    message += `Inside sale      = ${formatCurrency(data.lss_inside_sale)}\n\n`;
    message += `Tyre sale        = ${formatCurrency(data.tyre_sale)}\n`;
    if (data.tyre_quantity) {
      message += `${data.tyre_quantity}\n\n`;
    } else {
      message += `\n`;
    }
    message += `Pepiliyana Sale  = ${formatCurrency(data.pepiliyana_sale)}\n\n`;

    if (data.other_income.length > 0) {
      message += `Other Income\n`;
      data.other_income.forEach(item => {
        message += `${item.description.padEnd(15)} = ${formatCurrency(item.amount)}\n`;
      });
      message += `\n`;
    }

    const total = data.lss_outside_sale + data.lss_inside_sale + data.tyre_sale + 
                  data.pepiliyana_sale + 
                  data.other_income.reduce((sum, item) => sum + item.amount, 0);

    message += `NSP Total sale   = ${formatCurrency(total)}`;

    return message;
  };

  const handleCopyMessage = () => {
    if (!lastSavedData) {
      toast({
        title: "No Data",
        description: "Please save the sales data first",
        variant: "destructive",
      });
      return;
    }

    const message = generateTelegramMessage(lastSavedData);
    navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    
    toast({
      title: "Copied!",
      description: "Telegram message copied to clipboard",
    });

    setTimeout(() => setCopiedMessage(false), 2000);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
            <ShoppingCart className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">NSP Daily Sales</h1>
            <p className="text-muted-foreground">NCG Spare Parts Daily Sales Update</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopyMessage}
            disabled={!lastSavedData}
          >
            {copiedMessage ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Telegram Message
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/nsp-summary')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Summary
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Entry</CardTitle>
          <CardDescription>
            Enter today's sales data from all locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DailySalesForm onSave={handleSave} isSaving={isSaving} />
        </CardContent>
      </Card>
    </div>
  );
};

export default NSPDailySales;
