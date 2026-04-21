/**
 * useCustomerBridge — Unified Customer Bridge Hook
 * 
 * Central engine for syncing customers from any NCG business unit
 * (Yutong, Sinotruck, Light Vehicle, Special Hire, School Bus)
 * into the central Accounting "customers" table.
 * 
 * Functions:
 * - checkDuplicate() — Pre-check before creation
 * - syncToAccounting() — Upsert a customer into the accounting table
 * - linkExistingCustomer() — Link a source record to an existing accounting customer
 */

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCallback } from "react";

// ========== Types ==========
export type SourceModule = 'accounting' | 'yutong' | 'sinotruck' | 'light_vehicle' | 'special_hire' | 'school_bus';

export interface CustomerBridgeData {
  customer_name: string;
  contact_phone?: string;
  contact_email?: string;
  billing_address?: string;
  nic_passport?: string;
  business_registration_no?: string;
  customer_type?: 'individual' | 'business' | 'government';
  tax_id?: string;
  source_module: SourceModule;
  source_record_id?: string;
  customer_category_id?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'phone' | 'nic' | 'none';
  existingCustomer: {
    id: string;
    customer_name: string;
    customer_code: string;
    phone?: string | null;
    source_module?: string | null;
  } | null;
  message: string;
}

export interface SyncResult {
  success: boolean;
  customerId: string | null;
  isNew: boolean;
  error?: string;
}

// ========== Phone normalization (mirrors DB trigger logic) ==========
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone
    .replace(/[\s\-\+\(\)]/g, '')
    .replace(/^94/, '0');
}

// ========== Source module → Category code mapping ==========
const SOURCE_CATEGORY_MAP: Record<SourceModule, string> = {
  yutong: 'CAT-YUT',
  sinotruck: 'CAT-SNT',
  special_hire: 'CAT-SHR',
  school_bus: 'CAT-SCH',
  light_vehicle: 'CAT-LTV',
  accounting: '', // No auto-assign for manual accounting customers
};

// ========== Hook ==========
export function useCustomerBridge() {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const queryClient = useQueryClient();

  /**
   * Check for duplicate customers by normalized phone or NIC/passport.
   * Returns the matching customer if found.
   */
  const checkDuplicate = useCallback(async (
    phone?: string,
    email?: string,
    nic?: string,
  ): Promise<DuplicateCheckResult> => {
    const effectiveCompanyId = getEffectiveCompanyId();
    if (!effectiveCompanyId) {
      return { isDuplicate: false, duplicateType: 'none', existingCustomer: null, message: '' };
    }

    // 1. Check by normalized phone
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone) {
      const { data: phoneMatch } = await (supabase as any)
        .from('customers')
        .select('id, customer_name, customer_code, phone, source_module')
        .eq('company_id', effectiveCompanyId)
        .eq('normalized_phone', normalizedPhone)
        .limit(1)
        .maybeSingle();

      if (phoneMatch) {
        return {
          isDuplicate: true,
          duplicateType: 'phone',
          existingCustomer: phoneMatch,
          message: `A customer with this phone number already exists: "${phoneMatch.customer_name}" (${phoneMatch.customer_code})`,
        };
      }
    }

    // 2. Check by NIC/Passport
    if (nic && nic.trim()) {
      const { data: nicMatch } = await (supabase as any)
        .from('customers')
        .select('id, customer_name, customer_code, phone, source_module')
        .eq('company_id', effectiveCompanyId)
        .eq('nic_passport', nic.trim())
        .limit(1)
        .maybeSingle();

      if (nicMatch) {
        return {
          isDuplicate: true,
          duplicateType: 'nic',
          existingCustomer: nicMatch,
          message: `A customer with this NIC/Passport already exists: "${nicMatch.customer_name}" (${nicMatch.customer_code})`,
        };
      }
    }

    return { isDuplicate: false, duplicateType: 'none', existingCustomer: null, message: '' };
  }, [getEffectiveCompanyId]);

  /**
   * Sync a customer from any module into the central accounting customers table.
   * If a matching customer exists (by phone), links to it instead of creating a duplicate.
   * Returns the accounting customer ID.
   */
  const syncToAccounting = useCallback(async (
    data: CustomerBridgeData
  ): Promise<SyncResult> => {
    const effectiveCompanyId = getEffectiveCompanyId();
    if (!effectiveCompanyId) {
      return { success: false, customerId: null, isNew: false, error: 'No company selected' };
    }

    try {
      // First check for existing customer by phone
      const duplicateCheck = await checkDuplicate(
        data.contact_phone, 
        data.contact_email, 
        data.nic_passport
      );

      if (duplicateCheck.isDuplicate && duplicateCheck.existingCustomer) {
        // Customer already exists — update the source link and return existing ID
        const existingId = duplicateCheck.existingCustomer.id;

        // Update the existing customer with any new information that was previously empty
        const updatePayload: Record<string, any> = {};
        if (data.billing_address) updatePayload.billing_address = data.billing_address;
        if (data.contact_email && !duplicateCheck.existingCustomer.phone) {
          updatePayload.email = data.contact_email;
        }
        if (data.nic_passport) updatePayload.nic_passport = data.nic_passport;
        if (data.business_registration_no) updatePayload.business_registration_no = data.business_registration_no;
        if (data.tax_id) updatePayload.tax_id = data.tax_id;

        if (Object.keys(updatePayload).length > 0) {
          await supabase
            .from('customers')
            .update(updatePayload)
            .eq('id', existingId);
        }

        // Link back to the source record
        if (data.source_record_id) {
          await linkSourceRecord(data.source_module, data.source_record_id, existingId);
        }

        queryClient.invalidateQueries({ queryKey: ['customers'] });

        return { success: true, customerId: existingId, isNew: false };
      }

      // No existing customer — create a new one
      // Resolve the customer category for this source module
      let categoryId = data.customer_category_id || null;
      if (!categoryId && data.source_module !== 'accounting') {
        const categoryCode = SOURCE_CATEGORY_MAP[data.source_module];
        if (categoryCode) {
          const { data: category } = await supabase
            .from('customer_categories')
            .select('id')
            .eq('company_id', effectiveCompanyId)
            .eq('category_code', categoryCode)
            .maybeSingle();
          categoryId = category?.id || null;
        }
      }

      // Generate unique customer code
      const customerCode = await generateCustomerCode(effectiveCompanyId, data.source_module);

      const insertPayload = {
        customer_code: customerCode,
        customer_name: data.customer_name,
        phone: data.contact_phone || null,
        email: data.contact_email || null,
        billing_address: data.billing_address || null,
        nic_passport: data.nic_passport || null,
        business_registration_no: data.business_registration_no || null,
        customer_type: data.customer_type || 'individual',
        tax_id: data.tax_id || null,
        source_module: data.source_module,
        source_record_id: data.source_record_id || null,
        customer_category_id: categoryId,
        company_id: effectiveCompanyId,
        is_active: true,
        credit_limit: 0,
      };

      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert([insertPayload])
        .select('id')
        .single();

      if (insertError) {
        // Handle unique constraint violation gracefully
        if (insertError.code === '23505' && insertError.message.includes('normalized_phone')) {
          // Race condition: another process created it — fetch the existing one
          const normalizedPhone = normalizePhone(data.contact_phone);
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('company_id', effectiveCompanyId)
            .eq('normalized_phone', normalizedPhone)
            .maybeSingle();

          if (existing) {
            if (data.source_record_id) {
              await linkSourceRecord(data.source_module, data.source_record_id, existing.id);
            }
            return { success: true, customerId: existing.id, isNew: false };
          }
        }
        throw insertError;
      }

      // Link back to the source record
      if (data.source_record_id && newCustomer) {
        await linkSourceRecord(data.source_module, data.source_record_id, newCustomer.id);
      }

      queryClient.invalidateQueries({ queryKey: ['customers'] });

      return { success: true, customerId: newCustomer.id, isNew: true };
    } catch (error: any) {
      console.error('[CustomerBridge] syncToAccounting failed:', error);
      return { success: false, customerId: null, isNew: false, error: error.message };
    }
  }, [getEffectiveCompanyId, checkDuplicate, queryClient]);

  /**
   * Manually link a source module customer to an existing accounting customer.
   */
  const linkExistingCustomer = useCallback(async (
    sourceModule: SourceModule,
    sourceRecordId: string,
    accountingCustomerId: string,
  ): Promise<boolean> => {
    try {
      await linkSourceRecord(sourceModule, sourceRecordId, accountingCustomerId);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer linked to accounting successfully');
      return true;
    } catch (error: any) {
      console.error('[CustomerBridge] linkExistingCustomer failed:', error);
      toast.error(`Failed to link customer: ${error.message}`);
      return false;
    }
  }, [queryClient]);

  return {
    checkDuplicate,
    syncToAccounting,
    linkExistingCustomer,
    normalizePhone,
  };
}

// ========== Internal Helpers ==========

/**
 * Link a source module record (yutong_customers, sinotruck_customers) 
 * back to the central accounting customer via the accounting_customer_id FK.
 */
async function linkSourceRecord(
  sourceModule: SourceModule,
  sourceRecordId: string,
  accountingCustomerId: string,
) {
  const tableMap: Partial<Record<SourceModule, 'yutong_customers' | 'sinotruck_customers'>> = {
    yutong: 'yutong_customers',
    sinotruck: 'sinotruck_customers',
  };

  const table = tableMap[sourceModule];
  if (table) {
    await (supabase as any)
      .from(table)
      .update({ accounting_customer_id: accountingCustomerId })
      .eq('id', sourceRecordId);
  }
}

/**
 * Generate a unique customer code with source-specific prefix.
 * Format: CUS-YUT-00001, CUS-SNT-00001, CUS-SHR-00001, etc.
 */
async function generateCustomerCode(companyId: string, source: SourceModule): Promise<string> {
  const prefixMap: Record<SourceModule, string> = {
    yutong: 'CUS-YUT',
    sinotruck: 'CUS-SNT',
    light_vehicle: 'CUS-LTV',
    special_hire: 'CUS-SHR',
    school_bus: 'CUS-SCH',
    accounting: 'CUS',
  };

  const prefix = prefixMap[source] || 'CUS';

  // Count existing customers with this prefix to generate next sequential number
  const { count } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .ilike('customer_code', `${prefix}-%`);

  const nextNumber = (count || 0) + 1;
  return `${prefix}-${nextNumber.toString().padStart(5, '0')}`;
}
