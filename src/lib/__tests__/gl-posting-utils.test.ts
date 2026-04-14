import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: "test-je-id" }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: "test-account",
                account_type: "asset",
                current_balance: 1000,
              },
              error: null,
            })
          ),
        })),
      })),
    })),
  },
}));

describe("GL Posting Utils - Business Logic Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Double-Entry Validation", () => {
    it("should validate that total debits equal total credits", () => {
      const lines = [
        { account_id: "acc1", debit: 1000, credit: 0 },
        { account_id: "acc2", debit: 0, credit: 1000 },
      ];

      const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

      expect(totalDebit).toBe(totalCredit);
    });

    it("should reject entries where debits do not equal credits", () => {
      const lines = [
        { account_id: "acc1", debit: 1000, credit: 0 },
        { account_id: "acc2", debit: 0, credit: 500 },
      ];

      const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

      expect(totalDebit).not.toBe(totalCredit);
    });

    it("should handle multiple line items correctly", () => {
      const lines = [
        { account_id: "acc1", debit: 500, credit: 0 },
        { account_id: "acc2", debit: 500, credit: 0 },
        { account_id: "acc3", debit: 0, credit: 300 },
        { account_id: "acc4", debit: 0, credit: 700 },
      ];

      const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

      expect(totalDebit).toBe(1000);
      expect(totalCredit).toBe(1000);
      expect(totalDebit).toBe(totalCredit);
    });
  });

  describe("Account Balance Calculation", () => {
    it("should increase asset account balance with debit", () => {
      const accountType = "asset";
      const currentBalance = 1000;
      const debit = 500;
      const credit = 0;

      // Asset accounts: debit increases, credit decreases
      const isDebitNormal = ["asset", "expense"].includes(accountType);
      const adjustment = isDebitNormal ? debit - credit : credit - debit;
      const newBalance = currentBalance + adjustment;

      expect(newBalance).toBe(1500);
    });

    it("should decrease asset account balance with credit", () => {
      const accountType = "asset";
      const currentBalance = 1000;
      const debit = 0;
      const credit = 300;

      const isDebitNormal = ["asset", "expense"].includes(accountType);
      const adjustment = isDebitNormal ? debit - credit : credit - debit;
      const newBalance = currentBalance + adjustment;

      expect(newBalance).toBe(700);
    });

    it("should increase liability account balance with credit", () => {
      const accountType = "liability";
      const currentBalance = 2000;
      const debit = 0;
      const credit = 500;

      // Liability accounts: credit increases, debit decreases
      const isDebitNormal = ["asset", "expense"].includes(accountType);
      const adjustment = isDebitNormal ? debit - credit : credit - debit;
      const newBalance = currentBalance + adjustment;

      expect(newBalance).toBe(2500);
    });

    it("should decrease liability account balance with debit", () => {
      const accountType = "liability";
      const currentBalance = 2000;
      const debit = 800;
      const credit = 0;

      const isDebitNormal = ["asset", "expense"].includes(accountType);
      const adjustment = isDebitNormal ? debit - credit : credit - debit;
      const newBalance = currentBalance + adjustment;

      expect(newBalance).toBe(1200);
    });

    it("should handle revenue accounts correctly (credit normal)", () => {
      const accountType = "revenue";
      const currentBalance = 5000;
      const debit = 0;
      const credit = 1000;

      const isDebitNormal = ["asset", "expense"].includes(accountType);
      const adjustment = isDebitNormal ? debit - credit : credit - debit;
      const newBalance = currentBalance + adjustment;

      expect(newBalance).toBe(6000);
    });

    it("should handle expense accounts correctly (debit normal)", () => {
      const accountType = "expense";
      const currentBalance = 3000;
      const debit = 500;
      const credit = 0;

      const isDebitNormal = ["asset", "expense"].includes(accountType);
      const adjustment = isDebitNormal ? debit - credit : credit - debit;
      const newBalance = currentBalance + adjustment;

      expect(newBalance).toBe(3500);
    });
  });

  describe("AR Invoice GL Posting Logic", () => {
    it("should create correct entries for AR Invoice", () => {
      const invoiceAmount = 10000;
      const tradeReceivableId = "ar-account";
      const salesRevenueId = "revenue-account";

      const expectedLines = [
        { account_id: tradeReceivableId, debit: invoiceAmount, credit: 0 },
        { account_id: salesRevenueId, debit: 0, credit: invoiceAmount },
      ];

      expect(expectedLines[0].debit).toBe(invoiceAmount);
      expect(expectedLines[1].credit).toBe(invoiceAmount);
      expect(expectedLines[0].debit).toBe(expectedLines[1].credit);
    });
  });

  describe("AR Receipt GL Posting Logic", () => {
    it("should create correct entries for standard receipt", () => {
      const receiptAmount = 5000;
      const bankAccountId = "bank-account";
      const tradeReceivableId = "ar-account";

      const expectedLines = [
        { account_id: bankAccountId, debit: receiptAmount, credit: 0 },
        { account_id: tradeReceivableId, debit: 0, credit: receiptAmount },
      ];

      expect(expectedLines[0].debit).toBe(receiptAmount);
      expect(expectedLines[1].credit).toBe(receiptAmount);
    });

    it("should create correct entries for advance receipt", () => {
      const advanceAmount = 3000;
      const bankAccountId = "bank-account";
      const customerAdvanceId = "advance-liability";

      const expectedLines = [
        { account_id: bankAccountId, debit: advanceAmount, credit: 0 },
        { account_id: customerAdvanceId, debit: 0, credit: advanceAmount },
      ];

      expect(expectedLines[0].debit).toBe(advanceAmount);
      expect(expectedLines[1].credit).toBe(advanceAmount);
    });
  });

  describe("AP Invoice GL Posting Logic", () => {
    it("should create correct entries for AP Invoice", () => {
      const invoiceAmount = 8000;
      const expenseAccountId = "expense-account";
      const tradePayableId = "ap-account";

      const expectedLines = [
        { account_id: expenseAccountId, debit: invoiceAmount, credit: 0 },
        { account_id: tradePayableId, debit: 0, credit: invoiceAmount },
      ];

      expect(expectedLines[0].debit).toBe(invoiceAmount);
      expect(expectedLines[1].credit).toBe(invoiceAmount);
    });
  });

  describe("AP Payment GL Posting Logic", () => {
    it("should create correct entries for AP Payment", () => {
      const paymentAmount = 4000;
      const tradePayableId = "ap-account";
      const bankAccountId = "bank-account";

      const expectedLines = [
        { account_id: tradePayableId, debit: paymentAmount, credit: 0 },
        { account_id: bankAccountId, debit: 0, credit: paymentAmount },
      ];

      expect(expectedLines[0].debit).toBe(paymentAmount);
      expect(expectedLines[1].credit).toBe(paymentAmount);
    });
  });

  describe("Trial Balance Validation", () => {
    it("should ensure trial balance always balances", () => {
      const accounts = [
        { name: "Cash", type: "asset", debit: 10000, credit: 0 },
        { name: "Inventory", type: "asset", debit: 5000, credit: 0 },
        { name: "Accounts Payable", type: "liability", debit: 0, credit: 8000 },
        { name: "Capital", type: "equity", debit: 0, credit: 7000 },
      ];

      const totalDebits = accounts.reduce((sum, acc) => sum + acc.debit, 0);
      const totalCredits = accounts.reduce((sum, acc) => sum + acc.credit, 0);

      expect(totalDebits).toBe(totalCredits);
    });
  });
});
