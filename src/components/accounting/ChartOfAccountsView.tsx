import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, TreePine, List } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChartOfAccountsUpload } from "./ChartOfAccountsUpload";
import { ChartOfAccountsTree } from "./ChartOfAccountsTree";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ChartOfAccountsView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");

  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .order("account_code");
      
      if (error) throw error;
      return data;
    },
  });

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
    {
      accessorKey: "account_code",
      header: "Code",
    },
    {
      accessorKey: "account_name",
      header: "Account Name",
    },
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
          <Button size="sm" variant="outline">
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Chart of Accounts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization's account structure ({accounts?.length || 0} accounts)
          </p>
        </div>
        <div className="flex gap-2">
          <ChartOfAccountsUpload onUploadComplete={refetch} />
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Input
          placeholder="Search accounts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
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
        <ChartOfAccountsTree accounts={accounts || []} searchTerm={searchTerm} />
      ) : (
        <DataTable
          columns={columns}
          data={accounts || []}
          searchKey="account_name"
        />
      )}
    </Card>
  );
};
