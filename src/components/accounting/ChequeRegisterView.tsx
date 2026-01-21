import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChequeRegister } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";

export const ChequeRegisterView = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data: cheques, isLoading } = useChequeRegister(statusFilter);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      issued: { variant: "outline", icon: Clock },
      presented: { variant: "secondary", icon: FileText },
      cleared: { variant: "default", icon: CheckCircle },
      bounced: { variant: "destructive", icon: XCircle },
      cancelled: { variant: "destructive", icon: XCircle },
      post_dated: { variant: "outline", icon: Clock },
    };
    const { variant, icon: Icon } = config[status] || config.issued;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status?.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const columns = [
    {
      accessorKey: "cheque_number",
      header: "Cheque #",
      cell: ({ row }: any) => (
        <span className="font-mono font-medium">{row.original.cheque_number}</span>
      ),
    },
    {
      accessorKey: "cheque_date",
      header: "Cheque Date",
      cell: ({ row }: any) => format(new Date(row.original.cheque_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "payee_name",
      header: "Payee",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.payee_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.reference}</p>
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.amount || 0} />
        </span>
      ),
    },
    {
      accessorKey: "bank_account_name",
      header: "Bank Account",
      cell: ({ row }: any) => row.original.bank_account_name || "N/A",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "cleared_date",
      header: "Cleared Date",
      cell: ({ row }: any) => 
        row.original.cleared_date 
          ? format(new Date(row.original.cleared_date), "MMM dd, yyyy")
          : "-",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          {row.original.status === "issued" && (
            <>
              <Button size="sm" variant="outline">
                Mark Cleared
              </Button>
              <Button size="sm" variant="destructive">
                Bounce
              </Button>
            </>
          )}
          {row.original.status === "post_dated" && (
            <Button size="sm" variant="outline">
              Present
            </Button>
          )}
        </div>
      ),
    },
  ];

  const issuedCount = cheques?.filter(c => c.status === "issued").length || 0;
  const postDatedCount = cheques?.filter(c => c.status === "post_dated").length || 0;
  const clearedCount = cheques?.filter(c => c.status === "cleared").length || 0;
  const bouncedCount = cheques?.filter(c => c.status === "bounced").length || 0;

  const totalIssued = cheques
    ?.filter(c => c.status === "issued")
    .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
  const totalPostDated = cheques
    ?.filter(c => c.status === "post_dated")
    .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cheque Register</h2>
          <p className="text-sm text-muted-foreground">
            Track issued, post-dated, and cleared cheques
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Issue Cheque
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Issued (Pending)</p>
              <h3 className="text-2xl font-bold mt-1">{issuedCount}</h3>
              <p className="text-sm text-muted-foreground">
                <CurrencyDisplay amount={totalIssued} />
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Post-Dated</p>
              <h3 className="text-2xl font-bold mt-1">{postDatedCount}</h3>
              <p className="text-sm text-muted-foreground">
                <CurrencyDisplay amount={totalPostDated} />
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cleared</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">{clearedCount}</h3>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bounced</p>
              <h3 className="text-2xl font-bold text-destructive mt-1">{bouncedCount}</h3>
            </div>
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
        </Card>
      </div>

      {/* Cheque Table */}
      <Card className="p-6">
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setStatusFilter(undefined)}>
              All Cheques
            </TabsTrigger>
            <TabsTrigger value="issued" onClick={() => setStatusFilter("issued")}>
              Issued
            </TabsTrigger>
            <TabsTrigger value="post_dated" onClick={() => setStatusFilter("post_dated")}>
              Post-Dated
            </TabsTrigger>
            <TabsTrigger value="cleared" onClick={() => setStatusFilter("cleared")}>
              Cleared
            </TabsTrigger>
            <TabsTrigger value="bounced" onClick={() => setStatusFilter("bounced")}>
              Bounced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <DataTable
              columns={columns}
              data={cheques || []}
              searchKey="cheque_number"
            />
          </TabsContent>
          <TabsContent value="issued">
            <DataTable columns={columns} data={cheques || []} searchKey="cheque_number" />
          </TabsContent>
          <TabsContent value="post_dated">
            <DataTable columns={columns} data={cheques || []} searchKey="cheque_number" />
          </TabsContent>
          <TabsContent value="cleared">
            <DataTable columns={columns} data={cheques || []} searchKey="cheque_number" />
          </TabsContent>
          <TabsContent value="bounced">
            <DataTable columns={columns} data={cheques || []} searchKey="cheque_number" />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
