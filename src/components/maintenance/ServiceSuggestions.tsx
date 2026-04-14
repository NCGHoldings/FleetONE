import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ServiceItem {
  id: string;
  item_code?: string;
  item_description: string;
  default_qty: number;
  base_role: string;
  role_rate_per_hour: number;
  estimated_hours: number;
  notes?: string;
}

interface ServiceSuggestionsProps {
  serviceType: string;
  onSuggestionApply: (suggestion: {
    description: string;
    estimatedHours: number;
    estimatedCost: number;
    parts: Array<{
      item_code?: string;
      item_description: string;
      quantity: number;
      unit_cost: number;
    }>;
  }) => void;
}

export default function ServiceSuggestions({ serviceType, onSuggestionApply }: ServiceSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ServiceItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<ServiceItem[]>([]);
  const [customParts, setCustomParts] = useState<Array<{
    item_description: string;
    quantity: number;
    unit_cost: number;
  }>>([]);
  const [profitMargin, setProfitMargin] = useState(20);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (serviceType) {
      fetchSuggestions();
    }
  }, [serviceType]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_master')
        .select('*')
        .eq('service_type', serviceType)
        .order('item_description');

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (item: ServiceItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(s => s.id === item.id);
      if (exists) {
        return prev.filter(s => s.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const addCustomPart = () => {
    setCustomParts(prev => [...prev, {
      item_description: '',
      quantity: 1,
      unit_cost: 0
    }]);
  };

  const removeCustomPart = (index: number) => {
    setCustomParts(prev => prev.filter((_, i) => i !== index));
  };

  const updateCustomPart = (index: number, field: string, value: any) => {
    setCustomParts(prev => prev.map((part, i) => 
      i === index ? { ...part, [field]: value } : part
    ));
  };

  const calculateCosts = () => {
    // Labor costs from selected items
    const laborCost = selectedItems.reduce((total, item) => {
      return total + (item.estimated_hours * item.role_rate_per_hour * item.default_qty);
    }, 0);

    // Parts costs (estimated - would need actual inventory prices)
    const partsCost = selectedItems.reduce((total, item) => {
      // Estimate parts cost based on service type and item
      const estimatedPartCost = item.item_code ? 1000 : 0; // Simple estimation
      return total + (estimatedPartCost * item.default_qty);
    }, 0);

    // Custom parts cost
    const customPartsCost = customParts.reduce((total, part) => {
      return total + (part.quantity * part.unit_cost);
    }, 0);

    const subtotal = laborCost + partsCost + customPartsCost;
    const profitAmount = (subtotal * profitMargin) / 100;
    const totalCost = subtotal + profitAmount;

    return {
      laborCost,
      partsCost: partsCost + customPartsCost,
      profitAmount,
      totalCost,
      totalHours: selectedItems.reduce((total, item) => total + item.estimated_hours, 0)
    };
  };

  const applySuggestion = () => {
    const costs = calculateCosts();
    const allParts = [
      ...selectedItems.map(item => ({
        item_code: item.item_code,
        item_description: item.item_description,
        quantity: item.default_qty,
        unit_cost: 1000 // Estimated
      })),
      ...customParts.filter(part => part.item_description.trim() !== '')
    ];

    const description = selectedItems.map(item => item.item_description).join(', ') + 
      (customParts.length > 0 ? ', ' + customParts.map(p => p.item_description).join(', ') : '');

    onSuggestionApply({
      description,
      estimatedHours: costs.totalHours,
      estimatedCost: costs.totalCost,
      parts: allParts
    });
  };

  const costs = calculateCosts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Service Suggestions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">Loading suggestions...</div>
        ) : (
          <>
            {suggestions.length > 0 ? (
              <div className="space-y-2">
                <Label>Select Service Items:</Label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {suggestions.map(item => (
                    <div
                      key={item.id}
                      className={`p-2 border rounded cursor-pointer transition-colors ${
                        selectedItems.find(s => s.id === item.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleItem(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.item_description}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.item_code && `${item.item_code} • `}
                            Qty: {item.default_qty} • {item.estimated_hours}h @ ₨{item.role_rate_per_hour}/h
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.base_role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No suggestions available for "{serviceType}". Add custom parts below.
              </p>
            )}

            {/* Custom Parts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Parts:</Label>
                <Button size="sm" variant="outline" onClick={addCustomPart}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Part
                </Button>
              </div>
              
              {customParts.map((part, index) => (
                <div key={index} className="flex gap-2 items-center p-2 border rounded">
                  <Input
                    placeholder="Part description"
                    value={part.item_description}
                    onChange={(e) => updateCustomPart(index, 'item_description', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={part.quantity}
                    onChange={(e) => updateCustomPart(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Cost"
                    value={part.unit_cost}
                    onChange={(e) => updateCustomPart(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <Button size="sm" variant="ghost" onClick={() => removeCustomPart(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Profit Margin */}
            <div className="space-y-2">
              <Label>Profit Margin (%):</Label>
              <Input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                className="w-24"
              />
            </div>

            {/* Cost Breakdown */}
            {(selectedItems.length > 0 || customParts.some(p => p.item_description)) && (
              <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                <div className="font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Cost Breakdown:
                </div>
                <div className="flex justify-between">
                  <span>Labor Cost:</span>
                  <span>₨{costs.laborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Parts Cost:</span>
                  <span>₨{costs.partsCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Profit ({profitMargin}%):</span>
                  <span>₨{costs.profitAmount.toFixed(2)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-medium">
                  <span>Total Estimated Cost:</span>
                  <span>₨{costs.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Estimated Hours:</span>
                  <span>{costs.totalHours}h</span>
                </div>
              </div>
            )}

            {(selectedItems.length > 0 || customParts.some(p => p.item_description)) && (
              <Button onClick={applySuggestion} className="w-full">
                Apply Suggestion
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}