import React, { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, Trash2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface GlobalStudentRow {
  id: string; // Either student_id or transaction_id (if orphaned)
  student_name: string;
  admission_no: string;
  grade: string;
  branch_name: string;
  payment_status: 'paid' | 'pending' | 'overdue' | 'missing';
  payment_amount: number;
  last_payment_date: string;
  is_orphaned: boolean;
  is_inactive: boolean;
  transaction_ids: string[];
}

interface GlobalStudentListProps {
  data: GlobalStudentRow[];
  branches: { id: string; branch_name: string }[];
  onRefresh: () => void;
}

export function GlobalStudentList({ data, branches, onRefresh }: GlobalStudentListProps) {
  const { toast } = useToast();
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const orphanedOrInactive = data.filter(d => d.is_orphaned || (d.is_inactive && d.payment_amount > 0));

  const columns: ColumnDef<GlobalStudentRow>[] = [
    {
      accessorKey: "branch_name",
      header: "Branch",
    },
    {
      accessorKey: "student_name",
      header: "Student Name",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("student_name")}
          {row.original.is_inactive && <span className="text-red-500 ml-2 text-xs">(Inactive)</span>}
          {row.original.is_orphaned && <span className="text-red-500 ml-2 text-xs">(Missing Student)</span>}
        </div>
      ),
    },
    {
      accessorKey: "admission_no",
      header: "Admission No",
    },
    {
      accessorKey: "grade",
      header: "Grade",
    },
    {
      accessorKey: "payment_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("payment_status") as string;
        return (
          <Badge variant={
            status === 'paid' ? 'default' : 
            status === 'missing' ? 'destructive' :
            status === 'overdue' ? 'destructive' : 'secondary'
          }>
            {status === 'paid' ? <CheckCircle className="w-3 h-3 mr-1" /> :
             status === 'missing' ? <AlertCircle className="w-3 h-3 mr-1" /> :
             status === 'overdue' ? <AlertCircle className="w-3 h-3 mr-1" /> :
             <Clock className="w-3 h-3 mr-1" />}
            {status === 'missing' ? 'Missing/Inactive' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "payment_amount",
      header: "Amount Paid (LKR)",
      cell: ({ row }) => {
        const amount = Number(row.getValue("payment_amount"));
        return <div className="font-medium">{amount > 0 ? `LKR ${amount.toLocaleString()}` : "-"}</div>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const student = row.original;
        
        if (student.is_orphaned) {
          return (
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                if (window.confirm('Delete this orphaned transaction completely?')) {
                  try {
                    await supabase.from('school_payment_transactions').delete().in('id', student.transaction_ids);
                    toast({ title: "Success", description: "Orphaned payment deleted." });
                    onRefresh();
                  } catch (e: any) {
                    toast({ title: "Error", description: e.message, variant: "destructive" });
                  }
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Purge
            </Button>
          );
        }

        if (student.is_inactive) {
           return (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={async () => {
                try {
                  await supabase.from('school_students').update({ is_active: true }).eq('id', student.id);
                  toast({ title: "Success", description: "Student restored to active!" });
                  onRefresh();
                } catch (e: any) {
                  toast({ title: "Error", description: e.message, variant: "destructive" });
                }
              }}
            >
              Restore
            </Button>
          );
        }

        return <div className="text-muted-foreground text-xs">Standard</div>;
      }
    }
  ];

  // Filtering
  const filteredData = data.filter(student => {
    if (filterBranch !== "all" && student.branch_name !== filterBranch) return false;
    if (filterStatus !== "all" && student.payment_status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        student.student_name.toLowerCase().includes(term) ||
        (student.admission_no && student.admission_no.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {orphanedOrInactive.length > 0 && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-800 flex items-center gap-2">
            Global Data Discrepancy Detected
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
              <div>
                We detected <strong>{orphanedOrInactive.length} record(s)</strong> across all branches where payments exist but the student is missing or marked inactive. 
                These discrepancies distort the global revenue KPIs. Please restore or purge them using the table actions below.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Input 
            placeholder="Search student or admission no..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.branch_name}>{b.branch_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="missing">Missing/Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <DataTable 
          columns={columns} 
          data={filteredData} 
          searchKey="student_name" 
        />
      </div>
    </div>
  );
}
