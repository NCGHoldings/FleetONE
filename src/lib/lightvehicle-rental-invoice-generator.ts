import { format } from 'date-fns';

export interface LightVehicleRentalInvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  customerCode: string;
  customerName: string;
  allocatedCustomerName: string;
  sbu: string;
  userName: string;
  address: string;
  mileage: string;
  refNo: string;
  rentalPeriod: string;
  quoteNo: string;
  vehicleType: string;
  vehicleNo: string;

  rentAmount: number;
  fuelExpenses: number;
  gpsRental: number;
  discount: number;

  originalQuoteAmount: number;
  subTotal: number;
  priceAfterDiscount: number;
  totalPaid: number;
  balanceDue: number;
}

export function generateLightVehicleRentalInvoiceHTML(data: LightVehicleRentalInvoiceData): string {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return `
    <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #000; background: #fff;">
      
      <!-- Header Section -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div>
          <h2 style="color: #0056b3; margin: 0 0 5px 0; font-size: 20px; font-weight: bold;">NCG Holdings (Private) Limited.</h2>
          <p style="margin: 0; font-size: 12px; color: #0056b3; font-weight: bold;">157 Y, Kebellovita, Weniwelkola, Polgasovita</p>
        </div>
        <div>
          <img src="/lovable-uploads/ncg-holdings-logo.png" alt="NCG Holdings" style="max-height: 50px;" />
        </div>
      </div>

      <!-- INVOICE Title -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: bold; text-decoration: underline;">INVOICE</h3>
      </div>

      <!-- Meta Data Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold; width: 25%;">Customer Code</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px; width: 25%;">${data.customerCode}</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold; width: 25%;">Invoice No</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px; width: 25%;">${data.invoiceNo}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">Customer Name</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.customerName}</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">Invoice Date</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.invoiceDate}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">Allocated Cu. Name</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.allocatedCustomerName}</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">Ref No</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.refNo}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">SBU</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.sbu}</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">Rental Period</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.rentalPeriod}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">User</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.userName}</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">Quote No</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.quoteNo}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">Address</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.address}</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">Vehicle Type</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.vehicleType}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">Mileage</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;">${data.mileage}</td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;"></td>
          <td style="border: 1px solid #ccc; padding: 4px 8px;"></td>
        </tr>
      </table>

      <!-- Item Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
        <thead>
          <tr style="background-color: #e6f0fa;">
            <th style="border: 1px solid #ccc; padding: 6px 8px; text-align: left;">Description</th>
            <th style="border: 1px solid #ccc; padding: 6px 8px; text-align: left;">Item Detail</th>
            <th style="border: 1px solid #ccc; padding: 6px 8px; text-align: center;">Vehicle No</th>
            <th style="border: 1px solid #ccc; padding: 6px 8px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; height: 50px;">Rent</td>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top;">Monthly Rental for the ${data.vehicleType}</td>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: center;">${data.vehicleNo}</td>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: right;">${formatAmount(data.rentAmount)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; height: 50px;">Fuel Expenses<br>(Reimbursement)</td>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top;"></td>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: center;"></td>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: right;">${data.fuelExpenses > 0 ? formatAmount(data.fuelExpenses) : ''}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; height: 50px;">GPS Rental</td>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top;"></td>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: center;"></td>
            <td style="border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: right;">${data.gpsRental > 0 ? formatAmount(data.gpsRental) : ''}</td>
          </tr>
        </tbody>
      </table>

      <!-- Summary Table (Right Aligned) -->
      <table style="width: 50%; border-collapse: collapse; margin-left: auto; margin-bottom: 30px; font-size: 11px;">
        <tr>
          <td style="border: 1px solid #ccc; padding: 6px 8px; font-weight: bold;">Original Quote Amount</td>
          <td style="border: 1px solid #ccc; padding: 6px 8px; text-align: right;">${formatAmount(data.originalQuoteAmount)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 6px 8px; font-weight: bold;">Sub-Total</td>
          <td style="border: 1px solid #ccc; padding: 6px 8px; text-align: right;">${formatAmount(data.subTotal)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 6px 8px; font-weight: bold;">Discount</td>
          <td style="border: 1px solid #ccc; padding: 6px 8px; text-align: right;">${formatAmount(data.discount)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 6px 8px; font-weight: bold;">Price After Discount</td>
          <td style="border: 1px solid #ccc; padding: 6px 8px; text-align: right;">${formatAmount(data.priceAfterDiscount)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 6px 8px; font-weight: bold;">Total Paid</td>
          <td style="border: 1px solid #ccc; padding: 6px 8px; text-align: right;">${formatAmount(data.totalPaid)}</td>
        </tr>
        <tr style="background-color: #d4edda;">
          <td style="border: 1px solid #ccc; padding: 6px 8px; font-weight: bold;">Balance Due</td>
          <td style="border: 1px solid #ccc; padding: 6px 8px; text-align: right; font-weight: bold;">${formatAmount(data.balanceDue)}</td>
        </tr>
      </table>

      <!-- Payment Info -->
      <div style="font-size: 11px; margin-bottom: 20px;">
        <p style="font-weight: bold; margin: 0 0 5px 0;">Payment Info</p>
        <p style="margin: 0 0 3px 0;">Account No: 1000516089</p>
        <p style="margin: 0 0 3px 0;">Account Name: NCG Holdings (Pvt) Ltd</p>
        <p style="margin: 0 0 3px 0;">Bank & Branch: Sampath Bank - Nugegoda</p>
      </div>

      <!-- Terms & Conditions -->
      <div style="font-size: 11px;">
        <p style="font-weight: bold; margin: 0 0 5px 0;">Terms & Conditions:</p>
        <p style="margin: 0 0 3px 0;">1. Cheques are to be drawn in favour of NCG Holdings (Pvt) Ltd and A/C payee only.</p>
        <p style="margin: 0 0 3px 0;">2. Payment due within 07 days of invoice date.</p>
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #666;">
        <div style="border-top: 2px solid #00b894; margin-bottom: 5px;"></div>
        <p style="margin: 0;">Page 1 of 1</p>
      </div>
    </div>
  `;
}
