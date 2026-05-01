import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToPDF, ExportConfig } from "@/utils/exportUtils";
import { toast } from "sonner";

interface DataExportMenuProps {
  data: any[];
  title: string;
  filename: string;
  headers: string[];
  /**
   * Function to transform your raw data objects into a 2D array of strings/numbers
   * matching the order of the `headers`.
   */
  transformData: (data: any[]) => any[][];
}

export const DataExportMenu = ({ data, title, filename, headers, transformData }: DataExportMenuProps) => {
  const handleExport = (type: 'csv' | 'pdf') => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }

    try {
      const exportData = transformData(data);
      const config: ExportConfig = {
        filename,
        title,
        headers,
        data: exportData
      };

      if (type === 'csv') {
        exportToCSV(config);
      } else {
        exportToPDF(config);
      }
      toast.success(`Exported as ${type.toUpperCase()} successfully`);
    } catch (error: any) {
      toast.error(`Failed to export: ${error.message}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2 text-red-600" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
