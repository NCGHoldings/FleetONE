import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export function ImportExcelButton({ onImportComplete }: { onImportComplete: () => void }) {
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    toast({ title: 'Import Started', description: 'Reading Excel file...' });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Skip the first title row, headers are row 2
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 });
      
      const headers: any = rows[0];
      const dataRows: any = rows.slice(1);

      let importedCount = 0;

      for (const row of dataRows) {
        if (!row || !row[0]) continue; // Skip empty rows

        const quoNo = row[0]; // Quotation Number
        
        // Skip if already exists
        const { data: existing } = await supabase.from('special_hire_quotations').select('id').eq('quotation_no', quoNo).maybeSingle();
        if (existing) continue;

        // Extract columns
        const statusStr = row[1] || 'pending';
        const dateStr = row[3] || '';
        const companyName = row[4] || '';
        const contactedPerson = row[5] || '';
        const hireType = row[6] || '';
        const customerName = row[7] || '';
        const phone = row[8] || '';
        const route = row[9] || '';
        const busType = row[10] || '';
        const numBuses = Number(row[11]) || 1;
        const kmTrip = Number(row[12]) || 0;
        const quoAmt = Number(row[13]) || 0;
        const invNo = row[14] || '';
        const paid = Number(row[15]) || 0;
        const specialReq = row[16] || '';
        
        const busNo = row[18] || '';
        const driver = row[19] || '';
        const assistant = row[20] || '';
        const fromLoc = row[21] || '';
        const toLoc = row[22] || '';
        
        const discount = Number(row[25]) || 0;
        const checkIn = Number(row[27]) || 0;
        const checkOut = Number(row[28]) || 0;
        const actualKm = Number(row[29]) || 0;
        const distCharge = Number(row[30]) || 0;
        const hrsCharge = Number(row[31]) || 0;
        
        const fuelCost = Number(row[32]) || 0;
        const driverWages = Number(row[33]) || 0;
        const asstWages = Number(row[34]) || 0;
        const drvMeal = Number(row[35]) || 0;
        const astMeal = Number(row[36]) || 0;
        const maint = Number(row[37]) || 0;
        const otherExp = Number(row[38]) || 0;
        
        const advance = Number(row[41]) || 0;
        const advanceDate = row[42] || '';
        const balance = Number(row[43]) || 0;
        const balanceDate = row[44] || '';
        const remark = row[45] || '';

        // 1. Insert Quotation
        const { data: quo, error: quoErr } = await supabase.from('special_hire_quotations').insert({
          quotation_no: quoNo,
          company_name: companyName,
          customer_name: customerName,
          customer_phone: String(phone),
          pickup_location: fromLoc,
          drop_location: toLoc,
          number_of_buses: numBuses,
          km_trip: kmTrip,
          gross_revenue: quoAmt,
          total_paid: paid,
          special_request: specialReq,
          assigned_bus_no: busNo,
          assigned_driver_name: driver,
          assigned_conductor_name: assistant,
          status: statusStr.toLowerCase() === 'completed' ? 'confirmed' : 'pending',
          trip_status: statusStr.toLowerCase() === 'completed' ? 'completed' : 'pending',
          is_active_version: true,
          discount_amount_lkr: discount,
          other_expenses: {
            contacted_person: contactedPerson,
            hire_type: hireType,
            fuel_cost_actual: fuelCost,
            driver_wages: driverWages,
            assistant_wages: asstWages,
            driver_meal_allowance: drvMeal,
            assistant_meal_allowance: astMeal,
            maintenance: maint,
            other_permits_highway: otherExp,
            remark: remark,
            wages_total: driverWages + asstWages + drvMeal + astMeal
          }
        }).select().single();

        if (quoErr || !quo) {
          console.error('Error inserting quo', quoErr);
          continue;
        }

        // 2. Insert Invoice if present
        if (invNo) {
          await supabase.from('special_hire_invoices').insert({
            quotation_id: quo.id,
            invoice_no: String(invNo),
            amount: quoAmt,
            invoice_type: 'standard'
          });
        }

        // 3. Insert Adjustments
        if (checkIn || checkOut || actualKm || distCharge || hrsCharge) {
          await supabase.from('special_hire_trip_adjustments').insert({
            quotation_id: quo.id,
            check_in_meter: checkIn,
            check_out_meter: checkOut,
            actual_km: actualKm,
            additional_distance_charge: distCharge,
            additional_hours_charge: hrsCharge
          });
        }

        // 4. Insert Payments
        if (advance > 0) {
          await supabase.from('special_hire_payments').insert({
            quotation_id: quo.id,
            amount: advance,
            payment_type: 'advance',
            status: 'approved',
            payment_method: 'cash'
          });
        }
        if (balance > 0) {
          await supabase.from('special_hire_payments').insert({
            quotation_id: quo.id,
            amount: balance,
            payment_type: 'balance',
            status: 'approved',
            payment_method: 'cash'
          });
        }

        importedCount++;
      }

      toast({ title: 'Import Complete', description: `Successfully imported ${importedCount} records.` });
      onImportComplete();

    } catch (err: any) {
      console.error(err);
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImport} 
      />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => fileInputRef.current?.click()} 
        disabled={importing}
        className="gap-1 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700"
      >
        <Upload className="h-3.5 w-3.5" /> {importing ? 'Importing...' : 'Import Excel'}
      </Button>
    </>
  );
}
