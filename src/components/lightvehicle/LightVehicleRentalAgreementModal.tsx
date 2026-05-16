import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

interface Rental {
  id: string;
  vehicle_name: string;
  vehicle_number: string;
  customer_id: string;
  customers: { customer_name: string };
  start_date: string;
  end_date: string | null;
  monthly_rent_amount: number;
  next_billing_date: string;
  status: string;
  created_at: string;
}

interface LightVehicleRentalAgreementModalProps {
  rental: Rental | null;
  open: boolean;
  onClose: () => void;
}

export function LightVehicleRentalAgreementModal({ rental, open, onClose }: LightVehicleRentalAgreementModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!rental) return null;

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '', 'height=800,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Vehicle Rental Agreement</title></head><body style="margin:0;padding:0;background:#f9f9f9;">');
        printWindow.document.write(printRef.current.outerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.print();
        }, 200);
      }
    }
  };

  const pageHeaderFooterStyles = `
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body { margin: 0; padding: 0; background: white !important; }
      .page {
        width: 100% !important;
        max-width: none !important;
        height: 277mm;
        max-height: 277mm;
        min-height: 277mm;
        page-break-after: always;
        page-break-inside: avoid;
        display: flex !important;
        flex-direction: column !important;
        border: none !important;
        margin: 0 !important;
        padding: 5mm !important;
        box-sizing: border-box;
        overflow: hidden;
        background: white !important;
      }
      .page:last-child { page-break-after: avoid; }
      .page-header { flex-shrink: 0; margin-bottom: 8px !important; }
      .page-header img { max-height: 80px !important; }
      .page-content { flex: 1; overflow: hidden; padding: 0 !important; }
      .page-footer { flex-shrink: 0; margin-top: auto !important; padding-top: 8px !important; }
      table { page-break-inside: avoid; width: 100%; border-collapse: collapse; }
      .signatures { margin-top: 15px !important; margin-bottom: 10px !important; page-break-inside: avoid; }
      .signature-field { min-height: 70px !important; }
      .signature-content { height: 50px !important; }
      .footer-contact { page-break-inside: avoid; padding: 6px 10px !important; font-size: 11px !important; }
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      max-width: 210mm;
      display: flex;
      flex-direction: column;
      background: white;
      border: 2px solid #1e40af;
      margin: 0 auto 20px auto;
      position: relative;
      padding: 15mm;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      color: #000;
    }
    .page-header { flex-shrink: 0; margin-bottom: 15px; }
    .page-footer { flex-shrink: 0; margin-top: auto; padding-top: 15px; }
    .page-content { flex: 1; display: flex; flex-direction: column; }
    .signatures { display: flex; justify-content: space-between; font-size: 14px; margin-top: 25px; margin-bottom: 15px; }
    .signature-field { text-align: center; width: 40%; min-height: 80px; display: flex; flex-direction: column; justify-content: flex-end; }
    .signature-content { height: 55px; display: flex; align-items: flex-end; justify-content: center; }
    .signature-line { border-top: 1px dotted #000; padding-top: 4px; margin-top: 8px; }
    .footer-contact { background: #1e40af; color: white; padding: 8px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
    
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    .data-table th { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; width: 40%; }
    .data-table td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; }
    
    .terms-section h3 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 4px; font-size: 14px; margin-bottom: 10px; margin-top: 0; }
    .terms-section p { font-size: 11px; margin-bottom: 6px; line-height: 1.35; margin-top: 0; }
  `;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Rental Agreement - {rental.vehicle_number || rental.vehicle_name}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Agreement
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4 bg-[#f9f9f9] p-4 flex justify-center" ref={printRef}>
          <style dangerouslySetInnerHTML={{ __html: pageHeaderFooterStyles }} />

          <div className="page">
            <div className="page-content">
              {/* Header */}
              <div className="page-header">
                <img
                  src="/lovable-uploads/lightvehicle-quotation-header.png"
                  alt="NCG Holdings - Header"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
                <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", marginTop: "10px", color: "#1e40af", textTransform: "uppercase" }}>
                  VEHICLE RENTAL AGREEMENT: RNT-{rental.id.substring(0, 8).toUpperCase()}
                </div>
              </div>

              {/* Agreement Intro */}
              <div style={{ fontSize: "13px", marginBottom: "20px", marginTop: "10px" }}>
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  This Vehicle Rental Agreement is made on <b>{format(new Date(), 'dd/MM/yyyy')}</b>, between <b>NCG Holdings (Private) Limited</b> (The Lessor) and <b>{rental.customers?.customer_name || 'Unknown'}</b> (The Lessee).
                </p>
              </div>

              {/* Details Tables */}
              <table className="data-table">
                <tbody>
                  <tr>
                    <th>Customer (Lessee)</th>
                    <td>{rental.customers?.customer_name || 'Unknown'}</td>
                  </tr>
                  <tr>
                    <th>Vehicle Details</th>
                    <td>{rental.vehicle_name}</td>
                  </tr>
                  <tr>
                    <th>Registration Number</th>
                    <td>{rental.vehicle_number || 'TBA'}</td>
                  </tr>
                  <tr>
                    <th>Commencement Date</th>
                    <td>{format(new Date(rental.start_date), 'dd/MM/yyyy')}</td>
                  </tr>
                  <tr>
                    <th>Expected Return Date</th>
                    <td>{rental.end_date ? format(new Date(rental.end_date), 'dd/MM/yyyy') : 'Open-Ended (Monthly Rolling)'}</td>
                  </tr>
                  <tr>
                    <th>Monthly Rent Amount</th>
                    <td style={{ color: "#1e40af", fontSize: "14px" }}>LKR {rental.monthly_rent_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                </tbody>
              </table>

              {/* Terms & Conditions */}
              <div className="terms-section" style={{ flex: 1 }}>
                <h3>Terms & Conditions</h3>
                <p><b>1. Payment Terms:</b> Rent is strictly payable in advance by the agreed billing date. A late payment penalty of 2% per week may apply for delayed payments.</p>
                <p><b>2. Vehicle Usage & Maintenance:</b> The Lessee agrees to use the vehicle responsibly. Any damage resulting from negligence, violation of traffic laws, or unauthorized modifications will be fully borne by the Lessee.</p>
                <p><b>3. Maintenance & Servicing:</b> The vehicle must be serviced strictly at NCG Automotive Services – PEP (NAS PEP) according to the scheduled intervals. Third-party servicing is strictly prohibited without prior written consent.</p>
                <p><b>4. Insurance:</b> The Lessor provides standard comprehensive insurance. The Lessee is liable for any deductible (excess) in the event of an at-fault accident, or any claims rejected by the insurer due to Lessee negligence.</p>
                <p><b>5. Termination:</b> This agreement may be terminated by either party by providing a 30-day written notice.</p>
                <p><b>6. Return of Vehicle:</b> Upon termination, the vehicle must be returned in the same condition as received, allowing for normal wear and tear.</p>
              </div>

            </div>

            {/* Footer Signatures & Contact */}
            <div className="page-footer">
              <div className="signatures">
                <div className="signature-field">
                  <div className="signature-content"></div>
                  <div className="signature-line">
                    Authorized Signatory (Lessor)<br/>
                    <small>NCG Holdings (Pvt) Ltd</small>
                  </div>
                </div>
                <div className="signature-field">
                  <div className="signature-content"></div>
                  <div className="signature-line">
                    Customer Signature (Lessee)<br/>
                    <small>{rental.customers?.customer_name || 'Customer'}</small>
                  </div>
                </div>
              </div>

              <div className="footer-contact">
                <div>📞 +94 77 123 4567</div>
                <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
                <div>✉️ info_ncgholdings@ncg.lk</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
