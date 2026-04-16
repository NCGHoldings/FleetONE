import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 
  | "draft" | "posted" | "void" | "approved" | "rejected" | "pending" | "unpaid"
  | "open" | "closed" | "paid" | "partial" | "overdue" | "cancelled"
  | "active" | "inactive" | "reconciled" | "unreconciled" | "reversed";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<StatusType, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  draft: { variant: "secondary", label: "Draft" },
  posted: { variant: "default", label: "Posted" },
  void: { variant: "destructive", label: "Void" },
  approved: { variant: "default", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
  pending: { variant: "outline", label: "Pending" },
  unpaid: { variant: "secondary", label: "Unpaid" },
  open: { variant: "outline", label: "Open" },
  closed: { variant: "secondary", label: "Closed" },
  paid: { variant: "default", label: "Paid" },
  partial: { variant: "outline", label: "Partial" },
  overdue: { variant: "destructive", label: "Overdue" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  active: { variant: "default", label: "Active" },
  inactive: { variant: "secondary", label: "Inactive" },
  reconciled: { variant: "default", label: "Reconciled" },
  unreconciled: { variant: "outline", label: "Unreconciled" },
  reversed: { variant: "outline", label: "Reversed" },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status.toLowerCase() as StatusType] || {
    variant: "outline" as const,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  };

  return (
    <Badge variant={config.variant} className={cn("capitalize", className)}>
      {config.label}
    </Badge>
  );
};
