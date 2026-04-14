import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileSpreadsheet } from "lucide-react";

interface OCRBatchActionsProps {
  totalSheets: number;
  readySheets: number;
  needsReviewSheets: number;
  onApplyAll: () => void;
  onExportCSV: () => void;
}

export const OCRBatchActions = ({ 
  totalSheets, 
  readySheets, 
  needsReviewSheets,
  onApplyAll,
  onExportCSV 
}: OCRBatchActionsProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-4">
      <div className="flex items-center gap-3">
        <span className="font-semibold">{totalSheets} sheets extracted</span>
        <Badge variant="default" className="bg-green-500">
          {readySheets} ready
        </Badge>
        {needsReviewSheets > 0 && (
          <Badge variant="default" className="bg-yellow-500">
            {needsReviewSheets} needs review
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={onExportCSV} variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
        <Button onClick={onApplyAll} size="sm" disabled={readySheets === 0}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Apply All ({readySheets})
        </Button>
      </div>
    </div>
  );
};
