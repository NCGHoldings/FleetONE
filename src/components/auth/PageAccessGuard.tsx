import { useAuth } from "@/hooks/useAuth";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PageAccessGuardProps {
  children: React.ReactNode;
  pageId: string;
}

export function PageAccessGuard({ children, pageId }: PageAccessGuardProps) {
  const { user } = useAuth();
  const { hasAccess, loading } = usePagePermissions(user?.id);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess(pageId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive" className="border-2">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Access Denied</AlertTitle>
            <AlertDescription className="mt-2">
              You don't have permission to access this page. Contact your system administrator to request access.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
              Go Back
            </Button>
            <Button onClick={() => navigate("/")} className="flex-1">
              Go to Dashboard
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Page ID: <code className="bg-muted px-1 py-0.5 rounded">{pageId}</code>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
