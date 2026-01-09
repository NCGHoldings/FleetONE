import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSinotrukOrderManagement } from '@/hooks/useSinotrukOrderManagement';
import { format } from 'date-fns';

interface SinotrukCreateOrderModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Quotation {
    id: string;
    quotation_no: string;
    customer_name: string;
    company_name?: string;
    truck_model_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    status: string;
    created_at: string;
}

export function SinotrukCreateOrderModal({ open, onClose, onSuccess }: SinotrukCreateOrderModalProps) {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [selectedQuotationId, setSelectedQuotationId] = useState('');
    const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
    const [formData, setFormData] = useState({
        payment_mode: 'cash' as 'cash' | 'lease',
        expected_delivery_date: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const { createOrderFromQuotation } = useSinotrukOrderManagement();

    useEffect(() => {
        if (open) {
            loadConfirmedQuotations();
        }
    }, [open]);

    const loadConfirmedQuotations = async () => {
        try {
            // Note: Sinotruk quotations might use 'confirmed' or similar status. Assuming 'confirmed' for now.
            // Also need to check if sinotruck_quotations has company_name. Based on previous file checks, it might not.
            const { data, error } = await supabase
                .from('sinotruck_quotations')
                .select('*')
                .eq('status', 'confirmed') // Assuming 'confirmed' is the status for ready-to-order quotations
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Filter out quotations that already have orders
            const { data: existingOrders } = await (supabase as any)
                .from('sinotruck_orders')
                .select('quotation_id');

            const existingQuotationIds = new Set(existingOrders?.map((o: any) => o.quotation_id) || []);
            const availableQuotations = data?.filter(q => !existingQuotationIds.has(q.id)) || [];

            setQuotations(availableQuotations);
        } catch (error) {
            console.error('Error loading quotations:', error);
        }
    };

    const handleQuotationSelect = (quotationId: string) => {
        setSelectedQuotationId(quotationId);
        const quotation = quotations.find(q => q.id === quotationId);
        setSelectedQuotation(quotation || null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuotationId) return;

        setLoading(true);

        try {
            const orderData = {
                quotation_id: selectedQuotationId,
                payment_mode: formData.payment_mode,
                expected_delivery_date: formData.expected_delivery_date || undefined,
                notes: formData.notes || undefined
            };

            const result = await createOrderFromQuotation(orderData);
            if (result.success) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error creating order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Order from Quotation</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Quotation Selection */}
                    <div className="space-y-4">
                        <Label htmlFor="quotation">Select Confirmed Quotation *</Label>
                        <Select value={selectedQuotationId} onValueChange={handleQuotationSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a confirmed quotation..." />
                            </SelectTrigger>
                            <SelectContent>
                                {quotations.map((quotation) => (
                                    <SelectItem key={quotation.id} value={quotation.id}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{quotation.quotation_no || 'No Number'} - {quotation.customer_name}</span>
                                            <Badge variant="outline" className="ml-2">
                                                {quotation.truck_model_name}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Selected Quotation Details */}
                    {selectedQuotation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Quotation Details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm text-muted-foreground">Customer</Label>
                                    <p className="font-medium">{selectedQuotation.customer_name}</p>
                                    {selectedQuotation.company_name && (
                                        <p className="text-sm text-muted-foreground">{selectedQuotation.company_name}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-sm text-muted-foreground">Truck Model</Label>
                                    <p className="font-medium">{selectedQuotation.truck_model_name}</p>
                                </div>
                                <div>
                                    <Label className="text-sm text-muted-foreground">Quantity</Label>
                                    <p className="font-medium">{selectedQuotation.quantity}</p>
                                </div>
                                <div>
                                    <Label className="text-sm text-muted-foreground">Total Price</Label>
                                    <p className="font-medium">LKR {selectedQuotation.total_price?.toLocaleString()}</p>
                                </div>
                                <div>
                                    <Label className="text-sm text-muted-foreground">Quotation Date</Label>
                                    <p className="font-medium">{format(new Date(selectedQuotation.created_at), 'MMM dd, yyyy')}</p>
                                </div>
                                <div>
                                    <Label className="text-sm text-muted-foreground">Status</Label>
                                    <Badge className="bg-green-100 text-green-800">{selectedQuotation.status}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Order Specifications */}
                    {selectedQuotation && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="payment_mode">Payment Mode *</Label>
                                    <Select value={formData.payment_mode} onValueChange={(value: 'cash' | 'lease') => handleInputChange('payment_mode', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Cash Payment (50%-50%)</SelectItem>
                                            <SelectItem value="lease">Lease Financing (20%-80%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                                    <Input
                                        id="expected_delivery_date"
                                        type="date"
                                        value={formData.expected_delivery_date}
                                        onChange={(e) => handleInputChange('expected_delivery_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="notes">Order Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                    placeholder="Additional notes for this order..."
                                    rows={3}
                                />
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-4 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!selectedQuotationId || loading}
                            className="gap-2"
                        >
                            {loading ? 'Creating Order...' : 'Create Order'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
