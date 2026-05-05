import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, History, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuditLogs, useJournalEntries } from "@/hooks/useAccountingData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const AuditReportsView = () => {
  const [searchTable, setSearchTable] = useState<string | undefined>();
  const { data: auditLogs } = useAuditLogs(searchTable);
  const { data: journalEntries } = useJournalEntries();

  const auditColumns = [
    {
      accessorKey: "changed_at",
      header: "Date/Time",
      cell: ({ row }: any) => format(new Date(row.original.changed_at), "MMM dd, yyyy HH:mm"),
    },
    {
      accessorKey: "table_name",
      header: "Table",
      cell: ({ row }: any) => <Badge variant="outline">{row.original.table_name}</Badge>,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }: any) => {
        const action = row.original.action;
        const variants: Record<string, "default" | "secondary" | "destructive"> = {
          INSERT: "default",
          UPDATE: "secondary",
          DELETE: "destructive",
        };
        return <Badge variant={variants[action] || "default"}>{action}</Badge>;
      },
    },
    {
      accessorKey: "record_id",
      header: "Record ID",
      cell: ({ row }: any) => (
        <span className="font-mono text-xs">{row.original.record_id?.substring(0, 8)}...</span>
      ),
    },
    {
      accessorKey: "changed_by",
      header: "Changed By",
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.changed_by?.substring(0, 8) || "System"}...</span>
      ),
    },
    {
      accessorKey: "old_values",
      header: "Changes",
      cell: ({ row }: any) => {
        const old = row.original.old_values;
        const newVal = row.original.new_values;
        const changeCount = newVal ? Object.keys(newVal).length : 0;
        return <span className="text-sm text-muted-foreground">{changeCount} field(s) changed</span>;
      },
    },
  ];

  // Trial Balance calculation from Chart of Accounts
  const generateTrialBalance = () => {
    // This would typically come from a dedicated hook/query
    return [];
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="trialbalance">Trial Balance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Audit Trail</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete history of all accounting changes
                </p>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by table..."
                    className="pl-9 w-48"
                    value={searchTable || ""}
                    onChange={(e) => setSearchTable(e.target.value || undefined)}
                  />
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <DataTable enableColumnFilters columns={auditColumns} data={auditLogs || []} searchKey="table_name" />
          </Card>
        </TabsContent>

        <TabsContent value="trialbalance">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Trial Balance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Summary of all account balances
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>

            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Trial Balance report</p>
              <p className="text-sm">View in Financial Statements tab for full report</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6 hover:border-primary cursor-pointer transition-colors">
              <div className="flex items-start gap-4">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <h3 className="font-semibold">General Ledger</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete ledger with all transactions
                  </p>
                  <Button variant="link" className="px-0 mt-2">Generate Report →</Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:border-primary cursor-pointer transition-colors">
              <div className="flex items-start gap-4">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <h3 className="font-semibold">Journal Register</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    All journal entries for a period
                  </p>
                  <Button variant="link" className="px-0 mt-2">Generate Report →</Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:border-primary cursor-pointer transition-colors">
              <div className="flex items-start gap-4">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <h3 className="font-semibold">AR Ageing Report</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customer ageing by bucket
                  </p>
                  <Button variant="link" className="px-0 mt-2">Generate Report →</Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:border-primary cursor-pointer transition-colors">
              <div className="flex items-start gap-4">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <h3 className="font-semibold">AP Ageing Report</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vendor ageing by bucket
                  </p>
                  <Button variant="link" className="px-0 mt-2">Generate Report →</Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:border-primary cursor-pointer transition-colors">
              <div className="flex items-start gap-4">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <h3 className="font-semibold">Bank Statement</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bank transactions summary
                  </p>
                  <Button variant="link" className="px-0 mt-2">Generate Report →</Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:border-primary cursor-pointer transition-colors">
              <div className="flex items-start gap-4">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <h3 className="font-semibold">Fixed Asset Register</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete asset listing
                  </p>
                  <Button variant="link" className="px-0 mt-2">Generate Report →</Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
