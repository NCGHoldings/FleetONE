import { useMemo } from "react";
import { format, isSameMonth, subMonths, isAfter, startOfDay } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Quotation {
  hire_type?: string;
  gross_revenue?: number;
  pickup_datetime?: string;
  status?: string;
  trip_status?: string;
}

interface Props {
  quotations: Quotation[];
  dateFrom: Date;
  dateTo: Date;
}

export default function SpecialHiresIncomeReport({ quotations, dateFrom, dateTo }: Props) {
  const isSameMonthPeriod = isSameMonth(dateFrom, dateTo);
  const periodString = isSameMonthPeriod 
    ? format(dateFrom, "MMMM (yyyy)")
    : `${format(dateFrom, "MMM yyyy")} - ${format(dateTo, "MMM yyyy")}`;

  const reportData = useMemo(() => {
    const data: Record<string, any> = {
      Inside: { type: "Inside", completed: 0, confirmed: 0, upcoming: 0, cancelled: 0, postponed: 0 },
      Outside: { type: "Outside", completed: 0, confirmed: 0, upcoming: 0, cancelled: 0, postponed: 0 },
    };

    quotations.forEach((q) => {
      const type = (q.hire_type || "Outside").includes("Inside") || q.hire_type === "Lyceum" ? "Inside" : "Outside";
      const rev = Number(q.gross_revenue) || 0;
      const pickupDate = new Date(q.pickup_datetime || new Date());
      const status = (q.trip_status || q.status || "").toLowerCase();

      // Cancelled
      if (status.includes("cancel") || status === "rejected") {
        data[type].cancelled += rev;
        return;
      }

      // Postponed
      if (status.includes("postpone")) {
        data[type].postponed += rev;
        return;
      }

      // Completed
      if (status.includes("complete")) {
        data[type].completed += rev;
        return;
      }

      // Confirmed & Upcoming
      if (status.includes("confirm") || status === "approved") {
        if (isAfter(pickupDate, startOfDay(new Date()))) {
          data[type].upcoming += rev;
        } else {
          data[type].confirmed += rev;
        }
        return;
      }
    });

    return Object.values(data);
  }, [quotations]);

  const totals = reportData.reduce(
    (acc, row) => ({
      completed: acc.completed + row.completed,
      confirmed: acc.confirmed + row.confirmed,
      totalCurr: acc.totalCurr + (row.completed + row.confirmed),
      upcoming: acc.upcoming + row.upcoming,
      cancelled: acc.cancelled + row.cancelled,
      postponed: acc.postponed + row.postponed,
    }),
    { completed: 0, confirmed: 0, totalCurr: 0, upcoming: 0, cancelled: 0, postponed: 0 }
  );

  const formatCurrency = (val: number) => (val === 0 ? "-" : val.toLocaleString("en-US", { minimumFractionDigits: 2 }));

  return (
    <div className="rounded-md border overflow-x-auto">
      <div className="bg-white px-4 py-3 border-b text-center">
        <h2 className="text-lg font-bold text-gray-800">
          Special Hires Income Report - {periodString}
        </h2>
      </div>
      <Table className="text-sm border-collapse">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead rowSpan={2} className="border text-center font-bold w-12 border-gray-300">#</TableHead>
            <TableHead rowSpan={2} className="border text-center font-bold min-w-[100px] border-gray-300">Hire Type</TableHead>
            <TableHead colSpan={2} className="border text-center font-bold border-gray-300 bg-muted/30">{periodString}</TableHead>
            <TableHead rowSpan={2} className="border text-center font-bold bg-muted/80 border-gray-300">Total Selected</TableHead>
            <TableHead rowSpan={2} className="border text-center font-bold border-gray-300">Upcoming Hires</TableHead>
            <TableHead rowSpan={2} className="border text-center font-bold border-gray-300">Cancelled</TableHead>
            <TableHead rowSpan={2} className="border text-center font-bold border-gray-300">Postponed</TableHead>
          </TableRow>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="border text-center font-bold border-gray-300 bg-white">Completed</TableHead>
            <TableHead className="border text-center font-bold border-gray-300 bg-white">Confirmed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportData.map((row, index) => (
            <TableRow key={row.type} className="hover:bg-muted/10">
              <TableCell className="border text-center border-gray-300">{index + 1}</TableCell>
              <TableCell className="border font-medium border-gray-300">{row.type}</TableCell>
              <TableCell className="border text-right border-gray-300 text-gray-500">{formatCurrency(row.completed)}</TableCell>
              <TableCell className="border text-right border-gray-300">{formatCurrency(row.confirmed)}</TableCell>
              <TableCell className="border text-right bg-muted/20 font-medium border-gray-300">
                {formatCurrency(row.completed + row.confirmed)}
              </TableCell>
              <TableCell className="border text-right border-gray-300">{formatCurrency(row.upcoming)}</TableCell>
              <TableCell className="border text-right border-gray-300">{formatCurrency(row.cancelled)}</TableCell>
              <TableCell className="border text-right border-gray-300">{formatCurrency(row.postponed)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
            <TableCell className="border text-center border-gray-300" colSpan={2}>Total</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.completed)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.confirmed)}</TableCell>
            <TableCell className="border text-right bg-white border-gray-300">{formatCurrency(totals.totalCurr)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.upcoming)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.cancelled)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.postponed)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
