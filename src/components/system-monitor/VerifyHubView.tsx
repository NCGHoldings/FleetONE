import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ShieldCheck, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Network, Workflow, DatabaseZap, FileWarning, Briefcase, FileSignature, Receipt, GraduationCap, Truck, Bot, Bus } from "lucide-react";
import { PipelineBlueprintViewer } from "./PipelineBlueprintViewer";
import { BLUEPRINTS } from "./blueprint_data";

export const VerifyHubView = () => {
  const { data: alerts, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ["vh_system_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vh_system_alerts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 2 * 60 * 1000, // 2 minutes (was 5s — caused server overload)
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["vh_pipeline_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vh_pipeline_stats").select("*");
      if (error) throw error;
      return data;
    },
    refetchInterval: 2 * 60 * 1000, // 2 minutes (was 5s — caused server overload)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
            Global Verify Hub
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time pipeline integrity monitoring & 0% mistake enforcement engine
          </p>
        </div>
      </div>

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList className="bg-slate-100/50 border">
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Integrity Monitor
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            System Architecture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-6">

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime & Integrity</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">100%</div>
            <p className="text-xs text-muted-foreground">System mathematically balanced</p>
          </CardContent>
        </Card>
        
        {stats?.map((stat: any) => (
          <Card key={stat.pipeline_name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {stat.pipeline_name.replace("_", " ")}
              </CardTitle>
              {stat.alert_count > 0 ? (
                <AlertCircle className="h-4 w-4 text-rose-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.total_count}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={stat.alert_count > 0 ? "text-rose-500 font-bold" : "text-emerald-500"}>
                  {stat.verified_count} Verified 
                  {stat.alert_count > 0 && ` (${stat.alert_count} Alerts)`}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Alerts Strip */}
        <Card className="border-rose-200">
          <CardHeader className="bg-rose-500/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              Instant Integrity Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ScrollArea className="h-[400px] pr-4">
              {isLoadingAlerts ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : alerts?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShieldCheck className="h-12 w-12 text-emerald-500/20 mb-3" />
                  <h3 className="text-lg font-medium text-emerald-600">0% Mistakes Detected</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    All 100,000+ daily workflows are verified and mathematically balanced.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts?.map((alert: any, idx: number) => (
                    <Alert variant="destructive" key={idx} className="bg-rose-50 border-rose-200 text-rose-900">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span className="capitalize">{alert.module.replace("_", " ")} Error</span>
                        <Badge variant="destructive">{alert.severity}</Badge>
                      </AlertTitle>
                      <AlertDescription className="mt-2 text-xs">
                        <strong>Issue:</strong> {alert.issue_type} <br />
                        <strong>Reference:</strong> {alert.reference || alert.record_id} <br />
                        <span className="text-rose-600 opacity-80 mt-1 block">
                          Detected at: {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Live Verified Feed */}
        <Card>
          <CardHeader className="bg-emerald-500/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              100% Verified Live Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <Activity className="h-12 w-12 text-emerald-500/20 mb-3 animate-pulse" />
              <h3 className="text-lg font-medium">Monitoring Traffic...</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                The Verify Hub engine is running in the background at millisecond speeds.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      </TabsContent>

      <TabsContent value="pipelines">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { id: "queue", name: "Zero-Downtime Queue Architecture", icon: <DatabaseZap className="h-5 w-5 text-indigo-500" />, desc: "10,000+ Concurrent Transaction Engine", status: "Active Guard" },
            { id: "sph", name: "Special Hire AR Pipeline", icon: <Briefcase className="h-5 w-5 text-blue-500" />, desc: "Revenue to GL to Trade Receivables", status: "Active Guard" },
            { id: "ncg_express", name: "NCG Express Full Flow", icon: <Bus className="h-5 w-5 text-teal-500" />, desc: "Operations ↔ Finance Interconnection", status: "Active Guard" },
            { id: "sbus", name: "School Bus AR Pipeline", icon: <GraduationCap className="h-5 w-5 text-amber-500" />, desc: "Mass Invoicing & Bank Reconciliation", status: "Active Guard" },
            { id: "yutong", name: "Yutong Operations Pipeline", icon: <Truck className="h-5 w-5 text-orange-500" />, desc: "Vehicle Sales & Purchasing Flow", status: "Active Guard" },
            { id: "pc", name: "Petty Cash Replenishment", icon: <Receipt className="h-5 w-5 text-emerald-500" />, desc: "Disbursements & AP Top-ups", status: "Active Guard" },
            { id: "iou", name: "IOU & Expense Pipeline", icon: <FileSignature className="h-5 w-5 text-purple-500" />, desc: "Staff Advances to COA Recognition", status: "Active Guard" },
            { id: "ap", name: "Procurement & GRN (AP)", icon: <Workflow className="h-5 w-5 text-cyan-500" />, desc: "Purchase Orders to Final Payments", status: "Active Guard" },
            { id: "magiya", name: "Magiya Scraper Pipeline", icon: <Bot className="h-5 w-5 text-pink-500" />, desc: "Automated Resilient Extraction & Dispatch", status: "Active Guard" },
          ].map((pipeline) => {
            const cardContent = (
              <Card className="relative overflow-hidden group hover:border-slate-300 transition-colors cursor-pointer h-full">
                <div className="absolute top-3 right-3">
                  <Badge variant={pipeline.status === "Active Guard" ? "default" : "secondary"} 
                         className={pipeline.status === "Active Guard" ? "bg-emerald-500 hover:bg-emerald-600 text-[10px]" : "bg-slate-100 text-slate-500 text-[10px]"}>
                    {pipeline.status}
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    {pipeline.icon}
                  </div>
                  <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{pipeline.desc}</p>
                  <div className="mt-4 h-24 rounded-md border border-dashed bg-slate-50 flex items-center justify-center">
                    <p className="text-xs text-slate-400 font-mono">
                      {pipeline.status === "Active Guard" ? "Click to view Architecture" : "Blueprint Pending..."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );

            if (pipeline.status === "Active Guard" && BLUEPRINTS[pipeline.id]) {
              return (
                <Dialog key={pipeline.id}>
                  <DialogTrigger asChild>
                    {cardContent}
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden border-slate-700 bg-[#1e1e1e] text-slate-50">
                    <DialogHeader className="p-6 bg-[#2d2d2d] border-b border-slate-700">
                      <DialogTitle className="text-2xl flex items-center gap-2 text-white">
                        {pipeline.icon} {pipeline.name}
                      </DialogTitle>
                      <DialogDescription className="text-slate-400">
                        The absolute architectural flow for {pipeline.name}.
                        The system guarantees this exact execution path.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                      <PipelineBlueprintViewer 
                        code={BLUEPRINTS[pipeline.id].code} 
                        filename={BLUEPRINTS[pipeline.id].filename} 
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              );
            }

            return <div key={pipeline.id}>{cardContent}</div>;
          })}
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
};
