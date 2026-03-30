import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck } from 'lucide-react';

interface SinotrukRMVRegistrationManagementProps {
  onRefresh: () => void;
}

export function SinotrukRMVRegistrationManagement({ onRefresh }: SinotrukRMVRegistrationManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          RMV Registration & Compliance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-muted-foreground">RMV registration and compliance management coming soon...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This will include RMV registration applications, CR print management, and compliance tracking
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}