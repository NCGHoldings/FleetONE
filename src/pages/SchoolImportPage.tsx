import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SchoolExcelImport } from "@/components/school/SchoolExcelImport";

export default function SchoolImportPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();

  const handleImportComplete = () => {
    navigate(`/school-bus/branch/${branchId}/students`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/school-bus/branch/${branchId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Branch
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Students</h1>
          <p className="text-muted-foreground">
            Upload Excel file to import student data
          </p>
        </div>
      </div>

      <SchoolExcelImport 
        branchId={branchId!} 
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}