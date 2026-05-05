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
    const initBucket = () => ({ rev: 0, count: 0 });
    const data: Record<string, any> = {
      Inside: { type: "Inside", completed: initBucket(), confirmed: initBucket(), upcoming: initBucket(), cancelled: initBucket(), postponed: initBucket() },
      Outside: { type: "Outside", completed: initBucket(), confirmed: initBucket(), upcoming: initBucket(), cancelled: initBucket(), postponed: initBucket() },
    };

    quotations.forEach((q) => {
      const type = (q.hire_type || "Outside").includes("Inside") || q.hire_type === "Lyceum" ? "Inside" : "Outside";
      const rev = Number(q.gross_revenue) || 0;
      const pickupDate = new Date(q.pickup_datetime || new Date());
      const status = (q.trip_status || q.status || "").toLowerCase();

      // Cancelled
      if (status.includes("cancel") || status === "rejected") {
        data[type].cancelled.rev += rev;
        data[type].cancelled.count += 1;
        return;
      }

      // Postponed
      if (status.includes("postpone")) {
        data[type].postponed.rev += rev;
        data[type].postponed.count += 1;
        return;
      }

      // Completed
      if (status.includes("complete")) {
        data[type].completed.rev += rev;
        data[type].completed.count += 1;
        return;
      }

      // Confirmed & Upcoming
      if (status.includes("confirm") || status === "approved" || status === "confirmed") {
        if (isAfter(pickupDate, startOfDay(new Date()))) {
          data[type].upcoming.rev += rev;
          data[type].upcoming.count += 1;
        } else {
          data[type].confirmed.rev += rev;
          data[type].confirmed.count += 1;
        }
        return;
      }
    });

    return Object.values(data);
  }, [quotations]);

  const totals = reportData.reduce(
    (acc, row) => ({
      completed: { rev: acc.completed.rev + row.completed.rev, count: acc.completed.count + row.completed.count },
      confirmed: { rev: acc.confirmed.rev + row.confirmed.rev, count: acc.confirmed.count + row.confirmed.count },
      totalCurr: { 
        rev: acc.totalCurr.rev + row.completed.rev + row.confirmed.rev, 
        count: acc.totalCurr.count + row.completed.count + row.confirmed.count 
      },
      upcoming: { rev: acc.upcoming.rev + row.upcoming.rev, count: acc.upcoming.count + row.upcoming.count },
      cancelled: { rev: acc.cancelled.rev + row.cancelled.rev, count: acc.cancelled.count + row.cancelled.count },
      postponed: { rev: acc.postponed.rev + row.postponed.rev, count: acc.postponed.count + row.postponed.count },
    }),
    { 
      completed: {rev: 0, count: 0}, confirmed: {rev: 0, count: 0}, totalCurr: {rev: 0, count: 0}, 
      upcoming: {rev: 0, count: 0}, cancelled: {rev: 0, count: 0}, postponed: {rev: 0, count: 0} 
    }
  );

  const formatCell = (bucket: {rev: number, count: number}) => {
    if (bucket.count === 0) return "-";
    return (
      <div className="flex flex-col text-right">
        <span className="font-medium text-xs text-muted-foreground">{bucket.count} trips</span>
        <span>{bucket.rev.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      </div>
    );
  };

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
              <TableCell className="border text-right border-gray-300">{formatCell(row.completed)}</TableCell>
              <TableCell className="border text-right border-gray-300">{formatCell(row.confirmed)}</TableCell>
              <TableCell className="border text-right bg-muted/20 border-gray-300">
                {formatCell({ rev: row.completed.rev + row.confirmed.rev, count: row.completed.count + row.confirmed.count })}
              </TableCell>
              <TableCell className="border text-right border-gray-300">{formatCell(row.upcoming)}</TableCell>
              <TableCell className="border text-right border-gray-300">{formatCell(row.cancelled)}</TableCell>
              <TableCell className="border text-right border-gray-300">{formatCell(row.postponed)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
            <TableCell className="border text-center border-gray-300" colSpan={2}>Total</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCell(totals.completed)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCell(totals.confirmed)}</TableCell>
            <TableCell className="border text-right bg-white border-gray-300">{formatCell(totals.totalCurr)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCell(totals.upcoming)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCell(totals.cancelled)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCell(totals.postponed)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
