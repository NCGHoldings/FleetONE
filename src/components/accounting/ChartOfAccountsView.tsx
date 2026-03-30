import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, TreePine, List, AlertCircle, Building2, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChartOfAccountsUpload } from "./ChartOfAccountsUpload";
import { ChartOfAccountsTree } from "./ChartOfAccountsTree";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/contexts/CompanyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AccountForm } from "./AccountForm";
import { AccountEditForm } from "./AccountEditForm";

export const ChartOfAccountsView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const { selectedCompanyId, selectedCompany, getEffectiveCompanyId, isSubCompanyOfNCGHolding } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const isConsolidated = selectedCompanyId ? isSubCompanyOfNCGHolding(selectedCompanyId) : false;

  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ["chart-of-accounts", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .order("account_code");
      
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });

  const filteredAccounts = useMemo(() => {
    if (!accounts || !searchTerm.trim()) return accounts || [];
    const query = searchTerm.toLowerCase();
    return accounts.filter((acc) =>
      acc.account_code?.toLowerCase().includes(query) ||
      acc.account_name?.toLowerCase().includes(query) ||
      acc.account_type?.toLowerCase().includes(query) ||
      acc.gl_code?.toLowerCase().includes(query)
    );
  }, [accounts, searchTerm]);

  const getAccountTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      asset: "default",
      liability: "destructive",
      equity: "secondary",
      revenue: "outline",
      expense: "outline",
    };
    return <Badge variant={variants[type] || "default"}>{type.toUpperCase()}</Badge>;
  };

  const columns = [
    { accessorKey: "account_code", header: "Code" },
    { accessorKey: "account_name", header: "Account Name" },
    {
      accessorKey: "account_type",
      header: "Type",
      cell: ({ row }: any) => getAccountTypeBadge(row.original.account_type),
    },
    {
      accessorKey: "current_balance",
      header: "Balance",
      cell: ({ row }: any) => {
        const balance = row.original.current_balance || 0;
        return (
          <span className={balance < 0 ? "text-destructive" : ""}>
            LKR {balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditingAccount(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // No company selected state
  if (!selectedCompanyId) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Company Selected</h3>
          <p className="text-muted-foreground mt-2">
            Please select a company from the dropdown to view its Chart of Accounts
          </p>
        </div>
      </Card>
    );
  }

  // Empty COA
  if (!isLoading && (!accounts || accounts.length === 0)) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Chart of Accounts</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedCompany?.name}{isConsolidated ? ' (Consolidated — NCG Holding COA)' : ''} - No accounts configured
            </p>
          </div>
          <div className="flex gap-2">
            <ChartOfAccountsUpload onUploadComplete={refetch} companyId={effectiveCompanyId!} />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Chart of Accounts</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            {selectedCompany?.name} doesn't have a Chart of Accounts yet. 
            Upload an Excel file to initialize the account structure.
          </p>
          <ChartOfAccountsUpload onUploadComplete={refetch} companyId={effectiveCompanyId!} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Chart of Accounts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedCompany?.name}{isConsolidated ? ' (Consolidated — NCG Holding COA)' : ''} - {accounts?.length || 0} accounts
          </p>
        </div>
        <div className="flex gap-2">
          <ChartOfAccountsUpload onUploadComplete={refetch} companyId={effectiveCompanyId!} />
          <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
              </DialogHeader>
              <AccountForm onSuccess={() => {
                setShowAccountForm(false);
                refetch();
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "tree" | "table")}>
          <TabsList>
            <TabsTrigger value="tree" className="flex items-center gap-1">
              <TreePine className="h-4 w-4" />
              Tree
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-1">
              <List className="h-4 w-4" />
              Table
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "tree" ? (
        <ChartOfAccountsTree accounts={accounts || []} allAccounts={accounts || []} searchTerm={searchTerm} onAccountCreated={refetch} />
      ) : (
        <DataTable columns={columns} data={filteredAccounts} />
      )}

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => { if (!open) setEditingAccount(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <AccountEditForm
              account={editingAccount}
              onSuccess={() => {
                setEditingAccount(null);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
