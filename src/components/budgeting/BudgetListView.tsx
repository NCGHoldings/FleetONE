import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBudgets } from "@/hooks/useBudgets";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Edit, Trash2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const BudgetListView = () => {
  const { fetchBudgets, deleteBudget } = useBudgets();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets", statusFilter, yearFilter],
    queryFn: () =>
      fetchBudgets({
        status: statusFilter !== "all" ? statusFilter : undefined,
        fiscal_year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
      }),
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-gray-500/20 text-gray-700",
      pending_approval: "bg-yellow-500/20 text-yellow-700",
      approved: "bg-green-500/20 text-green-700",
      active: "bg-blue-500/20 text-blue-700",
      rejected: "bg-red-500/20 text-red-700",
      closed: "bg-gray-500/20 text-gray-700",
    };
    return <Badge className={variants[status] || ""}>{status}</Badge>;
  };

  const columns = [
    {
      accessorKey: "budget_code",
      header: "Budget Code",
    },
    {
      accessorKey: "budget_name",
      header: "Budget Name",
    },
    {
      accessorKey: "fiscal_year",
      header: "Fiscal Year",
    },
    {
      accessorKey: "budget_period",
      header: "Period",
      cell: ({ row }: any) => (
        <span className="capitalize">{row.original.budget_period}</span>
      ),
    },
    {
      accessorKey: "total_budget_amount",
      header: "Total Amount",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          LKR {Number(row.original.total_budget_amount).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost">
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteBudget(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const fiscalYears = Array.from(
    new Set(budgets?.map((b) => b.fiscal_year) || [])
  ).sort((a, b) => b - a);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search budgets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {fiscalYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                FY {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={budgets || []}
        searchKey="budget_name"
      />
    </div>
  );
};
