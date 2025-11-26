import { Page, Locator, expect } from '@playwright/test';

export class InquiryHubPage {
  readonly page: Page;
  
  // Main page elements
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly addManualInquiryButton: Locator;
  
  // Stats cards
  readonly totalInquiriesCard: Locator;
  readonly newInquiriesCard: Locator;
  readonly pendingFollowupsCard: Locator;
  readonly conversionRateCard: Locator;
  
  // Tabs
  readonly allInquiriesTab: Locator;
  readonly yutongTab: Locator;
  readonly sinotruckTab: Locator;
  readonly manualTab: Locator;
  readonly settingsTab: Locator;
  
  // Table elements
  readonly inquiryTable: Locator;
  readonly searchInput: Locator;
  readonly tableRows: Locator;
  
  // Manual inquiry form modal
  readonly modalTitle: Locator;
  readonly customerNameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly companyInput: Locator;
  readonly addressInput: Locator;
  readonly productTypeSelect: Locator;
  readonly sourceSelect: Locator;
  readonly interestedModelSelect: Locator;
  readonly budgetInput: Locator;
  readonly quantityInput: Locator;
  readonly notesInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  
  // Inquiry details modal
  readonly detailsModal: Locator;
  readonly detailsCustomerName: Locator;
  readonly detailsPhone: Locator;
  readonly detailsEmail: Locator;
  readonly detailsProductType: Locator;
  readonly assignButton: Locator;
  readonly addFollowUpButton: Locator;
  readonly convertToQuotationButton: Locator;
  
  // Assignment modal
  readonly assignmentModal: Locator;
  readonly assigneeSelect: Locator;
  readonly prioritySelect: Locator;
  readonly assignmentNotesInput: Locator;
  readonly confirmAssignButton: Locator;
  
  // Follow-up form modal
  readonly followUpModal: Locator;
  readonly followUpTypeSelect: Locator;
  readonly followUpNotesInput: Locator;
  readonly nextFollowUpDateInput: Locator;
  readonly submitFollowUpButton: Locator;
  
  // Convert to quotation modal
  readonly convertModal: Locator;
  readonly convertConfirmButton: Locator;
  
  // Settings tab
  readonly generateApiKeyButton: Locator;
  readonly regenerateApiKeyButton: Locator;
  readonly apiKeyDisplay: Locator;
  readonly webhookUrlDisplay: Locator;
  readonly copyWebhookButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Main page
    this.pageTitle = page.getByRole('heading', { name: 'Vehicle Inquiry Hub' });
    this.pageSubtitle = page.getByText('Manage customer inquiries for Yutong and Sinotruck products');
    this.addManualInquiryButton = page.getByRole('button', { name: /Add Manual Inquiry/i });
    
    // Stats cards
    this.totalInquiriesCard = page.getByText('Total Inquiries').locator('..');
    this.newInquiriesCard = page.getByText('New Inquiries').locator('..');
    this.pendingFollowupsCard = page.getByText('Pending Follow-ups').locator('..');
    this.conversionRateCard = page.getByText('Conversion Rate').locator('..');
    
    // Tabs
    this.allInquiriesTab = page.getByRole('tab', { name: 'All Inquiries' });
    this.yutongTab = page.getByRole('tab', { name: 'Yutong' });
    this.sinotruckTab = page.getByRole('tab', { name: 'Sinotruck' });
    this.manualTab = page.getByRole('tab', { name: 'Phone/Walk-in' });
    this.settingsTab = page.getByRole('tab', { name: 'Settings' });
    
    // Table
    this.inquiryTable = page.getByRole('table');
    this.searchInput = page.getByPlaceholder(/Search by customer name/i);
    this.tableRows = page.getByRole('row');
    
    // Manual inquiry form
    this.modalTitle = page.getByRole('heading', { name: 'Add Manual Inquiry' });
    this.customerNameInput = page.getByLabel(/Customer Name/i);
    this.phoneInput = page.getByLabel(/Phone/i);
    this.emailInput = page.getByLabel(/Email/i);
    this.companyInput = page.getByLabel(/Company/i);
    this.addressInput = page.getByLabel(/Address/i);
    this.productTypeSelect = page.locator('[name="productType"]');
    this.sourceSelect = page.locator('[name="source"]');
    this.interestedModelSelect = page.locator('[name="interestedModel"]');
    this.budgetInput = page.getByLabel(/Budget/i);
    this.quantityInput = page.getByLabel(/Quantity/i);
    this.notesInput = page.getByLabel(/Notes/i);
    this.submitButton = page.getByRole('button', { name: /Create Inquiry/i });
    this.cancelButton = page.getByRole('button', { name: /Cancel/i });
    
    // Details modal
    this.detailsModal = page.getByRole('dialog').filter({ hasText: /Inquiry Details/i });
    this.detailsCustomerName = this.detailsModal.getByText(/Customer Name/i).locator('..');
    this.detailsPhone = this.detailsModal.getByText(/Phone/i).locator('..');
    this.detailsEmail = this.detailsModal.getByText(/Email/i).locator('..');
    this.detailsProductType = this.detailsModal.getByText(/Product Type/i).locator('..');
    this.assignButton = this.detailsModal.getByRole('button', { name: /Assign/i });
    this.addFollowUpButton = this.detailsModal.getByRole('button', { name: /Add Follow-up/i });
    this.convertToQuotationButton = this.detailsModal.getByRole('button', { name: /Convert to Quotation/i });
    
    // Assignment modal
    this.assignmentModal = page.getByRole('dialog').filter({ hasText: /Assign Inquiry/i });
    this.assigneeSelect = this.assignmentModal.locator('select').first();
    this.prioritySelect = this.assignmentModal.locator('select').nth(1);
    this.assignmentNotesInput = this.assignmentModal.getByLabel(/Notes/i);
    this.confirmAssignButton = this.assignmentModal.getByRole('button', { name: /Assign/i });
    
    // Follow-up modal
    this.followUpModal = page.getByRole('dialog').filter({ hasText: /Add Follow-up/i });
    this.followUpTypeSelect = this.followUpModal.locator('select').first();
    this.followUpNotesInput = this.followUpModal.getByLabel(/Notes/i);
    this.nextFollowUpDateInput = this.followUpModal.getByLabel(/Next Follow-up Date/i);
    this.submitFollowUpButton = this.followUpModal.getByRole('button', { name: /Add Follow-up/i });
    
    // Convert modal
    this.convertModal = page.getByRole('dialog').filter({ hasText: /Convert to Quotation/i });
    this.convertConfirmButton = this.convertModal.getByRole('button', { name: /Convert to Quotation/i });
    
    // Settings
    this.generateApiKeyButton = page.getByRole('button', { name: /Generate$/i });
    this.regenerateApiKeyButton = page.getByRole('button', { name: /Regenerate/i });
    this.apiKeyDisplay = page.locator('input[readonly]').first();
    this.webhookUrlDisplay = page.getByText(/https:\/\/.*\/receive-vehicle-inquiry/i);
    this.copyWebhookButton = page.getByRole('button', { name: /Copy/i });
  }

  async goto() {
    await this.page.goto('/vehicle-inquiries');
  }

  async fillManualInquiryForm(data: {
    customerName: string;
    phone: string;
    email?: string;
    company?: string;
    address?: string;
    productType: string;
    source: string;
    interestedModel?: string;
    budget?: number;
    quantity?: number;
    notes?: string;
  }) {
    await this.customerNameInput.fill(data.customerName);
    await this.phoneInput.fill(data.phone);
    
    if (data.email) await this.emailInput.fill(data.email);
    if (data.company) await this.companyInput.fill(data.company);
    if (data.address) await this.addressInput.fill(data.address);
    
    await this.productTypeSelect.selectOption(data.productType);
    await this.sourceSelect.selectOption(data.source);
    
    if (data.interestedModel) await this.interestedModelSelect.selectOption(data.interestedModel);
    if (data.budget) await this.budgetInput.fill(data.budget.toString());
    if (data.quantity) await this.quantityInput.fill(data.quantity.toString());
    if (data.notes) await this.notesInput.fill(data.notes);
  }

  async submitInquiry() {
    await this.submitButton.click();
  }

  async searchInquiry(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
  }

  async clickViewInquiry(inquiryNumber: string) {
    const row = this.page.getByRole('row').filter({ hasText: inquiryNumber });
    await row.getByRole('button', { name: /View/i }).click();
  }

  async changeStatus(status: string) {
    const statusButton = this.detailsModal.getByRole('button', { name: new RegExp(status, 'i') });
    await statusButton.click();
  }

  async addFollowUp(type: string, notes: string, nextDate?: string) {
    await this.addFollowUpButton.click();
    await this.followUpTypeSelect.selectOption(type);
    await this.followUpNotesInput.fill(notes);
    if (nextDate) await this.nextFollowUpDateInput.fill(nextDate);
    await this.submitFollowUpButton.click();
  }

  async expectStatsCardsVisible() {
    await expect(this.totalInquiriesCard).toBeVisible();
    await expect(this.newInquiriesCard).toBeVisible();
    await expect(this.pendingFollowupsCard).toBeVisible();
    await expect(this.conversionRateCard).toBeVisible();
  }

  async expectTabsVisible() {
    await expect(this.allInquiriesTab).toBeVisible();
    await expect(this.yutongTab).toBeVisible();
    await expect(this.sinotruckTab).toBeVisible();
    await expect(this.manualTab).toBeVisible();
    await expect(this.settingsTab).toBeVisible();
  }
}
