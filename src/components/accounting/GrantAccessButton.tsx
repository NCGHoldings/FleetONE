import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useAccountingAccess } from "@/hooks/useAccountingAccess";

export const GrantAccessButton = () => {
  const { grantAccountingAccess, isGranting } = useAccountingAccess();

  return (
    <Button
      onClick={grantAccountingAccess}
      disabled={isGranting}
      size="sm"
      variant="outline"
    >
      <Shield className="h-4 w-4 mr-2" />
      {isGranting ? "Granting Access..." : "Grant Accounting Access"}
    </Button>
  );
};
