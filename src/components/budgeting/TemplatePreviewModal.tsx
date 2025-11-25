import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Building, Tag, TrendingUp, TrendingDown, LayoutGrid, Table2 } from "lucide-react";
import { BudgetTemplate } from "@/hooks/useBudgetTemplates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateSpreadsheetView } from "./TemplateSpreadsheetView";
import { useState } from "react";

interface TemplatePreviewModalProps {
  template: BudgetTemplate | null;
  open: boolean;
  onClose: () => void;
  onUseTemplate: (template: BudgetTemplate) => void;
}

export const TemplatePreviewModal = ({
  template,
  open,
  onClose,
  onUseTemplate,
}: TemplatePreviewModalProps) => {
  const [activeTab, setActiveTab] = useState("summary");
  
  if (!template) return null;

  const structure = template.template_structure as any;
  const departments = structure?.departments || [];
  const lineItems = structure?.line_items || [];

  const revenueItems = lineItems.filter((item: any) => item.category === "Revenue");
  const expenseItems = lineItems.filter((item: any) => item.category === "Expense");

  // Group line items by subcategory
  const itemsBySubcategory = lineItems.reduce((acc: any, item: any) => {
    const subcategory = item.subcategory || "Other";
    if (!acc[subcategory]) {
      acc[subcategory] = [];
    }
    acc[subcategory].push(item);
    return acc;
  }, {} as Record<string, typeof lineItems>);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {template?.template_name}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              {template?.industry_type}
            </span>
            <span>•</span>
            <span>{departments.length} Departments</span>
            <span>•</span>
            <span className="font-semibold text-primary">{lineItems.length} Line Items</span>
          </div>
          {template?.description && <p className="text-sm text-muted-foreground mt-2">{template.description}</p>}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="spreadsheet" className="flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              Spreadsheet View
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Departments
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] pr-4">
            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-6 mt-0">
            {/* Departments Section */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Departments ({departments.length})
                </h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {departments.map((dept: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg text-sm bg-muted/20 hover:bg-muted/40 transition-colors">
                      <Tag className="h-3 w-3 text-primary" />
                      <div>
                        <span className="font-medium block">{dept.name}</span>
                        {dept.code && <span className="text-muted-foreground text-xs">Code: {dept.code}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Line Items by Category & Subcategory */}
            <div className="space-y-4">
              {/* Revenue Items */}
              {revenueItems.length > 0 && (
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Revenue ({revenueItems.length} items)
                    </h4>
                  </CardHeader>
                  <CardContent>
                    {Object.entries(itemsBySubcategory)
                      .filter(([_, items]: any) => items.some((item: any) => item.category === "Revenue"))
                      .map(([subcategory, items]: any) => {
                        const subcatItems = items.filter((item: any) => item.category === "Revenue");
                        if (subcatItems.length === 0) return null;
                        return (
                          <div key={subcategory} className="mb-4 last:mb-0">
                            <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">{subcategory}</h5>
                            <div className="grid grid-cols-2 gap-2">
                              {subcatItems.map((item: any, index: number) => (
                                <div
                                  key={index}
                                  className="text-sm flex items-start gap-2 p-2 border rounded bg-green-50/30 hover:bg-green-50/50 transition-colors"
                                >
                                  <div className="flex-1">
                                    <span className="font-medium">{item.name}</span>
                                    <span className="block text-muted-foreground text-xs">{item.department}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              )}

              {/* Expense Items by Subcategory */}
              {expenseItems.length > 0 && (
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Expenses ({expenseItems.length} items)
                    </h4>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(itemsBySubcategory)
                      .filter(([_, items]: any) => items.some((item: any) => item.category === "Expense"))
                      .map(([subcategory, items]: any) => {
                        const subcatItems = items.filter((item: any) => item.category === "Expense");
                        if (subcatItems.length === 0) return null;
                        return (
                          <div key={subcategory} className="border-b pb-4 last:border-b-0">
                            <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase flex items-center gap-2">
                              {subcategory}
                              <span className="text-xs font-normal">({subcatItems.length} items)</span>
                            </h5>
                            <div className="grid grid-cols-2 gap-2">
                              {subcatItems.map((item: any, index: number) => (
                                <div
                                  key={index}
                                  className="text-sm flex items-start gap-2 p-2 border rounded bg-red-50/20 hover:bg-red-50/40 transition-colors"
                                >
                                  <div className="flex-1">
                                    <span className="font-medium">{item.name}</span>
                                    <span className="block text-muted-foreground text-xs">{item.department}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              )}

              {/* Cash Flow Items */}
              {Object.entries(itemsBySubcategory).some(
                ([_, items]: any) => items.some((item: any) => item.category === "Cash Flow")
              ) && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <h4 className="text-sm font-semibold text-blue-700">Cash Flow Items</h4>
                  </CardHeader>
                  <CardContent>
                    {Object.entries(itemsBySubcategory)
                      .filter(([_, items]: any) => items.some((item: any) => item.category === "Cash Flow"))
                      .map(([subcategory, items]: any) => {
                        const subcatItems = items.filter((item: any) => item.category === "Cash Flow");
                        if (subcatItems.length === 0) return null;
                        return (
                          <div key={subcategory} className="mb-3 last:mb-0">
                            <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">{subcategory}</h5>
                            <div className="space-y-1">
                              {subcatItems.map((item: any, index: number) => (
                                <div
                                  key={index}
                                  className="text-sm flex items-start gap-2 p-2 border rounded bg-blue-50/20"
                                >
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-muted-foreground text-xs ml-auto">{item.department}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              )}
            </div>
            </TabsContent>

            {/* Spreadsheet View Tab */}
            <TabsContent value="spreadsheet" className="mt-0">
              <TemplateSpreadsheetView lineItems={lineItems} />
            </TabsContent>

            {/* Departments Tab */}
            <TabsContent value="departments" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 gap-4">
                {departments.map((dept: any, index: number) => {
                  const deptItems = lineItems.filter((item: any) => item.department === dept.name);
                  const revenueCount = deptItems.filter((item: any) => item.category === "Revenue").length;
                  const expenseCount = deptItems.filter((item: any) => item.category === "Expense").length;
                  
                  return (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              {dept.name}
                            </h3>
                            {dept.code && <p className="text-sm text-muted-foreground">Code: {dept.code}</p>}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{deptItems.length}</div>
                            <div className="text-xs text-muted-foreground">Line Items</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="text-2xl font-bold text-emerald-700">{revenueCount}</div>
                            <div className="text-xs text-emerald-600">Revenue Items</div>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="text-2xl font-bold text-red-700">{expenseCount}</div>
                            <div className="text-xs text-red-600">Expense Items</div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {deptItems.slice(0, 5).map((item: any, idx: number) => (
                            <div key={idx} className="text-sm p-2 border rounded bg-muted/30 flex items-center gap-2">
                              {item.account_code && (
                                <span className="font-mono text-xs text-muted-foreground px-2 py-0.5 bg-background rounded">
                                  {item.account_code}
                                </span>
                              )}
                              <span className="flex-1">{item.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                item.category === 'Revenue' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {item.category}
                              </span>
                            </div>
                          ))}
                          {deptItems.length > 5 && (
                            <div className="text-xs text-center text-muted-foreground py-2">
                              + {deptItems.length - 5} more items
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onUseTemplate(template)} className="bg-gradient-to-r from-blue-600 to-purple-600">
            Use This Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
