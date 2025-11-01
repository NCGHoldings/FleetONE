import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail } from "lucide-react";

export default function Welcome() {
  const { userProfile } = useAuth();

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Welcome to Our ERP System</CardTitle>
            <CardDescription className="text-lg">
              {userProfile?.first_name && (
                <span className="block mb-2">
                  Hello, {userProfile.first_name} {userProfile.last_name}!
                </span>
              )}
              Your account has been successfully created.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Account Setup in Progress</h3>
              <p className="text-muted-foreground">
                Your account is currently being configured by our administrators. 
                You will receive access to the system modules shortly.
              </p>
              
              <div className="flex items-start gap-3 mt-4 p-4 bg-background rounded-md">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Need Access?</p>
                  <p className="text-sm text-muted-foreground">
                    Please contact your system administrator to request access to specific modules.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              Once access is granted, you'll be able to navigate to your assigned pages using the sidebar menu.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
