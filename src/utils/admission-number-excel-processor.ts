import * as XLSX from "xlsx-js-style";

interface ExcelMapping {
  tnNumber: string;
  newNumber: string;
  rowNumber: number;
}

interface ProcessResult {
  success: boolean;
  mappings: ExcelMapping[];
  errors: string[];
}

export function processAdmissionNumberExcel(file: File): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        const mappings: ExcelMapping[] = [];
        const errors: string[] = [];

        // Skip header row, process data rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNumber = i + 1;

          // Skip empty rows
          if (!row || row.length === 0 || (!row[0] && !row[1])) {
            continue;
          }

          const tnNumber = String(row[0] || '').trim();
          const newNumber = String(row[1] || '').trim();

          // Validation
          if (!tnNumber) {
            errors.push(`Row ${rowNumber}: TN Number is empty`);
            continue;
          }

          if (!newNumber) {
            errors.push(`Row ${rowNumber}: New Admission Number is empty`);
            continue;
          }

          // Check if TN number contains "TN"
          if (!tnNumber.toUpperCase().includes('TN')) {
            errors.push(`Row ${rowNumber}: "${tnNumber}" doesn't appear to be a TN number`);
            continue;
          }

          // Validate new admission number format
          if (!/^[A-Za-z0-9-_]{1,20}$/.test(newNumber)) {
            errors.push(`Row ${rowNumber}: Invalid format for "${newNumber}". Use alphanumeric characters only (max 20)`);
            continue;
          }

          mappings.push({
            tnNumber,
            newNumber,
            rowNumber,
          });
        }

        // Check for duplicate new admission numbers within the file
        const newNumberCounts = new Map<string, number[]>();
        mappings.forEach(m => {
          if (!newNumberCounts.has(m.newNumber)) {
            newNumberCounts.set(m.newNumber, []);
          }
          newNumberCounts.get(m.newNumber)!.push(m.rowNumber);
        });

        newNumberCounts.forEach((rows, newNumber) => {
          if (rows.length > 1) {
            errors.push(`Duplicate new admission number "${newNumber}" found in rows: ${rows.join(', ')}`);
          }
        });

        resolve({
          success: errors.length === 0,
          mappings,
          errors,
        });
      } catch (error) {
        console.error('Excel processing error:', error);
        resolve({
          success: false,
          mappings: [],
          errors: ['Failed to process Excel file. Please check the file format.'],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        mappings: [],
        errors: ['Failed to read Excel file'],
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

export function validateExcelStructure(file: File): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          resolve({ valid: false, error: 'Excel file has no sheets' });
          return;
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          resolve({ valid: false, error: 'Excel file must have at least a header row and one data row' });
          return;
        }

        const headers = jsonData[0];
        if (!headers || headers.length < 2) {
          resolve({ valid: false, error: 'Excel file must have at least 2 columns: "Current TN Number" and "New Admission Number"' });
          return;
        }

        resolve({ valid: true });
      } catch (error) {
        resolve({ valid: false, error: 'Invalid Excel file format' });
      }
    };

    reader.onerror = () => {
      resolve({ valid: false, error: 'Failed to read Excel file' });
    };

    reader.readAsArrayBuffer(file);
  });
}
