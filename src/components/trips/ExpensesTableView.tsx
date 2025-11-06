import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { ExpenseDetailsModal } from "./ExpenseDetailsModal";

interface ExpensesTableViewProps {
  expenses: any[];
  onRefresh: () => void;
}

export function ExpensesTableView({ expenses, onRefresh }: ExpensesTableViewProps) {
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateCategoryTotal = (expense: any, fields: string[]) => {
    return fields.reduce((sum, field) => sum + (expense[field] || 0), 0);
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "buses.bus_no",
      header: "Bus No",
      cell: ({ row }) => (
        <div className="font-medium text-foreground">
          {row.original.buses?.bus_no}
        </div>
      ),
    },
    {
      id: "fuel",
      header: "Fuel",
      accessorFn: (row) => row.fuel_cost || 0,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.fuel_cost || 0)}
        </div>
      ),
    },
    {
      id: "staff",
      header: "Staff",
      accessorFn: (row) => calculateCategoryTotal(row, ['salary', 'food', 'runner', 'staff_accommodation']),
      cell: ({ row }) => {
        const total = calculateCategoryTotal(row.original, ['salary', 'food', 'runner', 'staff_accommodation']);
        return <div className="text-right tabular-nums">{formatCurrency(total)}</div>;
      },
    },
    {
      id: "maintenance",
      header: "Maintenance",
      accessorFn: (row) => calculateCategoryTotal(row, ['repair', 'tyre_tube', 'body_wash']),
      cell: ({ row }) => {
        const total = calculateCategoryTotal(row.original, ['repair', 'tyre_tube', 'body_wash']);
        return <div className="text-right tabular-nums">{formatCurrency(total)}</div>;
      },
    },
    {
      id: "operational",
      header: "Operational",
      accessorFn: (row) => calculateCategoryTotal(row, ['parking', 'highway_charges', 'police']),
      cell: ({ row }) => {
        const total = calculateCategoryTotal(row.original, ['parking', 'highway_charges', 'police']);
        return <div className="text-right tabular-nums">{formatCurrency(total)}</div>;
      },
    },
    {
      id: "administrative",
      header: "Admin",
      accessorFn: (row) => calculateCategoryTotal(row, ['permits_renewal', 'log_sheet', 'ntc', 'legal_court', 'emission_fitness', 'temporary_permit']),
      cell: ({ row }) => {
        const total = calculateCategoryTotal(row.original, ['permits_renewal', 'log_sheet', 'ntc', 'legal_court', 'emission_fitness', 'temporary_permit']);
        return <div className="text-right tabular-nums">{formatCurrency(total)}</div>;
      },
    },
    {
      id: "other",
      header: "Other",
      accessorFn: (row) => calculateCategoryTotal(row, ['accident_compensation', 'vehicle_hire', 'short_misc', 'other']),
      cell: ({ row }) => {
        const total = calculateCategoryTotal(row.original, ['accident_compensation', 'vehicle_hire', 'short_misc', 'other']);
        return <div className="text-right tabular-nums">{formatCurrency(total)}</div>;
      },
    },
    {
      id: "total",
      header: "Total",
      accessorFn: (row) => row.total_daily_expenses || 0,
      cell: ({ row }) => (
        <div className="font-bold text-right tabular-nums text-foreground">
          {formatCurrency(row.original.total_daily_expenses || 0)}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedExpense(row.original);
            setModalOpen(true);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={expenses}
        searchKey="buses.bus_no"
      />

      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </>
  );
}
