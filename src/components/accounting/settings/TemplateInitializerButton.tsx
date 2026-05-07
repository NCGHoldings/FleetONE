import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Wand2, Check, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { defaultTemplates, sphTemplateOverrides, templateDisplayNames } from "@/lib/document-template-seeder";
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
  status: "created" | "updated" | "exists" | "error";
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [mode, setMode] = useState<"init" | "replace">("init");

  const initializeTemplates = async (forceReplace: boolean) => {
    setShowConfirm(false);
    setIsInitializing(true);
    setProgress(0);
    setResults([]);

    const allResults: InitResult[] = [];

    // Filter to only template types that have a generator in the seeder
    const supportedTypes = templateTypes.filter(
      (tt) => defaultTemplates[tt.type_code]
    );
    const totalOperations = companies.length * supportedTypes.length;
    let completedOperations = 0;

    try {
      // Get existing templates
      const { data: existingTemplates } = await supabase
        .from("document_templates")
        .select("id, company_id, template_type_id");

      const existingMap = new Map<string, string>();
      existingTemplates?.forEach((t) => {
        existingMap.set(`${t.company_id}-${t.template_type_id}`, t.id);
      });

      for (const company of companies) {
        for (const templateType of supportedTypes) {
          const key = `${company.id}-${templateType.id}`;
          const existingId = existingMap.get(key);

          // Get template generator — use SPH override for SPH companies
          const isSPH = company.short_code === 'SPH';
          const templateGenerator = (isSPH && sphTemplateOverrides[templateType.type_code]) || defaultTemplates[templateType.type_code];

          const htmlContent = templateGenerator();
          const templateName = `${templateDisplayNames[templateType.type_code] || templateType.type_name}`;

          if (existingId && forceReplace) {
            // UPDATE existing template with new layout
            const { error } = await supabase
              .from("document_templates")
              .update({
                html_content: htmlContent,
                template_name: templateName,
                version: 1,
              })
              .eq("id", existingId);

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
                status: "updated",
              });
            }
          } else if (existingId && !forceReplace) {
            // Skip existing
            allResults.push({
              company: company.name,
              templateType: templateType.type_name,
              status: "exists",
            });
          } else {
            // INSERT new template
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
          }

          completedOperations++;
          setProgress((completedOperations / totalOperations) * 100);
        }
      }

      setResults(allResults);
      setShowResults(true);

      const created = allResults.filter((r) => r.status === "created").length;
      const updated = allResults.filter((r) => r.status === "updated").length;
      const existing = allResults.filter((r) => r.status === "exists").length;
      const errors = allResults.filter((r) => r.status === "error").length;

      if (errors === 0) {
        toast.success(`Templates: ${created} created, ${updated} updated, ${existing} unchanged`);
      } else {
        toast.warning(`Templates done with ${errors} errors. ${created} created, ${updated} updated.`);
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
  const updatedCount = results.filter((r) => r.status === "updated").length;
  const existingCount = results.filter((r) => r.status === "exists").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <>
      <div className="flex gap-2">
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
              <AlertDialogAction onClick={() => { setMode("init"); initializeTemplates(false); }}>
                Initialize Templates
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isInitializing} onClick={() => { setMode("replace"); setShowConfirm(true); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Replace All Templates
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ Replace ALL Templates?</AlertDialogTitle>
              <AlertDialogDescription>
                This will <strong>overwrite all existing templates</strong> with the latest professional layout 
                for all {templateTypes.length} document types across all {companies.length} companies.
                <br /><br />
                Any custom edits you have made to templates will be <strong>permanently lost</strong>.
                <br /><br />
                <strong>Total templates to update:</strong> {companies.length * templateTypes.length}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => initializeTemplates(true)}>
                Yes, Replace All Templates
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button 
          variant="outline" 
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 font-medium"
          disabled={isInitializing} 
          onClick={async () => {
            setIsInitializing(true);
            setProgress(0);
            
            const apType = templateTypes.find(t => t.type_code === 'ap_payment_voucher');
            if (!apType) return;
            
            const templateGenerator = defaultTemplates['ap_payment_voucher'];
            const htmlContent = templateGenerator();
            
            let completed = 0;
            for (const company of companies) {
              const { data: existing } = await supabase
                .from('document_templates')
                .select('id')
                .eq('company_id', company.id)
                .eq('template_type_id', apType.id)
                .single();
                
              if (existing) {
                await supabase.from('document_templates').update({ html_content: htmlContent }).eq('id', existing.id);
              } else {
                await supabase.from('document_templates').insert({
                  company_id: company.id,
                  template_type_id: apType.id,
                  template_name: templateDisplayNames['ap_payment_voucher'] || apType.type_name,
                  template_code: `${company.short_code?.toLowerCase() || company.id.substring(0, 4)}_ap_payment_voucher`,
                  html_content: htmlContent,
                  css_styles: "",
                  is_default: true,
                  is_active: true,
                  paper_size: "A4",
                  orientation: "portrait",
                  version: 1,
                });
              }
              completed++;
              setProgress((completed / companies.length) * 100);
            }
            setIsInitializing(false);
            toast.success("Successfully updated ONLY AP Payment Vouchers for all companies!");
            onComplete?.();
          }}
        >
          <Wand2 className="h-4 w-4 mr-2 text-green-600" />
          Update Only AP Vouchers (Safe)
        </Button>

        {/* SPH-Only Update Button — ONLY updates AR Invoice + AR Receipt for the SPH company */}
        <Button 
          variant="outline" 
          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-medium"
          disabled={isInitializing} 
          onClick={async () => {
            setIsInitializing(true);
            setProgress(0);
            
            // Find the SPH company
            const sphCompany = companies.find(c => c.short_code === 'SPH');
            if (!sphCompany) {
              toast.error("SPH (Special Hire) company not found. Please check company settings.");
              setIsInitializing(false);
              return;
            }
            
            // Target only ar_invoice, ar_receipt, and sph_quotation
            const sphTypeCodes = ['ar_invoice', 'ar_receipt', 'sph_invoice', 'sph_receipt', 'sph_quotation'];
            const sphTypes = templateTypes.filter(t => sphTypeCodes.includes(t.type_code));
            
            if (sphTypes.length === 0) {
              toast.error("AR Invoice / AR Receipt template types not found.");
              setIsInitializing(false);
              return;
            }
            
            let completed = 0;
            const totalOps = sphTypes.length;
            
            for (const templateType of sphTypes) {
              const templateGenerator = sphTemplateOverrides[templateType.type_code];
              if (!templateGenerator) continue;
              
              const htmlContent = templateGenerator();
              const templateName = `SPH — ${templateDisplayNames[templateType.type_code] || templateType.type_name}`;
              
              const { data: existing } = await supabase
                .from('document_templates')
                .select('id')
                .eq('company_id', sphCompany.id)
                .eq('template_type_id', templateType.id)
                .single();
              
              if (existing) {
                await supabase.from('document_templates').update({ 
                  html_content: htmlContent,
                  template_name: templateName,
                }).eq('id', existing.id);
              } else {
                await supabase.from('document_templates').insert({
                  company_id: sphCompany.id,
                  template_type_id: templateType.id,
                  template_name: templateName,
                  template_code: `sph_${templateType.type_code}`,
                  html_content: htmlContent,
                  css_styles: "",
                  is_default: true,
                  is_active: true,
                  paper_size: "A4",
                  orientation: "portrait",
                  version: 1,
                });
              }
              completed++;
              setProgress((completed / totalOps) * 100);
            }
            
            setIsInitializing(false);
            toast.success(`Updated SPH templates: Invoice, Receipt & Quotation for ${sphCompany.name}`);
            onComplete?.();
          }}
        >
          <Wand2 className="h-4 w-4 mr-2 text-blue-600" />
          Update SPH Templates Only (Safe)
        </Button>
      </div>

      {/* Progress Dialog */}
      {isInitializing && (
        <AlertDialog open={isInitializing}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {mode === "replace" ? "Replacing Templates..." : "Initializing Templates..."}
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
            <AlertDialogTitle>Template {mode === "replace" ? "Replacement" : "Initialization"} Complete</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex gap-4 mt-2 flex-wrap">
                {createdCount > 0 && (
                  <Badge variant="default">
                    <Check className="h-3 w-3 mr-1" />
                    {createdCount} Created
                  </Badge>
                )}
                {updatedCount > 0 && (
                  <Badge className="bg-blue-600">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {updatedCount} Updated
                  </Badge>
                )}
                {existingCount > 0 && (
                  <Badge variant="secondary">
                    {existingCount} Unchanged
                  </Badge>
                )}
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
                  {result.status === "updated" && (
                    <Badge className="bg-blue-600">Updated</Badge>
                  )}
                  {result.status === "exists" && (
                    <Badge variant="secondary">Unchanged</Badge>
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
