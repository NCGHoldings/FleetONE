import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Wand2, Check, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { defaultTemplates, templateDisplayNames } from "@/lib/document-template-seeder";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TemplateInitializerButtonProps {
  companies: any[];
  templateTypes: any[];
  onComplete?: () => void;
}

interface InitResult {
  company: string;
  templateType: string;
  status: "created" | "exists" | "error";
  error?: string;
}

export const TemplateInitializerButton = ({
  companies,
  templateTypes,
  onComplete,
}: TemplateInitializerButtonProps) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<InitResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const initializeTemplates = async () => {
    setIsInitializing(true);
    setProgress(0);
    setResults([]);

    const allResults: InitResult[] = [];
    const totalOperations = companies.length * templateTypes.length;
    let completedOperations = 0;

    try {
      // Get existing templates
      const { data: existingTemplates } = await supabase
        .from("document_templates")
        .select("company_id, template_type_id");

      const existingSet = new Set(
        existingTemplates?.map((t) => `${t.company_id}-${t.template_type_id}`) || []
      );

      for (const company of companies) {
        for (const templateType of templateTypes) {
          const key = `${company.id}-${templateType.id}`;
          
          // Skip if template already exists
          if (existingSet.has(key)) {
            allResults.push({
              company: company.name,
              templateType: templateType.type_name,
              status: "exists",
            });
            completedOperations++;
            setProgress((completedOperations / totalOperations) * 100);
            continue;
          }

          // Get template generator
          const templateGenerator = defaultTemplates[templateType.type_code];
          if (!templateGenerator) {
            allResults.push({
              company: company.name,
              templateType: templateType.type_name,
              status: "error",
              error: "No template generator found",
            });
            completedOperations++;
            setProgress((completedOperations / totalOperations) * 100);
            continue;
          }

          // Create template
          const htmlContent = templateGenerator();
          const templateName = `${templateDisplayNames[templateType.type_code] || templateType.type_name}`;

          const { error } = await supabase.from("document_templates").insert({
            company_id: company.id,
            template_type_id: templateType.id,
            template_name: templateName,
            template_code: `${company.short_code?.toLowerCase() || company.id.substring(0, 4)}_${templateType.type_code}`,
            html_content: htmlContent,
            css_styles: "",
            is_default: true,
            is_active: true,
            paper_size: "A4",
            orientation: "portrait",
            version: 1,
          });

          if (error) {
            allResults.push({
              company: company.name,
              templateType: templateType.type_name,
              status: "error",
              error: error.message,
            });
          } else {
            allResults.push({
              company: company.name,
              templateType: templateType.type_name,
              status: "created",
            });
          }

          completedOperations++;
          setProgress((completedOperations / totalOperations) * 100);
        }
      }

      setResults(allResults);
      setShowResults(true);

      const created = allResults.filter((r) => r.status === "created").length;
      const existing = allResults.filter((r) => r.status === "exists").length;
      const errors = allResults.filter((r) => r.status === "error").length;

      if (errors === 0) {
        toast.success(`Templates initialized: ${created} created, ${existing} already existed`);
      } else {
        toast.warning(`Templates initialized with ${errors} errors. ${created} created.`);
      }

      onComplete?.();
    } catch (error: any) {
      console.error("Template initialization error:", error);
      toast.error("Failed to initialize templates: " + error.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const createdCount = results.filter((r) => r.status === "created").length;
  const existingCount = results.filter((r) => r.status === "exists").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={isInitializing}>
            <Wand2 className="h-4 w-4 mr-2" />
            Initialize All Templates
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initialize Default Templates?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create professional default templates for all {templateTypes.length} document types 
              across all {companies.length} companies. Existing templates will not be overwritten.
              <br /><br />
              <strong>Total templates to check:</strong> {companies.length * templateTypes.length}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={initializeTemplates}>
              Initialize Templates
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Dialog */}
      {isInitializing && (
        <AlertDialog open={isInitializing}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Initializing Templates...
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progress)}% complete
              </p>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Results Dialog */}
      <AlertDialog open={showResults} onOpenChange={setShowResults}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>Template Initialization Complete</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex gap-4 mt-2">
                <Badge variant="default">
                  <Check className="h-3 w-3 mr-1" />
                  {createdCount} Created
                </Badge>
                <Badge variant="secondary">
                  {existingCount} Already Existed
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errorCount} Errors
                  </Badge>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex-1 overflow-auto">
            <Card className="divide-y max-h-[400px] overflow-auto">
              {results.map((result, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{result.company}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span>{result.templateType}</span>
                  </div>
                  {result.status === "created" && (
                    <Badge variant="default">Created</Badge>
                  )}
                  {result.status === "exists" && (
                    <Badge variant="secondary">Exists</Badge>
                  )}
                  {result.status === "error" && (
                    <Badge variant="destructive" title={result.error}>Error</Badge>
                  )}
                </div>
              ))}
            </Card>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowResults(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
