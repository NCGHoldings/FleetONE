import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, FileSpreadsheet } from "lucide-react";

export default function GlobalSchoolImport() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/school-bus-service")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to School Bus Service
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Students</h1>
          <p className="text-muted-foreground">
            Choose a branch to import student data
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Branch Selection Required
          </CardTitle>
          <CardDescription>
            Student imports need to be done at the branch level. Please select a branch first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            To import students, please:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go back to the School Bus Service main page</li>
            <li>Select a specific branch</li>
            <li>Use the "Import Students" button from the branch dashboard</li>
          </ol>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={() => navigate("/school-bus-service")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Branch Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}