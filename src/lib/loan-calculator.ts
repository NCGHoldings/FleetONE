// Loan calculation utilities

export interface LoanCalculation {
  monthlyInstallment: number;
  totalInterest: number;
  totalAmount: number;
  endDate: Date;
}

export interface AmortizationEntry {
  paymentNumber: number;
  paymentDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalInstallment: number;
  balanceRemaining: number;
}

/**
 * Calculate EMI using the formula: EMI = [P × R × (1+R)^N] / [(1+R)^N-1]
 * P = Principal loan amount
 * R = Monthly interest rate (annual rate / 12 / 100)
 * N = Tenure in months
 */
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || annualInterestRate <= 0 || tenureMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  return Math.round(emi * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate complete loan details
 */
export function calculateLoanDetails(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number,
  startDate: Date
): LoanCalculation {
  const monthlyInstallment = calculateEMI(principal, annualInterestRate, tenureMonths);
  const totalAmount = monthlyInstallment * tenureMonths;
  const totalInterest = totalAmount - principal;

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + tenureMonths);

  return {
    monthlyInstallment,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    endDate,
  };
}

/**
 * Generate complete amortization schedule
 */
export function generateAmortizationSchedule(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number,
  startDate: Date
): AmortizationEntry[] {
  const monthlyInstallment = calculateEMI(principal, annualInterestRate, tenureMonths);
  const monthlyRate = annualInterestRate / 12 / 100;
  
  const schedule: AmortizationEntry[] = [];
  let balance = principal;

  for (let i = 1; i <= tenureMonths; i++) {
    const interestAmount = balance * monthlyRate;
    const principalAmount = monthlyInstallment - interestAmount;
    balance = balance - principalAmount;

    // Adjust last payment to account for rounding
    const isLastPayment = i === tenureMonths;
    const adjustedPrincipal = isLastPayment ? balance + principalAmount : principalAmount;
    const adjustedBalance = isLastPayment ? 0 : balance;

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    schedule.push({
      paymentNumber: i,
      paymentDate,
      principalAmount: Math.round(adjustedPrincipal * 100) / 100,
      interestAmount: Math.round(interestAmount * 100) / 100,
      totalInstallment: monthlyInstallment,
      balanceRemaining: Math.round(adjustedBalance * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate loan progress percentage
 */
export function calculateLoanProgress(totalPaid: number, loanAmount: number): number {
  if (loanAmount <= 0) return 0;
  return Math.min(100, Math.round((totalPaid / loanAmount) * 100));
}
