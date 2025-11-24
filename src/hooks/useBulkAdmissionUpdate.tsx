import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx-js-style";

interface TNStudent {
  id: string;
  admission_no: string;
  student_name: string;
  grade: string;
  branch_id: string;
}

interface ValidationResult {
  studentId: string;
  tnNumber: string;
  newNumber: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

interface UpdateProgress {
  isUpdating: boolean;
  current: number;
  total: number;
}

export function useBulkAdmissionUpdate(branchId?: string) {
  const [tnStudents, setTnStudents] = useState<TNStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress>({
    isUpdating: false,
    current: 0,
    total: 0,
  });

  const fetchTNStudents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('school_students')
        .select('id, admission_no, student_name, grade, branch_id')
        .ilike('admission_no', '%TN%')
        .eq('is_active', true)
        .order('admission_no');

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTnStudents(data || []);
    } catch (error) {
      console.error('Error fetching TN students:', error);
      toast.error('Failed to fetch TN students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTNStudents();
  }, [branchId]);

  const validateAdmissionNumber = (newNumber: string): { valid: boolean; message: string } => {
    if (!newNumber || newNumber.trim() === '') {
      return { valid: false, message: 'Admission number cannot be empty' };
    }

    // Check format (alphanumeric, max 20 chars)
    if (!/^[A-Za-z0-9-_]{1,20}$/.test(newNumber)) {
      return { valid: false, message: 'Invalid format. Use alphanumeric characters only (max 20)' };
    }

    return { valid: true, message: 'Valid' };
  };

  const checkDuplicateAdmissionNo = async (newNumber: string, excludeId?: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('school_students')
        .select('id')
        .eq('admission_no', newNumber)
        .eq('is_active', true);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return false;
    }
  };

  const handleExcelUpload = async (mappings: any[]) => {
    setUpdateProgress({ isUpdating: true, current: 0, total: mappings.length });
    const results: ValidationResult[] = [];
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      setUpdateProgress({ isUpdating: true, current: i + 1, total: mappings.length });

      try {
        // Find student by TN number
        const student = tnStudents.find(s => s.admission_no === mapping.tnNumber);
        if (!student) {
          results.push({
            studentId: '',
            tnNumber: mapping.tnNumber,
            newNumber: mapping.newNumber,
            status: 'error',
            message: 'TN number not found in database',
          });
          errors.push(`${mapping.tnNumber}: Student not found`);
          continue;
        }

        // Validate new number
        const validation = validateAdmissionNumber(mapping.newNumber);
        if (!validation.valid) {
          results.push({
            studentId: student.id,
            tnNumber: mapping.tnNumber,
            newNumber: mapping.newNumber,
            status: 'error',
            message: validation.message,
          });
          errors.push(`${mapping.tnNumber}: ${validation.message}`);
          continue;
        }

        // Check for duplicates
        const isDuplicate = await checkDuplicateAdmissionNo(mapping.newNumber, student.id);
        if (isDuplicate) {
          results.push({
            studentId: student.id,
            tnNumber: mapping.tnNumber,
            newNumber: mapping.newNumber,
            status: 'error',
            message: 'Admission number already exists',
          });
          errors.push(`${mapping.tnNumber}: Duplicate admission number`);
          continue;
        }

        // Update database
        const { error: updateError } = await supabase
          .from('school_students')
          .update({ 
            admission_no: mapping.newNumber,
            updated_at: new Date().toISOString(),
          })
          .eq('id', student.id);

        if (updateError) throw updateError;

        results.push({
          studentId: student.id,
          tnNumber: mapping.tnNumber,
          newNumber: mapping.newNumber,
          status: 'success',
          message: 'Updated successfully',
        });
        successCount++;
      } catch (error) {
        console.error('Update error:', error);
        errors.push(`${mapping.tnNumber}: Update failed`);
      }
    }

    setUpdateProgress({ isUpdating: false, current: 0, total: 0 });
    setValidationResults(results);

    return {
      success: errors.length === 0,
      successCount,
      errors,
    };
  };

  const handleManualUpdate = async (studentId: string, newNumber: string) => {
    try {
      const validation = validateAdmissionNumber(newNumber);
      if (!validation.valid) {
        toast.error(validation.message);
        return { success: false, message: validation.message };
      }

      const isDuplicate = await checkDuplicateAdmissionNo(newNumber, studentId);
      if (isDuplicate) {
        toast.error('Admission number already exists');
        return { success: false, message: 'Duplicate admission number' };
      }

      const { error } = await supabase
        .from('school_students')
        .update({ 
          admission_no: newNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId);

      if (error) throw error;

      toast.success('Admission number updated successfully');
      return { success: true, message: 'Updated successfully' };
    } catch (error) {
      console.error('Manual update error:', error);
      toast.error('Failed to update admission number');
      return { success: false, message: 'Update failed' };
    }
  };

  const handleBulkUpdate = async (updates: any[]) => {
    setUpdateProgress({ isUpdating: true, current: 0, total: updates.length });
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      setUpdateProgress({ isUpdating: true, current: i + 1, total: updates.length });

      const result = await handleManualUpdate(update.studentId, update.newNumber);
      if (result.success) {
        successCount++;
      } else {
        errors.push(`${update.tnNumber}: ${result.message}`);
      }
    }

    setUpdateProgress({ isUpdating: false, current: 0, total: 0 });

    return {
      success: errors.length === 0,
      successCount,
      errors,
    };
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Current TN Number', 'New Admission Number'],
      ['TN001', '2024-001'],
      ['TN002', '2024-002'],
      ['TN003', '2024-003'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Style header row
    ws['A1'].s = { font: { bold: true }, fill: { fgColor: { rgb: "4F46E5" } } };
    ws['B1'].s = { font: { bold: true }, fill: { fgColor: { rgb: "4F46E5" } } };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Admission Numbers');
    XLSX.writeFile(wb, 'admission_number_update_template.xlsx');
    
    toast.success('Template downloaded successfully');
  };

  return {
    tnStudents,
    loading,
    validationResults,
    updateProgress,
    handleExcelUpload,
    handleManualUpdate,
    handleBulkUpdate,
    downloadTemplate,
    refreshStudents: fetchTNStudents,
  };
}
