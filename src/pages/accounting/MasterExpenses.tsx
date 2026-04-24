import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MasterExpenseUploader } from "@/components/accounting/expenses/MasterExpenseUploader";
import { ExpenseMappingGrid } from "@/components/accounting/expenses/ExpenseMappingGrid";
import { useMasterExpenses, MasterExpenseImport } from "@/hooks/useMasterExpenses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FolderTree, FileSpreadsheet, PlusCircle, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function MasterExpenses() {
  const { imports, isLoadingImports } = useMasterExpenses();
  const [selectedImport, setSelectedImport] = useState<MasterExpenseImport | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  // Group imports by Sector and then by Expense Type
  const groupedImports = imports.reduce((acc, imp) => {
    if (!acc[imp.sector]) acc[imp.sector] = {};
    if (!acc[imp.sector][imp.expense_type]) acc[imp.sector][imp.expense_type] = [];
    acc[imp.sector][imp.expense_type].push(imp);
    return acc;
  }, {} as Record<string, Record<string, MasterExpenseImport[]>>);

  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto h-[calc(100vh-60px)] flex flex-col space-y-4">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FolderTree className="h-8 w-8 text-primary" />
              Master Expenses Archive
            </h1>
            <p className="text-muted-foreground mt-1">
              Centralized repository for external expense sheets, intelligent mapping, and historical tracking.
            </p>
          </div>
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* LEFT PANE: File Tree */}
          <div className="w-[350px] shrink-0 flex flex-col gap-4">
             <Card className="flex-1 flex flex-col shadow-sm border-primary/10">
               <CardHeader className="py-4 border-b bg-muted/30">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-base flex items-center gap-2">
                     <FileSpreadsheet className="h-4 w-4" /> Expense Files
                   </CardTitle>
                   <button 
                     onClick={() => { setShowUploader(true); setSelectedImport(null); }}
                     className="text-primary hover:text-primary/80 transition-colors"
                     title="Upload New File"
                   >
                     <PlusCircle className="h-5 w-5" />
                   </button>
                 </div>
               </CardHeader>
               <CardContent className="p-0 flex-1 overflow-auto">
                 {isLoadingImports ? (
                   <div className="p-8 text-center text-muted-foreground">Loading files...</div>
                 ) : imports.length === 0 ? (
                   <div className="p-8 text-center text-muted-foreground text-sm">
                     No expense files uploaded yet.<br/>Click the + icon to start.
                   </div>
                 ) : (
                   <div className="p-3 space-y-4">
                     {Object.entries(groupedImports).map(([sector, types]) => (
                       <div key={sector} className="space-y-2">
                         <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">{sector}</div>
                         {Object.entries(types).map(([type, files]) => (
                           <div key={`${sector}-${type}`} className="space-y-1 pl-2 border-l-2 border-primary/10 ml-2">
                             <div className="text-sm font-semibold text-foreground/80 pl-2 mb-1 flex items-center gap-2">
                               {type}
                               <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{files.length}</Badge>
                             </div>
                             {files.map(file => (
                               <div 
                                 key={file.id}
                                 onClick={() => { setSelectedImport(file); setShowUploader(false); }}
                                 className={`
                                   pl-4 pr-2 py-2 ml-1 rounded-md cursor-pointer text-sm transition-all group border border-transparent
                                   ${selectedImport?.id === file.id 
                                     ? 'bg-primary/10 border-primary/20 text-primary font-medium' 
                                     : 'hover:bg-muted text-muted-foreground hover:text-foreground'}
                                 `}
                               >
                                 <div className="flex items-start justify-between gap-2">
                                    <span className="truncate flex-1" title={file.file_name}>{file.file_name}</span>
                                    {file.status === 'Completed' ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                    ) : (
                                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                                    )}
                                 </div>
                                 <div className="flex items-center justify-between mt-1 text-[10px] opacity-70">
                                   <span>{format(new Date(file.upload_date), "MMM d, yyyy")}</span>
                                   <span>Rs {Number(file.total_amount).toLocaleString()}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                         ))}
                       </div>
                     ))}
                   </div>
                 )}
               </CardContent>
             </Card>
          </div>

          {/* RIGHT PANE: Uploader or Data Grid */}
          <div className="flex-1 flex flex-col min-w-0">
             <Card className="flex-1 flex flex-col shadow-sm border-primary/10 h-full overflow-hidden">
               {showUploader ? (
                 <MasterExpenseUploader onSuccess={(imp) => {
                   setShowUploader(false);
                   setSelectedImport(imp);
                 }} />
               ) : selectedImport ? (
                 <ExpenseMappingGrid importData={selectedImport} />
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12">
                   <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                     <FolderTree className="h-10 w-10 text-primary/40" />
                   </div>
                   <h3 className="text-xl font-medium text-foreground mb-2">Master Expenses Archive</h3>
                   <p className="text-center max-w-md">
                     Select an uploaded file from the tree on the left to view and map its records, or click the + icon to upload a new PickMe or Fuel Excel sheet.
                   </p>
                   <Button variant="outline" className="mt-6" onClick={() => setShowUploader(true)}>
                     Upload New Sheet
                   </Button>
                 </div>
               )}
             </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
