import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FlowStatus = 'success' | 'warning' | 'error' | 'pending' | 'running';

export interface FlowLocation {
  path: string;
  page: string;
  feature: string;
  breadcrumb: string;
  userImpact: string;
}

export interface BusinessFlowResult {
  id: string;
  category: string;
  name: string;
  status: FlowStatus;
  message: string;
  errorDetails?: string;
  friendlyError?: string;
  latency: number;
  testedAt: Date;
  location: FlowLocation;
}

export interface UseBusinessFlowTestsReturn {
  results: BusinessFlowResult[];
  isRunning: boolean;
  lastRunTime: Date | null;
  runAllTests: () => Promise<void>;
  runCategoryTests: (category: string) => Promise<void>;
  criticalIssues: BusinessFlowResult[];
}

// Location mapping for each test
const FLOW_LOCATIONS: Record<string, FlowLocation> = {
  'sinotruck-price-update': {
    path: '/sinotruck-admin',
    page: 'Sinotruck Admin',
    feature: 'Edit Truck Model Prices',
    breadcrumb: 'Business → Sinotruck → Truck Models',
    userImpact: 'Staff cannot update truck prices for quotations'
  },
  'sinotruck-image-upload': {
    path: '/sinotruck-admin',
    page: 'Sinotruck Admin',
    feature: 'Upload Truck Images',
    breadcrumb: 'Business → Sinotruck → Image Gallery',
    userImpact: 'Staff cannot add new truck photos'
  },
  'special-hire-quotation-read': {
    path: '/special-hire',
    page: 'Special Hire',
    feature: 'View Quotations',
    breadcrumb: 'Business → Special Hire → Quotations',
    userImpact: 'Staff cannot access quotation information'
  },
  'payment-proof-upload': {
    path: '/special-hire',
    page: 'Special Hire',
    feature: 'Payment Proof Upload',
    breadcrumb: 'Business → Special Hire → Payments → Upload',
    userImpact: 'Customers cannot submit payment confirmation photos'
  },
  'yutong-quotation-read': {
    path: '/yutong',
    page: 'Yutong Sales',
    feature: 'View Quotations',
    breadcrumb: 'Business → Yutong → Quotations',
    userImpact: 'Staff cannot access Yutong quotation data'
  },
  'yutong-image-upload': {
    path: '/yutong',
    page: 'Yutong Sales',
    feature: 'Upload Bus Images',
    breadcrumb: 'Business → Yutong → Image Gallery',
    userImpact: 'Staff cannot add Yutong bus photos'
  },
  'school-receipt-upload': {
    path: '/school-bus',
    page: 'School Bus Management',
    feature: 'Receipt Upload',
    breadcrumb: 'School Bus → Payments → Receipts',
    userImpact: 'Parents cannot submit payment receipts'
  },
  'school-student-access': {
    path: '/school-bus',
    page: 'School Bus Management',
    feature: 'Student Records',
    breadcrumb: 'School Bus → Students',
    userImpact: 'Staff cannot view or manage student information'
  },
  'fleet-bus-access': {
    path: '/fleet',
    page: 'Fleet Management',
    feature: 'Bus Records',
    breadcrumb: 'Fleet → Buses',
    userImpact: 'Staff cannot access bus fleet data'
  },
  'maintenance-access': {
    path: '/fleet/maintenance',
    page: 'Fleet Management',
    feature: 'Maintenance Records',
    breadcrumb: 'Fleet → Maintenance',
    userImpact: 'Staff cannot view or log maintenance records'
  },
  'daily-trip-access': {
    path: '/daily-trips',
    page: 'Daily Trips',
    feature: 'Trip Records',
    breadcrumb: 'Operations → Daily Trips',
    userImpact: 'Staff cannot access daily trip information'
  },
  'daily-expense-access': {
    path: '/daily-trips',
    page: 'Daily Trips',
    feature: 'Expense Records',
    breadcrumb: 'Operations → Daily Trips → Expenses',
    userImpact: 'Staff cannot view or log daily expenses'
  }
};

// Translate technical errors to user-friendly messages
const translateError = (error: string): string => {
  const translations: Record<string, string> = {
    'new row violates row-level security policy': 'Permission error - you may not have access to save changes',
    'The resource was not found': 'Storage folder or file is missing',
    'relation': 'Database table is missing or not configured',
    'permission denied': 'Access denied - check user permissions',
    'violates foreign key constraint': 'Cannot save - related record is missing',
    'duplicate key value': 'This record already exists',
    'connection refused': 'Cannot connect to database',
    'timeout': 'Operation took too long - server may be slow',
    'network': 'Network connection problem',
    'Bucket not found': 'Storage bucket is not set up',
    '404': 'Resource not found'
  };

  for (const [key, friendly] of Object.entries(translations)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return friendly;
    }
  }
  return error;
};

const getDefaultLocation = (category: string): FlowLocation => ({
  path: '/',
  page: category,
  feature: 'General Access',
  breadcrumb: `Business → ${category}`,
  userImpact: `${category} features may not be working`
});

// Test helper to create unique test identifiers
const createTestId = () => `_HEALTH_CHECK_${Date.now()}`;

// Individual test functions
const testSinotruckPriceUpdate = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'sinotruck-price-update';
  
  try {
    const { data: model, error: fetchError } = await supabase
      .from('sinotruck_truck_models')
      .select('id, base_price')
      .limit(1)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    if (!model) {
      return {
        id: testId,
        category: 'Sinotruck',
        name: 'Price Update',
        status: 'warning',
        message: 'No truck models found to test',
        latency: Date.now() - startTime,
        testedAt: new Date(),
        location: FLOW_LOCATIONS[testId]
      };
    }
    
    const testPrice = (model.base_price || 0) + 1;
    const { error: updateError } = await supabase
      .from('sinotruck_truck_models')
      .update({ base_price: testPrice })
      .eq('id', model.id);
    
    if (updateError) throw updateError;
    
    await supabase
      .from('sinotruck_truck_models')
      .update({ base_price: model.base_price })
      .eq('id', model.id);
    
    return {
      id: testId,
      category: 'Sinotruck',
      name: 'Price Update',
      status: 'success',
      message: 'Price update working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Sinotruck',
      name: 'Price Update',
      status: 'error',
      message: 'Cannot update Sinotruck prices',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testSinotruckImageUpload = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'sinotruck-image-upload';
  const testFileName = `_HEALTH_CHECK_${Date.now()}.txt`;
  
  try {
    const testBlob = new Blob(['health-check-test'], { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('sinotruck')
      .upload(`test/${testFileName}`, testBlob);
    
    if (uploadError) throw uploadError;
    
    await supabase.storage
      .from('sinotruck')
      .remove([`test/${testFileName}`]);
    
    return {
      id: testId,
      category: 'Sinotruck',
      name: 'Image Upload',
      status: 'success',
      message: 'Image upload working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Sinotruck',
      name: 'Image Upload',
      status: 'error',
      message: 'Cannot upload Sinotruck images',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testSpecialHireQuotation = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'special-hire-quotation-read';
  
  try {
    const { error: readError } = await supabase
      .from('special_hire_quotations')
      .select('id, quotation_no')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: testId,
      category: 'Special Hire',
      name: 'Quotation Access',
      status: 'success',
      message: 'Quotation access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Special Hire',
      name: 'Quotation Access',
      status: 'error',
      message: 'Cannot access Special Hire quotations',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testPaymentProofUpload = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'payment-proof-upload';
  const testFileName = `_HEALTH_CHECK_${Date.now()}.txt`;
  
  try {
    const testBlob = new Blob(['payment-proof-test'], { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(`test/${testFileName}`, testBlob);
    
    if (uploadError) throw uploadError;
    
    await supabase.storage
      .from('payment-proofs')
      .remove([`test/${testFileName}`]);
    
    return {
      id: testId,
      category: 'Special Hire',
      name: 'Payment Proof Upload',
      status: 'success',
      message: 'Payment proof upload working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Special Hire',
      name: 'Payment Proof Upload',
      status: 'error',
      message: 'Cannot upload payment proofs',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testYutongQuotation = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'yutong-quotation-read';
  
  try {
    const { error: readError } = await supabase
      .from('yutong_quotations')
      .select('id, quotation_no')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: testId,
      category: 'Yutong',
      name: 'Quotation Access',
      status: 'success',
      message: 'Yutong quotation access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Yutong',
      name: 'Quotation Access',
      status: 'error',
      message: 'Cannot access Yutong quotations',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testYutongImageUpload = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'yutong-image-upload';
  const testFileName = `_HEALTH_CHECK_${Date.now()}.txt`;
  
  try {
    const testBlob = new Blob(['yutong-image-test'], { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('yutong')
      .upload(`test/${testFileName}`, testBlob);
    
    if (uploadError) throw uploadError;
    
    await supabase.storage
      .from('yutong')
      .remove([`test/${testFileName}`]);
    
    return {
      id: testId,
      category: 'Yutong',
      name: 'Image Upload',
      status: 'success',
      message: 'Yutong image upload working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Yutong',
      name: 'Image Upload',
      status: 'error',
      message: 'Cannot upload Yutong images',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testSchoolBusReceipt = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'school-receipt-upload';
  const testFileName = `_HEALTH_CHECK_${Date.now()}.txt`;
  
  try {
    const testBlob = new Blob(['receipt-test'], { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('school-receipts')
      .upload(`test/${testFileName}`, testBlob);
    
    if (uploadError) throw uploadError;
    
    await supabase.storage
      .from('school-receipts')
      .remove([`test/${testFileName}`]);
    
    return {
      id: testId,
      category: 'School Bus',
      name: 'Receipt Upload',
      status: 'success',
      message: 'School receipt upload working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'School Bus',
      name: 'Receipt Upload',
      status: 'error',
      message: 'Cannot upload school receipts',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testSchoolStudentAccess = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'school-student-access';
  
  try {
    const { error: readError } = await supabase
      .from('school_students')
      .select('id, student_name')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: testId,
      category: 'School Bus',
      name: 'Student Data Access',
      status: 'success',
      message: 'Student data access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'School Bus',
      name: 'Student Data Access',
      status: 'error',
      message: 'Cannot access student data',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testFleetBusAccess = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'fleet-bus-access';
  
  try {
    const { error: readError } = await supabase
      .from('buses')
      .select('id, bus_no, model')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: testId,
      category: 'Fleet',
      name: 'Bus Data Access',
      status: 'success',
      message: 'Fleet bus data access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Fleet',
      name: 'Bus Data Access',
      status: 'error',
      message: 'Cannot access bus data',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testMaintenanceAccess = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'maintenance-access';
  
  try {
    const { error: readError } = await supabase
      .from('maintenance_records')
      .select('id, maintenance_type')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: testId,
      category: 'Fleet',
      name: 'Maintenance Records',
      status: 'success',
      message: 'Maintenance records access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Fleet',
      name: 'Maintenance Records',
      status: 'error',
      message: 'Cannot access maintenance records',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testDailyTripAccess = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'daily-trip-access';
  
  try {
    const { error: readError } = await supabase
      .from('daily_trips')
      .select('id, trip_date, bus_id')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: testId,
      category: 'Daily Trips',
      name: 'Trip Data Access',
      status: 'success',
      message: 'Daily trip data access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Daily Trips',
      name: 'Trip Data Access',
      status: 'error',
      message: 'Cannot access daily trip data',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

const testDailyTripExpenses = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = 'daily-expense-access';
  
  try {
    const { error: readError } = await supabase
      .from('daily_bus_expenses')
      .select('id, expense_date')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: testId,
      category: 'Daily Trips',
      name: 'Expense Records',
      status: 'success',
      message: 'Daily expense records access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  } catch (error: any) {
    const errorMsg = error.message || error.code || String(error);
    return {
      id: testId,
      category: 'Daily Trips',
      name: 'Expense Records',
      status: 'error',
      message: 'Cannot access expense records',
      errorDetails: errorMsg,
      friendlyError: translateError(errorMsg),
      latency: Date.now() - startTime,
      testedAt: new Date(),
      location: FLOW_LOCATIONS[testId]
    };
  }
};

// Category test mappings
const CATEGORY_TESTS: Record<string, (() => Promise<BusinessFlowResult>)[]> = {
  'Sinotruck': [testSinotruckPriceUpdate, testSinotruckImageUpload],
  'Special Hire': [testSpecialHireQuotation, testPaymentProofUpload],
  'Yutong': [testYutongQuotation, testYutongImageUpload],
  'School Bus': [testSchoolBusReceipt, testSchoolStudentAccess],
  'Fleet': [testFleetBusAccess, testMaintenanceAccess],
  'Daily Trips': [testDailyTripAccess, testDailyTripExpenses],
};

export const useBusinessFlowTests = (autoRunOnMount: boolean = false): UseBusinessFlowTestsReturn => {
  const [results, setResults] = useState<BusinessFlowResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const logResult = async (result: BusinessFlowResult) => {
    try {
      await supabase.from('business_flow_logs').insert({
        flow_category: result.category,
        flow_name: result.name,
        status: result.status === 'pending' || result.status === 'running' ? 'warning' : result.status,
        latency_ms: result.latency,
        message: result.message,
        error_details: result.errorDetails || null,
        tested_at: result.testedAt.toISOString()
      });
    } catch (error) {
      console.error('Failed to log business flow result:', error);
    }
  };

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    
    // Set all tests to running
    const allTests = Object.entries(CATEGORY_TESTS).flatMap(([category, tests]) =>
      tests.map((_, index) => ({
        id: `${category}-${index}`,
        category,
        name: 'Running...',
        status: 'running' as FlowStatus,
        message: 'Test in progress...',
        latency: 0,
        testedAt: new Date(),
        location: getDefaultLocation(category)
      }))
    );
    setResults(allTests);

    // Run all tests in parallel
    const allTestFunctions = Object.values(CATEGORY_TESTS).flat();
    const testResults = await Promise.all(allTestFunctions.map(testFn => testFn()));
    
    // Log and set results
    setResults(testResults);
    setLastRunTime(new Date());
    
    // Log results to database
    for (const result of testResults) {
      await logResult(result);
    }
    
    setIsRunning(false);
  }, []);

  const runCategoryTests = useCallback(async (category: string) => {
    const categoryTests = CATEGORY_TESTS[category];
    if (!categoryTests) return;

    setIsRunning(true);
    
    const testResults = await Promise.all(categoryTests.map(testFn => testFn()));
    
    setResults(prev => {
      const otherResults = prev.filter(r => r.category !== category);
      return [...otherResults, ...testResults];
    });
    
    for (const result of testResults) {
      await logResult(result);
    }
    
    setIsRunning(false);
  }, []);

  // Auto-run tests on mount if enabled
  useEffect(() => {
    if (autoRunOnMount) {
      runAllTests();
    }
  }, [autoRunOnMount, runAllTests]);

  const criticalIssues = results.filter(r => r.status === 'error');

  return {
    results,
    isRunning,
    lastRunTime,
    runAllTests,
    runCategoryTests,
    criticalIssues
  };
};
