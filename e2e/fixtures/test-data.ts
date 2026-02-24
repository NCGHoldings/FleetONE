export const testCustomers = {
  customer1: {
    name: 'Test Customer Alpha',
    phone: '+94771234567',
    email: 'alpha@test.com',
    company: 'Alpha Transport Ltd',
    address: '123 Test Street, Colombo',
  },
  customer2: {
    name: 'Test Customer Beta',
    phone: '+94772345678',
    email: 'beta@test.com',
    company: 'Beta Logistics',
    address: '456 Sample Road, Kandy',
  },
  customer3: {
    name: 'John Doe',
    phone: '+94773456789',
    email: 'john@example.com',
  },
};

export const testInquiries = {
  yutong: {
    productType: 'yutong',
    source: 'phone',
    interestedModel: '',
    notes: 'Customer interested in purchasing 2 buses for school transport',
  },
  sinotruck: {
    productType: 'sinotruck',
    source: 'website',
    interestedModel: '',
    notes: 'Looking for heavy-duty trucks for construction business',
  },
  walkin: {
    productType: 'yutong',
    source: 'walkin',
    interestedModel: '',
    budget: 15000000,
    quantity: 1,
    notes: 'Walk-in customer needs immediate quotation',
  },
};

export const followUpTypes = ['call', 'email', 'whatsapp', 'meeting'];

export const inquiryStatuses = [
  'new',
  'contacted',
  'qualified',
  'quotation_sent',
  'negotiating',
  'converted',
  'lost',
];

export const priorities = ['low', 'medium', 'high'];
