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
import { BudgetDetailsModal } from "./BudgetDetailsModal";
import { EditBudgetModal } from "./EditBudgetModal";
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
} from "@/components/ui/alert-dialog";

export const BudgetListView = () => {
  const { fetchBudgets, deleteBudget, duplicateBudget } = useBudgets();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  
  // Modal states
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [duplicatingBudgetId, setDuplicatingBudgetId] = useState<string | null>(null);

  const { data: budgets, isLoading, refetch } = useQuery({
    queryKey: ["budgets", statusFilter, yearFilter],
    queryFn: () =>
      fetchBudgets({
        status: statusFilter !== "all" ? statusFilter : undefined,
        fiscal_year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
      }),
  });

  const handleView = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setShowDetailsModal(true);
  };

  const handleEdit = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setShowEditModal(true);
  };

  const handleDuplicate = async (budgetId: string) => {
    const currentYear = new Date().getFullYear();
    const newFiscalYear = window.prompt(
      `Enter the fiscal year for the duplicated budget:`,
      (currentYear + 1).toString()
    );

    if (!newFiscalYear) return;

    const year = parseInt(newFiscalYear);
    if (isNaN(year) || year < 2000 || year > 2100) {
      toast.error("Invalid fiscal year");
      return;
    }

    try {
      setDuplicatingBudgetId(budgetId);
      await duplicateBudget(budgetId, year);
      toast.success("Budget duplicated successfully");
      refetch();
    } catch (error) {
      console.error("Error duplicating budget:", error);
      toast.error("Failed to duplicate budget");
    } finally {
      setDuplicatingBudgetId(null);
    }
  };

  const handleDeleteClick = (budgetId: string) => {
    setBudgetToDelete(budgetId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!budgetToDelete) return;

    try {
      const success = await deleteBudget(budgetToDelete);
      if (success) {
        toast.success("Budget deleted successfully");
        refetch();
      }
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.error("Failed to delete budget");
    } finally {
      setShowDeleteDialog(false);
      setBudgetToDelete(null);
    }
  };

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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleView(row.original.id)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(row.original.id)}
            title="Edit Budget"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDuplicate(row.original.id)}
            disabled={duplicatingBudgetId === row.original.id}
            title="Duplicate Budget"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteClick(row.original.id)}
            title="Delete Budget"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
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

      {selectedBudgetId && (
        <>
          <BudgetDetailsModal
            budgetId={selectedBudgetId}
            open={showDetailsModal}
            onOpenChange={setShowDetailsModal}
            onEdit={() => {
              setShowDetailsModal(false);
              setShowEditModal(true);
            }}
            onDuplicate={() => {
              setShowDetailsModal(false);
              handleDuplicate(selectedBudgetId);
            }}
          />

          <EditBudgetModal
            budgetId={selectedBudgetId}
            open={showEditModal}
            onOpenChange={setShowEditModal}
            onSuccess={() => {
              refetch();
              setShowEditModal(false);
            }}
          />
        </>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the budget
              and all associated departments and line items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
