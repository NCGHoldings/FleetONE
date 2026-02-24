import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from 'xlsx-js-style';

export default function ServiceMasterUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      previewFile(selectedFile);
    }
  };

  const previewFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Convert to objects with expected structure
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = (row as any[])[index] || '';
          });
          return obj;
        });
        
        setPreviewData(rows.slice(0, 5)); // Show first 5 rows as preview
      } catch (error) {
        toast.error('Error reading file. Please check the format.');
        console.error('File read error:', error);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1);

          // Map Excel columns to database fields
          const mappedData = rows.map(row => ({
            service_type: (row as any[])[0] || '',
            item_code: (row as any[])[1] || null,
            item_description: (row as any[])[2] || '',
            default_qty: parseFloat((row as any[])[3] as string) || 1,
            base_role: (row as any[])[4] || 'mechanic',
            role_rate_per_hour: parseFloat((row as any[])[5] as string) || 500,
            estimated_hours: parseFloat((row as any[])[6] as string) || 1,
            notes: (row as any[])[7] || ''
          }));

          // Delete existing records
          await supabase.from('service_master').delete().neq('id', '00000000-0000-0000-0000-000000000000');

          // Insert new records in batches
          const batchSize = 100;
          for (let i = 0; i < mappedData.length; i += batchSize) {
            const batch = mappedData.slice(i, i + batchSize);
            const { error } = await supabase.from('service_master').insert(batch);
            if (error) throw error;
          }

          toast.success(`Successfully uploaded ${mappedData.length} service master records`);
          setFile(null);
          setPreviewData([]);
          
          // Reset file input
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          
        } catch (error: any) {
          console.error('Upload error:', error);
          toast.error(`Upload failed: ${error.message}`);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('File processing error:', error);
      toast.error('Failed to process file');
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Service Master Data Upload
        </CardTitle>
        <CardDescription>
          Upload Excel/CSV file with columns: Service Type, Item Code, Item Description, Default Qty, Base Role, Rate/Hour, Est Hours, Notes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="file-upload">Select Excel/CSV File</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="mt-1"
          />
        </div>

        {previewData.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Preview (First 5 rows)
            </h4>
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Service Type</th>
                    <th className="p-2 text-left">Item Code</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-left">Qty</th>
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Rate/Hr</th>
                    <th className="p-2 text-left">Est Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{Object.values(row)[0] as string}</td>
                      <td className="p-2">{Object.values(row)[1] as string}</td>
                      <td className="p-2">{Object.values(row)[2] as string}</td>
                      <td className="p-2">{Object.values(row)[3] as string}</td>
                      <td className="p-2">{Object.values(row)[4] as string}</td>
                      <td className="p-2">{Object.values(row)[5] as string}</td>
                      <td className="p-2">{Object.values(row)[6] as string}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Upload & Replace Master Data
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Expected Format:</strong></p>
          <p>Column A: Service Type (routine, repair, inspection, etc.)</p>
          <p>Column B: Item Code (OIL001, BRAKE001, etc.)</p>
          <p>Column C: Item Description</p>
          <p>Column D: Default Quantity (numeric)</p>
          <p>Column E: Base Role (mechanic, senior_mechanic, inspector)</p>
          <p>Column F: Rate per Hour (numeric)</p>
          <p>Column G: Estimated Hours (numeric)</p>
          <p>Column H: Notes (optional)</p>
        </div>
      </CardContent>
    </Card>
  );
}