// Accounting Utilities - LKR Currency formatting and common helpers

export const formatLKR = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "LKR 0.00";
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace("LKR", "LKR ");
};

export const formatLKRShort = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "Rs 0.00";
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace("LKR", "Rs");
};

export const formatNumber = (value: number | null | undefined, decimals = 2): string => {
  if (value === null || value === undefined) return "0.00";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Status badge variant mappings
export const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    // Journal Entry statuses
    draft: "secondary",
    pending: "outline",
    approved: "default",
    posted: "default",
    rejected: "destructive",
    void: "destructive",
    
    // AR/AP statuses
    unpaid: "destructive",
    partial: "outline",
    paid: "default",
    overdue: "destructive",
    
    // Asset statuses
    active: "default",
    disposed: "secondary",
    fully_depreciated: "outline",
    
    // Period statuses
    open: "default",
    closed: "secondary",
    locked: "destructive",
    
    // Approval statuses
    pending_approval: "outline",
    approved_level_1: "secondary",
    approved_level_2: "default",
  };
  return variants[status] || "default";
};

// Account type colors for charts and badges
export const getAccountTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    asset: "hsl(var(--primary))",
    liability: "hsl(var(--destructive))",
    equity: "hsl(var(--secondary))",
    revenue: "hsl(142, 76%, 36%)",
    expense: "hsl(25, 95%, 53%)",
  };
  return colors[type] || "hsl(var(--muted))";
};

// Calculate days overdue
export const getDaysOverdue = (dueDate: string): number => {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

// Get ageing bucket
export const getAgeingBucket = (dueDate: string): string => {
  const days = getDaysOverdue(dueDate);
  if (days === 0) return "Current";
  if (days <= 30) return "1-30 Days";
  if (days <= 60) return "31-60 Days";
  if (days <= 90) return "61-90 Days";
  return "90+ Days";
};

// Validate journal entry balance
export const validateJournalBalance = (
  lines: Array<{ debit_amount?: number; credit_amount?: number }>
): { isValid: boolean; totalDebit: number; totalCredit: number; difference: number } => {
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  
  return {
    isValid: difference < 0.01, // Allow for floating point rounding
    totalDebit,
    totalCredit,
    difference,
  };
};

// Generate next document number
export const generateDocumentNumber = (prefix: string, lastNumber: number): string => {
  const year = new Date().getFullYear();
  const nextNumber = (lastNumber + 1).toString().padStart(6, "0");
  return `${prefix}-${year}-${nextNumber}`;
};

// Calculate depreciation
export const calculateDepreciation = (
  cost: number,
  salvageValue: number,
  usefulLifeYears: number,
  method: "straight_line" | "declining_balance" | "sum_of_years",
  year: number
): number => {
  const depreciableAmount = cost - salvageValue;
  
  switch (method) {
    case "straight_line":
      return depreciableAmount / usefulLifeYears;
    
    case "declining_balance": {
      const rate = 2 / usefulLifeYears; // Double declining
      let remainingValue = cost;
      for (let i = 1; i < year; i++) {
        remainingValue -= remainingValue * rate;
      }
      const depreciation = remainingValue * rate;
      return Math.max(0, Math.min(depreciation, remainingValue - salvageValue));
    }
    
    case "sum_of_years": {
      const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
      const yearsRemaining = usefulLifeYears - year + 1;
      return (yearsRemaining / sumOfYears) * depreciableAmount;
    }
    
    default:
      return depreciableAmount / usefulLifeYears;
  }
};

// Tax calculations
export const calculateVAT = (amount: number, rate = 15): { netAmount: number; vatAmount: number; grossAmount: number } => {
  const vatAmount = amount * (rate / 100);
  return {
    netAmount: amount,
    vatAmount,
    grossAmount: amount + vatAmount,
  };
};

export const calculateWHT = (amount: number, rate = 5): { grossAmount: number; whtAmount: number; netAmount: number } => {
  const whtAmount = amount * (rate / 100);
  return {
    grossAmount: amount,
    whtAmount,
    netAmount: amount - whtAmount,
  };
};

// Period helpers
export const getCurrentFinancialPeriod = (): { year: number; month: number; quarter: number } => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = month >= 4 ? now.getFullYear() : now.getFullYear() - 1; // Sri Lanka FY April-March
  const quarter = Math.ceil(((month - 3 + 12) % 12 || 12) / 3);
  
  return { year, month, quarter };
};

// Parse account code hierarchy
export const parseAccountCode = (code: string): { level1: string; level2: string; level3: string; level4: string; level5: string } => {
  const parts = code.split("-");
  return {
    level1: parts[0] || "",
    level2: parts[1] || "",
    level3: parts[2] || "",
    level4: parts[3] || "",
    level5: parts[4] || "",
  };
};

// Determine if account is a control account
export const isControlAccount = (accountCode: string): boolean => {
  const controlPrefixes = ["1200", "2100", "2200"]; // AR, AP, Inventory
  return controlPrefixes.some(prefix => accountCode.startsWith(prefix));
};
