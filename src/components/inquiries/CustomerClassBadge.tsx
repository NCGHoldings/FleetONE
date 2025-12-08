import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CustomerClass = 'C0' | 'C1' | 'C2' | 'C3';

interface CustomerClassBadgeProps {
  customerClass: CustomerClass | string | null;
  showLabel?: boolean;
  className?: string;
}

const classConfig: Record<CustomerClass, { label: string; description: string; variant: string }> = {
  C0: {
    label: 'C0',
    description: 'Inquiry Only',
    variant: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  C1: {
    label: 'C1',
    description: 'Quotation Generated',
    variant: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  },
  C2: {
    label: 'C2',
    description: 'Advance Paid',
    variant: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  },
  C3: {
    label: 'C3',
    description: 'Invoice Paid',
    variant: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  },
};

export const CustomerClassBadge = ({ customerClass, showLabel = true, className }: CustomerClassBadgeProps) => {
  const validClass = (customerClass as CustomerClass) || 'C0';
  const config = classConfig[validClass] || classConfig.C0;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-semibold border",
        config.variant,
        className
      )}
    >
      {config.label}
      {showLabel && <span className="ml-1 font-normal">• {config.description}</span>}
    </Badge>
  );
};

export const getCustomerClassInfo = (customerClass: CustomerClass | string | null) => {
  const validClass = (customerClass as CustomerClass) || 'C0';
  return classConfig[validClass] || classConfig.C0;
};