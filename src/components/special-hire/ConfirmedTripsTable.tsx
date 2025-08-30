import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CreditCard, CheckCircle, Eye, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConfirmedTrip {
  id: string;
  quotation_no: string;
  customer_name: string;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  number_of_buses: number;
  status: string;
  confirmed_at: string;
  advance_payment?: {
    id: string;
    amount: number;
    rounded_amount: number;
    payment_status: string;
    payment_proof_url?: string;
    payment_method?: string;
  };
}

export function ConfirmedTripsTable() {
  const [trips, setTrips] = useState<ConfirmedTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<ConfirmedTrip | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchConfirmedTrips();
  }, []);

  const fetchConfirmedTrips = async () => {
    const { data: trips } = await supabase
      .from('trip_confirmations')
      .select(`
        *,
        trip_payments (
          id,
          amount,
          rounded_amount,
          payment_status,
          payment_proof_url,
          payment_method,
          payment_type
        )
      `)
      .order('confirmed_at', { ascending: false });

    if (trips) {
      const formattedTrips = trips.map(trip => ({
        ...trip,
        advance_payment: trip.trip_payments?.find((p: any) => p.payment_type === 'advance')
      }));
      setTrips(formattedTrips);
    }
  };

  const generateAdvanceSlip = async (trip: ConfirmedTrip) => {
    if (!trip.advance_payment) return;

    // Generate advance payment slip PDF
    const content = `
      <div style="padding: 20px; font-family: Arial;">
        <h2>Advance Payment Slip</h2>
        <p><strong>Quotation No:</strong> ${trip.quotation_no}</p>
        <p><strong>Customer:</strong> ${trip.customer_name}</p>
        <p><strong>Route:</strong> ${trip.pickup_location} → ${trip.drop_location}</p>
        <p><strong>Date:</strong> ${new Date(trip.pickup_datetime).toLocaleDateString()}</p>
        <p><strong>Advance Amount:</strong> LKR ${trip.advance_payment.rounded_amount.toLocaleString()}</p>
        <p><strong>Status:</strong> ${trip.advance_payment.payment_status}</p>
        <p style="margin-top: 30px;">Please make payment to the company account and upload proof of payment.</p>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const confirmPaymentReceived = async (trip: ConfirmedTrip) => {
    if (!trip.advance_payment) return;

    const { error } = await supabase
      .from('trip_payments')
      .update({
        payment_status: 'confirmed',
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_date: paymentDate,
        received_by: (await supabase.auth.getUser()).data.user?.id,
        received_at: new Date().toISOString()
      })
      .eq('id', trip.advance_payment.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Payment Confirmed",
        description: "Advance payment has been confirmed"
      });
      setPaymentModalOpen(false);
      fetchConfirmedTrips();
    }
  };

  const uploadPaymentProof = async () => {
    if (!paymentProof || !selectedTrip?.advance_payment) return;

    setLoading(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = paymentProof.name.split('.').pop();
      const fileName = `payment-proof-${selectedTrip.quotation_no}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, paymentProof);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Update payment record
      const { error: updateError } = await supabase
        .from('trip_payments')
        .update({
          payment_proof_url: publicUrl,
          payment_proof_filename: paymentProof.name,
          payment_status: 'received'
        })
        .eq('id', selectedTrip.advance_payment.id);

      if (updateError) throw updateError;

      toast({
        title: "Payment Proof Uploaded",
        description: "Payment proof has been uploaded successfully"
      });

      setProofModalOpen(false);
      setPaymentProof(null);
      fetchConfirmedTrips();

    } catch (error: any) {
      console.error('Error uploading payment proof:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload payment proof",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Payment Pending' },
      received: { variant: 'default' as const, label: 'Payment Received' },
      confirmed: { variant: 'default' as const, label: 'Payment Confirmed' },
      verified: { variant: 'default' as const, label: 'Payment Verified' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Confirmed Trips</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Buses</TableHead>
                <TableHead>Advance Payment</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium">{trip.quotation_no}</TableCell>
                  <TableCell>{trip.customer_name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {trip.pickup_location} → {trip.drop_location}
                  </TableCell>
                  <TableCell>
                    {new Date(trip.pickup_datetime).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{trip.number_of_buses}</TableCell>
                  <TableCell>
                    {trip.advance_payment ? (
                      <span className="font-semibold">
                        LKR {trip.advance_payment.rounded_amount.toLocaleString()}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {trip.advance_payment ? getStatusBadge(trip.advance_payment.payment_status) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => generateAdvanceSlip(trip)}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {trip.advance_payment?.payment_status === 'pending' && (
                        <>
                          <Button
                            onClick={() => {
                              setSelectedTrip(trip);
                              setPaymentModalOpen(true);
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedTrip(trip);
                              setProofModalOpen(true);
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {trip.advance_payment?.payment_status === 'received' && (
                        <Button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setPaymentModalOpen(true);
                          }}
                          size="sm"
                          variant="default"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}

                      {trip.advance_payment?.payment_proof_url && (
                        <Button
                          onClick={() => window.open(trip.advance_payment?.payment_proof_url, '_blank')}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {trips.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No confirmed trips found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Confirmation Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment Received</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTrip && (
              <div className="p-4 bg-muted rounded-lg">
                <p><strong>Quotation:</strong> {selectedTrip.quotation_no}</p>
                <p><strong>Customer:</strong> {selectedTrip.customer_name}</p>
                <p><strong>Amount:</strong> LKR {selectedTrip.advance_payment?.rounded_amount.toLocaleString()}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card Payment</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Reference</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID or reference number"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedTrip && confirmPaymentReceived(selectedTrip)}
                disabled={!paymentMethod || !paymentDate}
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Proof Upload Modal */}
      <Dialog open={proofModalOpen} onOpenChange={setProofModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Payment Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTrip && (
              <div className="p-4 bg-muted rounded-lg">
                <p><strong>Quotation:</strong> {selectedTrip.quotation_no}</p>
                <p><strong>Amount:</strong> LKR {selectedTrip.advance_payment?.rounded_amount.toLocaleString()}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Upload Payment Slip/Receipt</Label>
              <Input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Accepted formats: JPG, PNG, PDF (Max 5MB)
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setProofModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={uploadPaymentProof}
                disabled={!paymentProof || loading}
              >
                {loading ? 'Uploading...' : 'Upload Proof'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}