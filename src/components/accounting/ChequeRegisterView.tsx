import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, CheckCircle, XCircle, Clock, Check, X, Send, Printer, ArrowDownUp } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChequeRegister } from "@/hooks/useAccountingData";
import { useUpdateChequeStatus } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { ChequeIssueForm } from "./ChequeIssueForm";
import { ChequePrintPreview } from "./ChequePrintPreview";
import { ChequeBookManagement } from "./ChequeBookManagement";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookOpen, ChevronDown } from "lucide-react";

export const ChequeRegisterView = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [chequeTypeFilter, setChequeTypeFilter] = useState<string>("all");
  const [showChequeForm, setShowChequeForm] = useState(false);
  const [printCheque, setPrintCheque] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);
  
  const { data: cheques, isLoading } = useChequeRegister(statusFilter);
  const updateChequeStatus = useUpdateChequeStatus();
  const { toast } = useToast();

  // Filter by cheque type
  const filteredCheques = cheques?.filter(c => {
    if (chequeTypeFilter === "all") return true;
    const type = (c as any).cheque_type || "outgoing";
    return type === chequeTypeFilter;
  }) || [];

  const handleStatusUpdate = async (chequeId: string, newStatus: string, clearedDate?: string) => {
    try {
      await updateChequeStatus.mutateAsync({
        chequeId,
        status: newStatus,
        clearedDate,
      });
      toast({
        title: "Status Updated",
        description: `Cheque status changed to ${newStatus.replace('_', ' ')}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cheque status.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = (cheque: any) => {
    setPrintCheque({
      cheque_number: cheque.cheque_number,
      cheque_date: cheque.cheque_date,
      payee: cheque.payee_name || cheque.payee,
      amount: cheque.amount,
      bank_account_name: cheque.bank_account_name,
      memo: (cheque as any).memo,
      reference: (cheque as any).reference,
    });
    setShowPrint(true);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      draft: { variant: "outline", icon: FileText },
      issued: { variant: "outline", icon: Clock },
      presented: { variant: "secondary", icon: FileText },
      cleared: { variant: "default", icon: CheckCircle },
      completed: { variant: "default", icon: CheckCircle },
      bounced: { variant: "destructive", icon: XCircle },
      cancelled: { variant: "destructive", icon: XCircle },
      post_dated: { variant: "outline", icon: Clock },
    };
    const { variant, icon: Icon } = config[status] || config.draft;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status?.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getChequeTypeBadge = (cheque: any) => {
    const type = cheque.cheque_type || "outgoing";
    return (
      <Badge variant={type === "incoming" ? "default" : "secondary"}>
        {type === "incoming" ? "AR (In)" : "AP (Out)"}
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
      id: "cheque_type",
      header: "Type",
      cell: ({ row }: any) => getChequeTypeBadge(row.original),
    },
    {
      accessorKey: "cheque_date",
      header: "Cheque Date",
      cell: ({ row }: any) => format(new Date(row.original.cheque_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "payee_name",
      header: "Payee / Payer",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.payee_name || row.original.payee}</p>
          <p className="text-xs text-muted-foreground">{(row.original as any).reference || ""}</p>
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
      cell: ({ row }: any) => {
        const status = row.original.status;
        const chequeId = row.original.id;
        const chequeType = (row.original as any).cheque_type || "outgoing";
        
        return (
          <div className="flex gap-1">
            {/* Print button for outgoing cheques */}
            {chequeType === "outgoing" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrint(row.original)}
                title="Print Cheque"
              >
                <Printer className="h-3 w-3" />
              </Button>
            )}

            {/* Draft -> Issue */}
            {status === "draft" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate(chequeId, "issued")}
                disabled={updateChequeStatus.isPending}
                title="Issue"
              >
                <Send className="h-3 w-3" />
              </Button>
            )}
            
            {(status === "issued" || status === "post_dated") && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStatusUpdate(chequeId, "presented")}
                  disabled={updateChequeStatus.isPending}
                  title="Present"
                >
                  <Send className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStatusUpdate(chequeId, "cleared", new Date().toISOString().split("T")[0])}
                  disabled={updateChequeStatus.isPending}
                  title="Mark Cleared"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleStatusUpdate(chequeId, "bounced")}
                  disabled={updateChequeStatus.isPending}
                  title="Bounce"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
            
            {status === "presented" && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStatusUpdate(chequeId, "cleared", new Date().toISOString().split("T")[0])}
                  disabled={updateChequeStatus.isPending}
                  title="Mark Cleared"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleStatusUpdate(chequeId, "bounced")}
                  disabled={updateChequeStatus.isPending}
                  title="Bounce"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}

            {/* Mark completed for cleared cheques */}
            {status === "cleared" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate(chequeId, "completed")}
                disabled={updateChequeStatus.isPending}
                title="Mark Completed"
              >
                <CheckCircle className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const draftCount = filteredCheques.filter(c => c.status === "draft").length;
  const issuedCount = filteredCheques.filter(c => c.status === "issued").length;
  const postDatedCount = filteredCheques.filter(c => c.status === "post_dated").length;
  const clearedCount = filteredCheques.filter(c => c.status === "cleared").length;
  const bouncedCount = filteredCheques.filter(c => c.status === "bounced").length;

  const totalOutgoing = cheques
    ?.filter(c => ((c as any).cheque_type || "outgoing") === "outgoing" && c.status !== "cancelled")
    .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
  const totalIncoming = cheques
    ?.filter(c => (c as any).cheque_type === "incoming" && c.status !== "cancelled")
    .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cheque Register</h2>
          <p className="text-sm text-muted-foreground">
            Track issued, post-dated, incoming and cleared cheques
          </p>
        </div>
        <Button onClick={() => setShowChequeForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Cheque
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Draft</p>
              <h3 className="text-2xl font-bold mt-1">{draftCount}</h3>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Issued (Pending)</p>
              <h3 className="text-2xl font-bold mt-1">{issuedCount}</h3>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Post-Dated</p>
              <h3 className="text-2xl font-bold mt-1">{postDatedCount}</h3>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Outgoing (AP)</p>
              <h3 className="text-xl font-bold mt-1">
                <CurrencyDisplay amount={totalOutgoing} />
              </h3>
            </div>
            <ArrowDownUp className="h-8 w-8 text-destructive" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Incoming (AR)</p>
              <h3 className="text-xl font-bold text-green-600 mt-1">
                <CurrencyDisplay amount={totalIncoming} />
              </h3>
            </div>
            <ArrowDownUp className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Cheque Type Filter */}
      <div className="flex gap-2">
        <Button
          variant={chequeTypeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setChequeTypeFilter("all")}
        >
          All Types
        </Button>
        <Button
          variant={chequeTypeFilter === "outgoing" ? "default" : "outline"}
          size="sm"
          onClick={() => setChequeTypeFilter("outgoing")}
        >
          Outgoing (AP)
        </Button>
        <Button
          variant={chequeTypeFilter === "incoming" ? "default" : "outline"}
          size="sm"
          onClick={() => setChequeTypeFilter("incoming")}
        >
          Incoming (AR)
        </Button>
      </div>

      {/* Cheque Table */}
      <Card className="p-6">
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setStatusFilter(undefined)}>
              All Cheques
            </TabsTrigger>
            <TabsTrigger value="draft" onClick={() => setStatusFilter("draft")}>
              Draft ({draftCount})
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

          {["all", "draft", "issued", "post_dated", "cleared", "bounced"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <DataTable
                columns={columns}
                data={filteredCheques}
                searchKey="cheque_number"
              />
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* Forms */}
      <ChequeIssueForm open={showChequeForm} onOpenChange={setShowChequeForm} />
      <ChequePrintPreview open={showPrint} onOpenChange={setShowPrint} cheque={printCheque} />
    </div>
  );
};
