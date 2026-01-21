import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Download, Building2, MapPin, FolderKanban, TrendingUp, TrendingDown } from "lucide-react";

type SegmentType = "cost-center" | "location" | "project";

interface SegmentData {
  id: string;
  name: string;
  code: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

export const SegmentReportView = () => {
  const [segmentType, setSegmentType] = useState<SegmentType>("cost-center");

  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("is_active", true)
        .order("cost_center_name");
      if (error) throw error;
      return data;
    },
    enabled: segmentType === "cost-center",
  });

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true)
        .order("location_name");
      if (error) throw error;
      return data;
    },
    enabled: segmentType === "location",
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_active", true)
        .order("project_name");
      if (error) throw error;
      return data;
    },
    enabled: segmentType === "project",
  });

  const { data: journalData } = useQuery({
    queryKey: ["segment-journal-data", segmentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          journal_entries!inner(entry_date, status),
          chart_of_accounts!inner(account_type)
        `)
        .eq("journal_entries.status", "posted");
      if (error) throw error;
      return data;
    },
  });

  const getSegmentData = (): SegmentData[] => {
    switch (segmentType) {
      case "cost-center":
        return (costCenters || []).map(s => ({
          id: s.id,
          name: s.cost_center_name,
          code: s.cost_center_code,
          revenue: 0,
          expenses: 0,
          netIncome: 0,
        }));
      case "location":
        return (locations || []).map(s => ({
          id: s.id,
          name: s.location_name,
          code: s.location_code,
          revenue: 0,
          expenses: 0,
          netIncome: 0,
        }));
      case "project":
        return (projects || []).map(s => ({
          id: s.id,
          name: s.project_name,
          code: s.project_code,
          revenue: 0,
          expenses: 0,
          netIncome: 0,
        }));
      default:
        return [];
    }
  };

  const segmentData = getSegmentData();

  const calculateSegmentTotals = () => {
    if (!journalData) return segmentData;

    return segmentData.map(segment => {
      const segmentLines = journalData.filter(line => {
        switch (segmentType) {
          case "cost-center":
            return line.cost_center_id === segment.id;
          case "location":
            return line.location_id === segment.id;
          case "project":
            return line.project_id === segment.id;
          default:
            return false;
        }
      });

      let revenue = 0;
      let expenses = 0;

      segmentLines.forEach(line => {
        const accountType = (line as any).chart_of_accounts?.account_type;
        const netAmount = (line.credit || 0) - (line.debit || 0);

        if (accountType === "revenue") {
          revenue += netAmount;
        } else if (accountType === "expense") {
          expenses += (line.debit || 0) - (line.credit || 0);
        }
      });

      return { ...segment, revenue, expenses, netIncome: revenue - expenses };
    });
  };

  const processedData = calculateSegmentTotals();
  const totals = processedData.reduce(
    (acc, s) => ({
      revenue: acc.revenue + s.revenue,
      expenses: acc.expenses + s.expenses,
      netIncome: acc.netIncome + s.netIncome,
    }),
    { revenue: 0, expenses: 0, netIncome: 0 }
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Segment Reports</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Profit & Loss analysis by cost center, location, or project
            </p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="mb-6">
          <Label>Segment Type</Label>
          <Select value={segmentType} onValueChange={(v) => setSegmentType(v as SegmentType)}>
            <SelectTrigger className="w-[250px] mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost-center">Cost Centers</SelectItem>
              <SelectItem value="location">Locations / Branches</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">
                  <CurrencyDisplay amount={totals.revenue} />
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-destructive">
                  <CurrencyDisplay amount={totals.expenses} />
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-primary/5">
            <div>
              <p className="text-sm text-muted-foreground">Net Income</p>
              <p className={`text-2xl font-bold ${totals.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                <CurrencyDisplay amount={totals.netIncome} />
              </p>
            </div>
          </Card>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Net Income</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.map((segment) => (
              <TableRow key={segment.id}>
                <TableCell>
                  <Badge variant="outline">{segment.code}</Badge>
                </TableCell>
                <TableCell className="font-medium">{segment.name}</TableCell>
                <TableCell className="text-right text-primary">
                  <CurrencyDisplay amount={segment.revenue} />
                </TableCell>
                <TableCell className="text-right text-destructive">
                  <CurrencyDisplay amount={segment.expenses} />
                </TableCell>
                <TableCell className={`text-right font-semibold ${segment.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                  <CurrencyDisplay amount={segment.netIncome} />
                </TableCell>
              </TableRow>
            ))}
            {processedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No segments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
