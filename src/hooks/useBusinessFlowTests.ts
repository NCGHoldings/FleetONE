import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FlowStatus = 'success' | 'warning' | 'error' | 'pending' | 'running';

export interface BusinessFlowResult {
  id: string;
  category: string;
  name: string;
  status: FlowStatus;
  message: string;
  errorDetails?: string;
  latency: number;
  testedAt: Date;
}

export interface UseBusinessFlowTestsReturn {
  results: BusinessFlowResult[];
  isRunning: boolean;
  lastRunTime: Date | null;
  runAllTests: () => Promise<void>;
  runCategoryTests: (category: string) => Promise<void>;
  criticalIssues: BusinessFlowResult[];
}

// Test helper to create unique test identifiers
const createTestId = () => `_HEALTH_CHECK_${Date.now()}`;

// Individual test functions
const testSinotruckPriceUpdate = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testId = createTestId();
  
  try {
    // Find an existing truck model
    const { data: model, error: fetchError } = await supabase
      .from('sinotruck_truck_models')
      .select('id, base_price')
      .limit(1)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    if (!model) {
      return {
        id: 'sinotruck-price-update',
        category: 'Sinotruck',
        name: 'Price Update',
        status: 'warning',
        message: 'No truck models found to test',
        latency: Date.now() - startTime,
        testedAt: new Date()
      };
    }
    
    // Try to update the price
    const testPrice = (model.base_price || 0) + 1;
    const { error: updateError } = await supabase
      .from('sinotruck_truck_models')
      .update({ base_price: testPrice })
      .eq('id', model.id);
    
    if (updateError) throw updateError;
    
    // Revert the change
    await supabase
      .from('sinotruck_truck_models')
      .update({ base_price: model.base_price })
      .eq('id', model.id);
    
    return {
      id: 'sinotruck-price-update',
      category: 'Sinotruck',
      name: 'Price Update',
      status: 'success',
      message: 'Price update working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'sinotruck-price-update',
      category: 'Sinotruck',
      name: 'Price Update',
      status: 'error',
      message: 'Cannot update Sinotruck prices',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testSinotruckImageUpload = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testFileName = `_HEALTH_CHECK_${Date.now()}.txt`;
  
  try {
    // Create a small test file
    const testBlob = new Blob(['health-check-test'], { type: 'text/plain' });
    
    // Try to upload to sinotruck bucket
    const { error: uploadError } = await supabase.storage
      .from('sinotruck')
      .upload(`test/${testFileName}`, testBlob);
    
    if (uploadError) throw uploadError;
    
    // Clean up - delete the test file
    await supabase.storage
      .from('sinotruck')
      .remove([`test/${testFileName}`]);
    
    return {
      id: 'sinotruck-image-upload',
      category: 'Sinotruck',
      name: 'Image Upload',
      status: 'success',
      message: 'Image upload working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'sinotruck-image-upload',
      category: 'Sinotruck',
      name: 'Image Upload',
      status: 'error',
      message: 'Cannot upload Sinotruck images',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testSpecialHireQuotation = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  
  try {
    // Test read access to quotations
    const { error: readError } = await supabase
      .from('special_hire_quotations')
      .select('id, quotation_no')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: 'special-hire-quotation-read',
      category: 'Special Hire',
      name: 'Quotation Access',
      status: 'success',
      message: 'Quotation access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'special-hire-quotation-read',
      category: 'Special Hire',
      name: 'Quotation Access',
      status: 'error',
      message: 'Cannot access Special Hire quotations',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testPaymentProofUpload = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  const testFileName = `_HEALTH_CHECK_${Date.now()}.txt`;
  
  try {
    const testBlob = new Blob(['payment-proof-test'], { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(`test/${testFileName}`, testBlob);
    
    if (uploadError) throw uploadError;
    
    // Clean up
    await supabase.storage
      .from('payment-proofs')
      .remove([`test/${testFileName}`]);
    
    return {
      id: 'payment-proof-upload',
      category: 'Special Hire',
      name: 'Payment Proof Upload',
      status: 'success',
      message: 'Payment proof upload working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'payment-proof-upload',
      category: 'Special Hire',
      name: 'Payment Proof Upload',
      status: 'error',
      message: 'Cannot upload payment proofs',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testYutongQuotation = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  
  try {
    const { error: readError } = await supabase
      .from('yutong_quotations')
      .select('id, quotation_no')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: 'yutong-quotation-read',
      category: 'Yutong',
      name: 'Quotation Access',
      status: 'success',
      message: 'Yutong quotation access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'yutong-quotation-read',
      category: 'Yutong',
      name: 'Quotation Access',
      status: 'error',
      message: 'Cannot access Yutong quotations',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testYutongImageUpload = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
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
      id: 'yutong-image-upload',
      category: 'Yutong',
      name: 'Image Upload',
      status: 'success',
      message: 'Yutong image upload working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'yutong-image-upload',
      category: 'Yutong',
      name: 'Image Upload',
      status: 'error',
      message: 'Cannot upload Yutong images',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testSchoolBusReceipt = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
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
      id: 'school-receipt-upload',
      category: 'School Bus',
      name: 'Receipt Upload',
      status: 'success',
      message: 'School receipt upload working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'school-receipt-upload',
      category: 'School Bus',
      name: 'Receipt Upload',
      status: 'error',
      message: 'Cannot upload school receipts',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testSchoolStudentAccess = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  
  try {
    const { error: readError } = await supabase
      .from('school_students')
      .select('id, student_name')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: 'school-student-access',
      category: 'School Bus',
      name: 'Student Data Access',
      status: 'success',
      message: 'Student data access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'school-student-access',
      category: 'School Bus',
      name: 'Student Data Access',
      status: 'error',
      message: 'Cannot access student data',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testFleetBusAccess = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  
  try {
    const { error: readError } = await supabase
      .from('buses')
      .select('id, bus_no, model')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: 'fleet-bus-access',
      category: 'Fleet',
      name: 'Bus Data Access',
      status: 'success',
      message: 'Fleet bus data access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'fleet-bus-access',
      category: 'Fleet',
      name: 'Bus Data Access',
      status: 'error',
      message: 'Cannot access bus data',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testMaintenanceAccess = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  
  try {
    const { error: readError } = await supabase
      .from('maintenance_records')
      .select('id, maintenance_type')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: 'maintenance-access',
      category: 'Fleet',
      name: 'Maintenance Records',
      status: 'success',
      message: 'Maintenance records access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'maintenance-access',
      category: 'Fleet',
      name: 'Maintenance Records',
      status: 'error',
      message: 'Cannot access maintenance records',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testDailyTripAccess = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  
  try {
    const { error: readError } = await supabase
      .from('daily_trips')
      .select('id, trip_date, bus_id')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: 'daily-trip-access',
      category: 'Daily Trips',
      name: 'Trip Data Access',
      status: 'success',
      message: 'Daily trip data access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'daily-trip-access',
      category: 'Daily Trips',
      name: 'Trip Data Access',
      status: 'error',
      message: 'Cannot access daily trip data',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  }
};

const testDailyTripExpenses = async (): Promise<BusinessFlowResult> => {
  const startTime = Date.now();
  
  try {
    const { error: readError } = await supabase
      .from('daily_bus_expenses')
      .select('id, expense_date')
      .limit(1);
    
    if (readError) throw readError;
    
    return {
      id: 'daily-expense-access',
      category: 'Daily Trips',
      name: 'Expense Records',
      status: 'success',
      message: 'Daily expense records access working correctly',
      latency: Date.now() - startTime,
      testedAt: new Date()
    };
  } catch (error: any) {
    return {
      id: 'daily-expense-access',
      category: 'Daily Trips',
      name: 'Expense Records',
      status: 'error',
      message: 'Cannot access expense records',
      errorDetails: error.message || error.code,
      latency: Date.now() - startTime,
      testedAt: new Date()
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

export const useBusinessFlowTests = (): UseBusinessFlowTestsReturn => {
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
    
    // Set all tests to pending
    const allTests = Object.entries(CATEGORY_TESTS).flatMap(([category, tests]) =>
      tests.map((_, index) => ({
        id: `${category}-${index}`,
        category,
        name: 'Running...',
        status: 'running' as FlowStatus,
        message: 'Test in progress...',
        latency: 0,
        testedAt: new Date()
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
