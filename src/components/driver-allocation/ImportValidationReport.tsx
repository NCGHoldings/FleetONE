import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Bus, MapPin, Users, Phone } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ValidationRow {
  rowNumber: number;
  status: 'valid' | 'warning' | 'error';
  data: {
    busNo: string;
    routeNo: string;
    routeName: string;
    driverName: string;
    conductorName: string;
    whatsapp: string;
    date: string;
    time: string;
  };
  checks: {
    bus: { status: 'found' | 'not_found' | 'will_create'; message: string };
    route: { status: 'found' | 'not_found' | 'will_create'; message: string };
    driver: { status: 'found' | 'not_found' | 'will_create'; message: string };
    conductor: { status: 'found' | 'not_found' | 'will_create'; message: string };
    date: { status: 'valid' | 'invalid'; message: string };
    whatsapp: { status: 'valid' | 'invalid' | 'missing'; message: string };
  };
}

interface ImportValidationReportProps {
  validationResults: ValidationRow[];
  autoCreateEnabled: boolean;
}

export function ImportValidationReport({ validationResults, autoCreateEnabled }: ImportValidationReportProps) {
  const validRows = validationResults.filter(r => r.status === 'valid').length;
  const warningRows = validationResults.filter(r => r.status === 'warning').length;
  const errorRows = validationResults.filter(r => r.status === 'error').length;

  const getStatusIcon = (status: ValidationRow['status']) => {
    switch (status) {
      case 'valid': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getCheckStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      found: { variant: 'default', label: 'Found' },
      not_found: { variant: 'destructive', label: 'Not Found' },
      will_create: { variant: 'secondary', label: autoCreateEnabled ? 'Will Create' : 'Missing' },
      valid: { variant: 'default', label: 'Valid' },
      invalid: { variant: 'destructive', label: 'Invalid' },
      missing: { variant: 'outline', label: 'Optional' }
    };
    
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valid Records</p>
              <p className="text-2xl font-bold text-green-600">{validRows}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">{warningRows}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
        
        <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Errors</p>
              <p className="text-2xl font-bold text-red-600">{errorRows}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Auto-Create Notice */}
      {autoCreateEnabled && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            🚀 <strong>Auto-Create Mode Enabled:</strong> Missing buses, routes, drivers, and conductors will be automatically created with default values.
          </AlertDescription>
        </Alert>
      )}

      {/* Row-by-Row Validation */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Row-by-Row Validation Details</h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {validationResults.map((row) => (
              <Card key={row.rowNumber} className={`p-4 ${
                row.status === 'valid' ? 'border-green-200' : 
                row.status === 'warning' ? 'border-yellow-200' : 
                'border-red-200'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(row.status)}
                    <span className="font-semibold">Row {row.rowNumber}</span>
                  </div>
                  <Badge variant={row.status === 'error' ? 'destructive' : row.status === 'warning' ? 'secondary' : 'default'}>
                    {row.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {/* Bus Check */}
                  <div className="flex items-start gap-2">
                    <Bus className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Bus: {row.data.busNo}</span>
                        {getCheckStatusBadge(row.checks.bus.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{row.checks.bus.message}</p>
                    </div>
                  </div>

                  {/* Route Check */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Route: {row.data.routeNo}</span>
                        {getCheckStatusBadge(row.checks.route.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{row.checks.route.message}</p>
                    </div>
                  </div>

                  {/* Driver Check */}
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Driver: {row.data.driverName}</span>
                        {getCheckStatusBadge(row.checks.driver.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{row.checks.driver.message}</p>
                    </div>
                  </div>

                  {/* Conductor Check */}
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Conductor: {row.data.conductorName}</span>
                        {getCheckStatusBadge(row.checks.conductor.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{row.checks.conductor.message}</p>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="col-span-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span><strong>Date:</strong> {row.data.date} {getCheckStatusBadge(row.checks.date.status)}</span>
                      <span><strong>Time:</strong> {row.data.time}</span>
                      {row.data.whatsapp && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {row.data.whatsapp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Action Summary */}
      {errorRows === 0 && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            <strong>Ready to Import!</strong> All {validRows + warningRows} rows are valid and can be imported.
            {warningRows > 0 && ` (${warningRows} with warnings)`}
          </AlertDescription>
        </Alert>
      )}

      {errorRows > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Cannot Import:</strong> {errorRows} row(s) have critical errors that must be fixed before importing.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
