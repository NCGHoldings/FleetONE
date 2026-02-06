import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FileText } from "lucide-react";
import { useInterBankTransfers } from "@/hooks/useInterBankTransfer";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Skeleton } from "@/components/ui/skeleton";

export function InterBankTransferList() {
  const { data: transfers, isLoading } = useInterBankTransfers();

  const columns = [
    {
      accessorKey: "transfer_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.transfer_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "transfer_number",
      header: "Transfer #",
      cell: ({ row }: any) => (
        <span className="font-mono text-sm">{row.original.transfer_number}</span>
      ),
    },
    {
      accessorKey: "from_bank",
      header: "From",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.from_bank?.account_name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {row.original.from_bank?.account_number}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "direction",
      header: "",
      cell: () => <ArrowRight className="h-4 w-4 text-muted-foreground" />,
    },
    {
      accessorKey: "to_bank",
      header: "To",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.to_bank?.account_name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {row.original.to_bank?.account_number}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.amount} />
        </span>
      ),
    },
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.reference || "-"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === "completed" ? "default" : "outline"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "journal_entry",
      header: "JE",
      cell: ({ row }: any) => (
        row.original.journal_entry ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            {row.original.journal_entry.entry_number}
          </div>
        ) : (
          "-"
        )
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer History</CardTitle>
        <CardDescription>
          All inter-bank fund transfers with GL journal entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={transfers || []} 
          searchKey="transfer_number"
        />
      </CardContent>
    </Card>
  );
}
