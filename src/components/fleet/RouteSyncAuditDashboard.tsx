import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Loader2, LayoutList, FileSpreadsheet, Bus, Plus } from "lucide-react";
import { useRouteAudit, OrphanRoute } from "@/hooks/useRouteAudit";

interface RouteSyncAuditDashboardProps {
  onSyncComplete?: () => void;
}

export function RouteSyncAuditDashboard({ onSyncComplete }: RouteSyncAuditDashboardProps) {
  const { officialRoutes, orphans, summary, loading, fixing, runAudit, fixOrphan, addAsOfficialRoute } = useRouteAudit(onSyncComplete);
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground font-medium">Scanning all modules for route mismatches...</span>
        </CardContent>
      </Card>
    );
  }

  const isSynced = summary && summary.totalOrphans === 0;

  return (
    <div className="space-y-6">
      {/* Health Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Sync Score */}
        <Card className={`col-span-1 md:col-span-2 ${isSynced ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'}`}>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isSynced ? 'bg-green-100 dark:bg-green-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
                {isSynced
                  ? <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                  : <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                }
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold tracking-tight">{summary?.syncPercentage ?? 0}%</div>
                <div className="text-sm text-muted-foreground font-medium">System Sync Score</div>
                <Progress value={summary?.syncPercentage ?? 0} className="mt-2 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orphans */}
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{summary?.totalOrphans ?? 0}</div>
            <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">Unmatched Routes</div>
          </CardContent>
        </Card>

        {/* Trips Affected */}
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            <div className="text-3xl font-bold">{summary?.tripsAffected ?? 0}</div>
            <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">Trips Affected</div>
          </CardContent>
        </Card>

        {/* Official Routes */}
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            <div className="text-3xl font-bold text-primary">{summary?.totalOfficialRoutes ?? 0}</div>
            <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">Official Routes</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Orphan Route Inspector</h3>
          {!isSynced && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:bg-amber-950/30">
              {orphans.length} issue{orphans.length !== 1 ? 's' : ''} found
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={runAudit} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Re-Scan
        </Button>
      </div>

      {/* 100% Synced State */}
      {isSynced ? (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-green-700 dark:text-green-400">100% Synced</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              All routes across Daily Trips, Fleet Master Sheet, and Bus Profiles are verified against the Official Route Dictionary. No orphans detected.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Orphan Table */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Unmatched Route Name</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1"><LayoutList className="w-3.5 h-3.5" /> Trips</div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> Roster</div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1"><Bus className="w-3.5 h-3.5" /> Buses</div>
                  </TableHead>
                  <TableHead className="w-[280px]">Map to Official Route</TableHead>
                  <TableHead className="w-[130px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orphans.map((orphan) => {
                  const totalAffected = orphan.sources.daily_trips + orphan.sources.roster + orphan.sources.buses;
                  const selectedTarget = selectedTargets[orphan.label] || "";
                  
                  return (
                    <TableRow key={orphan.label} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-sm">{orphan.label}</div>
                            <div className="text-xs text-muted-foreground">{totalAffected} record{totalAffected !== 1 ? 's' : ''} affected</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {orphan.sources.daily_trips > 0 ? (
                          <Badge variant="destructive" className="text-xs">{orphan.sources.daily_trips}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {orphan.sources.roster > 0 ? (
                          <Badge variant="secondary" className="text-xs">{orphan.sources.roster}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {orphan.sources.buses > 0 ? (
                          <Badge variant="outline" className="text-xs">{orphan.sources.buses}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectedTarget}
                          onValueChange={(val) => setSelectedTargets(prev => ({ ...prev, [orphan.label]: val }))}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select official route..." />
                          </SelectTrigger>
                          <SelectContent>
                            {officialRoutes.map(r => (
                              <SelectItem key={r.id} value={r.id} className="text-xs">
                                {r.route_name} ({r.route_no})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={fixing}
                            onClick={() => addAsOfficialRoute(orphan)}
                            className="gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                            title="Add this route to the official dictionary and sync all records"
                          >
                            {fixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Make Official
                          </Button>
                          <Button
                            size="sm"
                            disabled={!selectedTarget || fixing}
                            onClick={() => {
                              const target = officialRoutes.find(r => r.id === selectedTarget);
                              if (target) {
                                fixOrphan(orphan, target.id, target.route_name);
                              }
                            }}
                            className="gap-1.5 text-xs min-w-[100px]"
                          >
                            {fixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Fix & Sync
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
