import { test, expect } from '@playwright/test';
import { InquiryHubPage } from '../pages/inquiry-hub.page';
import { testCustomers, testInquiries } from '../fixtures/test-data';

test.describe('Vehicle Inquiry Hub - Complete Test Suite', () => {
  let inquiryHub: InquiryHubPage;

  test.beforeEach(async ({ page }) => {
    inquiryHub = new InquiryHubPage(page);
    await inquiryHub.goto();
  });

  // ============================================
  // Category 1: Page Navigation & Display
  // ============================================

  test('Scenario 1: Navigate to Vehicle Inquiry Hub', async () => {
    await expect(inquiryHub.pageTitle).toBeVisible();
    await expect(inquiryHub.pageSubtitle).toBeVisible();
    await expect(inquiryHub.addManualInquiryButton).toBeVisible();
  });

  test('Scenario 2: Display Stats Cards', async () => {
    await inquiryHub.expectStatsCardsVisible();
    
    // Check for specific labels
    await expect(inquiryHub.page.getByText('Last 30 days')).toBeVisible();
    await expect(inquiryHub.page.getByText('Unassigned')).toBeVisible();
    await expect(inquiryHub.page.getByText('Due today or overdue')).toBeVisible();
    
    // Check conversion rate has percentage format
    const conversionText = await inquiryHub.conversionRateCard.textContent();
    expect(conversionText).toMatch(/%/);
  });

  test('Scenario 3: Tab Navigation Works', async () => {
    await inquiryHub.expectTabsVisible();
    
    // Click each tab and verify it becomes active
    await inquiryHub.yutongTab.click();
    await expect(inquiryHub.yutongTab).toHaveAttribute('data-state', 'active');
    
    await inquiryHub.sinotruckTab.click();
    await expect(inquiryHub.sinotruckTab).toHaveAttribute('data-state', 'active');
    
    await inquiryHub.manualTab.click();
    await expect(inquiryHub.manualTab).toHaveAttribute('data-state', 'active');
    
    await inquiryHub.settingsTab.click();
    await expect(inquiryHub.settingsTab).toHaveAttribute('data-state', 'active');
    
    await inquiryHub.allInquiriesTab.click();
    await expect(inquiryHub.allInquiriesTab).toHaveAttribute('data-state', 'active');
  });

  test('Scenario 4: URL Updates on Tab Switch', async ({ page }) => {
    await inquiryHub.yutongTab.click();
    await expect(page).toHaveURL(/tab=yutong/);
    
    await inquiryHub.settingsTab.click();
    await expect(page).toHaveURL(/tab=settings/);
    
    // Direct URL access
    await page.goto('/vehicle-inquiries?tab=sinotruck');
    await expect(inquiryHub.sinotruckTab).toHaveAttribute('data-state', 'active');
  });

  // ============================================
  // Category 2: Manual Inquiry Form
  // ============================================

  test('Scenario 5: Open Manual Inquiry Form Modal', async () => {
    await inquiryHub.addManualInquiryButton.click();
    await expect(inquiryHub.modalTitle).toBeVisible();
    await expect(inquiryHub.customerNameInput).toBeVisible();
    await expect(inquiryHub.phoneInput).toBeVisible();
    
    await inquiryHub.cancelButton.click();
    await expect(inquiryHub.modalTitle).not.toBeVisible();
  });

  test('Scenario 6: Submit Valid Manual Inquiry', async ({ page }) => {
    await inquiryHub.addManualInquiryButton.click();
    
    await inquiryHub.fillManualInquiryForm({
      customerName: testCustomers.customer1.name,
      phone: testCustomers.customer1.phone,
      email: testCustomers.customer1.email,
      company: testCustomers.customer1.company,
      productType: 'yutong',
      source: 'phone',
      notes: testInquiries.yutong.notes,
    });
    
    await inquiryHub.submitInquiry();
    
    // Wait for success toast
    await expect(page.getByText(/successfully created/i)).toBeVisible({ timeout: 5000 });
    
    // Modal should close
    await expect(inquiryHub.modalTitle).not.toBeVisible();
    
    // New inquiry should appear in list
    await expect(page.getByText(testCustomers.customer1.name)).toBeVisible();
  });

  test('Scenario 7: Validate Required Fields', async ({ page }) => {
    await inquiryHub.addManualInquiryButton.click();
    
    // Try to submit without filling required fields
    await inquiryHub.submitButton.click();
    
    // Should show error toast
    await expect(page.getByText(/required field/i)).toBeVisible({ timeout: 3000 });
    
    // Modal should remain open
    await expect(inquiryHub.modalTitle).toBeVisible();
  });

  test('Scenario 8: Dynamic Model Loading Based on Product Type', async () => {
    await inquiryHub.addManualInquiryButton.click();
    
    // Select Yutong
    await inquiryHub.productTypeSelect.selectOption('yutong');
    await inquiryHub.interestedModelSelect.click();
    const yutongOptions = await inquiryHub.interestedModelSelect.locator('option').allTextContents();
    expect(yutongOptions.length).toBeGreaterThan(0);
    
    // Switch to Sinotruck
    await inquiryHub.productTypeSelect.selectOption('sinotruck');
    await inquiryHub.interestedModelSelect.click();
    const sinotruckOptions = await inquiryHub.interestedModelSelect.locator('option').allTextContents();
    expect(sinotruckOptions.length).toBeGreaterThan(0);
  });

  // ============================================
  // Category 3: Inquiry List
  // ============================================

  test('Scenario 9: Display Inquiries in Table Format', async ({ page }) => {
    await expect(inquiryHub.inquiryTable).toBeVisible();
    
    // Check for table headers
    await expect(page.getByText('Inquiry #')).toBeVisible();
    await expect(page.getByText('Customer')).toBeVisible();
    await expect(page.getByText('Product')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByText('Actions')).toBeVisible();
  });

  test('Scenario 10: Search by Customer Name', async ({ page }) => {
    // First create an inquiry to search for
    await inquiryHub.addManualInquiryButton.click();
    await inquiryHub.fillManualInquiryForm({
      customerName: 'SearchTest Customer',
      phone: '+94771111111',
      productType: 'yutong',
      source: 'phone',
    });
    await inquiryHub.submitInquiry();
    await page.waitForTimeout(1000);
    
    // Search for the customer
    await inquiryHub.searchInquiry('SearchTest');
    
    // Should show matching customer
    await expect(page.getByText('SearchTest Customer')).toBeVisible();
    
    // Clear search
    await inquiryHub.searchInput.clear();
  });

  test('Scenario 11: Search by Phone Number', async ({ page }) => {
    await inquiryHub.searchInquiry('+94771234567');
    
    // If any inquiries with this phone exist, they should be visible
    const rows = await inquiryHub.tableRows.count();
    expect(rows).toBeGreaterThanOrEqual(1);
  });

  test('Scenario 12: Filter by Product Type (Tab Filter)', async ({ page }) => {
    // Click Yutong tab
    await inquiryHub.yutongTab.click();
    await page.waitForTimeout(500);
    
    // Check that only Yutong inquiries are shown (if any exist)
    const yutongRows = await inquiryHub.tableRows.count();
    
    // Click Sinotruck tab
    await inquiryHub.sinotruckTab.click();
    await page.waitForTimeout(500);
    
    // Click All tab
    await inquiryHub.allInquiriesTab.click();
    await page.waitForTimeout(500);
    
    const allRows = await inquiryHub.tableRows.count();
    expect(allRows).toBeGreaterThanOrEqual(yutongRows);
  });

  // ============================================
  // Category 4: Inquiry Details Modal
  // ============================================

  test('Scenario 13: Open Inquiry Details Modal', async ({ page }) => {
    // Create an inquiry first
    await inquiryHub.addManualInquiryButton.click();
    await inquiryHub.fillManualInquiryForm({
      customerName: testCustomers.customer2.name,
      phone: testCustomers.customer2.phone,
      productType: 'yutong',
      source: 'website',
    });
    await inquiryHub.submitInquiry();
    await page.waitForTimeout(1000);
    
    // Click view button on first inquiry
    const viewButton = page.getByRole('button', { name: /View/i }).first();
    await viewButton.click();
    
    await expect(inquiryHub.detailsModal).toBeVisible();
    await expect(page.getByText(/Customer Information/i)).toBeVisible();
    await expect(page.getByText(/Inquiry Details/i)).toBeVisible();
    await expect(page.getByText(/Follow-up History/i)).toBeVisible();
  });

  test('Scenario 14: View Customer Information Section', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /View/i }).first();
    await viewButton.click();
    
    // Check customer information is displayed
    await expect(inquiryHub.detailsModal).toContainText(/Customer Name/i);
    await expect(inquiryHub.detailsModal).toContainText(/Phone/i);
  });

  test('Scenario 15: Change Inquiry Status', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /View/i }).first();
    await viewButton.click();
    
    // Click a status button
    const contactedButton = inquiryHub.detailsModal.getByRole('button', { name: /CONTACTED/i });
    await contactedButton.click();
    
    // Wait for success toast
    await expect(page.getByText(/status updated/i)).toBeVisible({ timeout: 5000 });
  });

  test('Scenario 16: Assign Inquiry to Staff Member', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /View/i }).first();
    await viewButton.click();
    
    // Click assign button
    await inquiryHub.assignButton.click();
    await expect(inquiryHub.assignmentModal).toBeVisible();
    
    // Select a staff member (if available)
    const options = await inquiryHub.assigneeSelect.locator('option').count();
    if (options > 1) {
      await inquiryHub.assigneeSelect.selectOption({ index: 1 });
      await inquiryHub.confirmAssignButton.click();
      await expect(page.getByText(/assigned successfully/i)).toBeVisible({ timeout: 5000 });
    }
  });

  // ============================================
  // Category 5: Advanced Features
  // ============================================

  test('Scenario 17: Add Follow-up Notes', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /View/i }).first();
    await viewButton.click();
    
    await inquiryHub.addFollowUpButton.click();
    await expect(inquiryHub.followUpModal).toBeVisible();
    
    await inquiryHub.followUpTypeSelect.selectOption('call');
    await inquiryHub.followUpNotesInput.fill('Called customer to discuss requirements');
    
    await inquiryHub.submitFollowUpButton.click();
    await expect(page.getByText(/follow-up added/i)).toBeVisible({ timeout: 5000 });
  });

  test('Scenario 18: Convert Inquiry to Quotation', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /View/i }).first();
    await viewButton.click();
    
    await inquiryHub.convertToQuotationButton.click();
    await expect(inquiryHub.convertModal).toBeVisible();
    
    await inquiryHub.convertConfirmButton.click();
    
    // Should redirect to quotation page
    await page.waitForURL(/yutong-quotation|sinotruck-quotation/, { timeout: 10000 });
    expect(page.url()).toMatch(/yutong-quotation|sinotruck-quotation/);
  });

  test('Scenario 19: Settings - Generate API Key', async ({ page }) => {
    await inquiryHub.settingsTab.click();
    
    await inquiryHub.generateApiKeyButton.click();
    await page.waitForTimeout(1000);
    
    // API key should be displayed
    const apiKeyValue = await inquiryHub.apiKeyDisplay.inputValue();
    expect(apiKeyValue).toBeTruthy();
    expect(apiKeyValue.length).toBeGreaterThan(20);
  });

  test('Scenario 20: Settings - Copy Webhook URL', async ({ page }) => {
    await inquiryHub.settingsTab.click();
    
    // Webhook URL should be visible
    await expect(inquiryHub.webhookUrlDisplay).toBeVisible();
    
    // Click copy button
    await inquiryHub.copyWebhookButton.click();
    
    // Should show success toast
    await expect(page.getByText(/copied/i)).toBeVisible({ timeout: 3000 });
  });
});
