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
  dateTo: Date;
}

export default function SpecialHiresIncomeReport({ quotations, dateTo }: Props) {
  const currentMonthDate = dateTo;
  const previousMonthDate = subMonths(currentMonthDate, 1);
  const currentMonthName = format(currentMonthDate, "MMMM");
  const currentYear = format(currentMonthDate, "yyyy");
  const previousMonthName = format(previousMonthDate, "MMMM");

  const reportData = useMemo(() => {
    const data: Record<string, any> = {
      Inside: { type: "Inside", completed: 0, confirmed: 0, upcoming: 0, cancelled: 0, postPrev: 0, postCurr: 0 },
      Outside: { type: "Outside", completed: 0, confirmed: 0, upcoming: 0, cancelled: 0, postPrev: 0, postCurr: 0 },
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
        if (isSameMonth(pickupDate, previousMonthDate)) {
          data[type].postPrev += rev;
        } else if (isSameMonth(pickupDate, currentMonthDate)) {
          data[type].postCurr += rev;
        }
        return;
      }

      // Completed in Current Month
      if (status.includes("complete") && isSameMonth(pickupDate, currentMonthDate)) {
        data[type].completed += rev;
        return;
      }

      // Confirmed in Current Month
      if ((status.includes("confirm") || status === "approved") && isSameMonth(pickupDate, currentMonthDate)) {
        data[type].confirmed += rev;
        return;
      }

      // Upcoming Hires (After today or approved future trips)
      if ((status.includes("confirm") || status === "approved") && isAfter(pickupDate, startOfDay(currentMonthDate))) {
        data[type].upcoming += rev;
      }
    });

    return Object.values(data);
  }, [quotations, currentMonthDate, previousMonthDate]);

  const totals = reportData.reduce(
    (acc, row) => ({
      completed: acc.completed + row.completed,
      confirmed: acc.confirmed + row.confirmed,
      totalCurr: acc.totalCurr + (row.completed + row.confirmed),
      upcoming: acc.upcoming + row.upcoming,
      cancelled: acc.cancelled + row.cancelled,
      postPrev: acc.postPrev + row.postPrev,
      postCurr: acc.postCurr + row.postCurr,
    }),
    { completed: 0, confirmed: 0, totalCurr: 0, upcoming: 0, cancelled: 0, postPrev: 0, postCurr: 0 }
  );

  const formatCurrency = (val: number) => (val === 0 ? "-" : val.toLocaleString("en-US", { minimumFractionDigits: 2 }));

  return (
    <div className="rounded-md border overflow-x-auto">
      <div className="bg-white px-4 py-3 border-b text-center">
        <h2 className="text-lg font-bold text-gray-800">
          Special Hires Income Report - Upto {format(new Date(), "do MMMM yyyy")}
        </h2>
      </div>
      <Table className="text-sm border-collapse">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead rowSpan={2} className="border text-center font-bold w-12 border-gray-300">#</TableHead>
            <TableHead rowSpan={2} className="border text-center font-bold min-w-[100px] border-gray-300">Hire Type</TableHead>
            <TableHead colSpan={2} className="border text-center font-bold border-gray-300 bg-muted/30">{currentMonthName} ({currentYear})</TableHead>
            <TableHead rowSpan={2} className="border text-center font-bold bg-muted/80 border-gray-300">Total {currentMonthName}</TableHead>
            <TableHead rowSpan={2} className="border text-center font-bold border-gray-300">Upcoming Hires</TableHead>
            <TableHead rowSpan={2} className="border text-center font-bold border-gray-300">Cancelled</TableHead>
            <TableHead colSpan={2} className="border text-center font-bold border-gray-300 bg-muted/30">Postponed</TableHead>
          </TableRow>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="border text-center font-bold border-gray-300 bg-white">Completed</TableHead>
            <TableHead className="border text-center font-bold border-gray-300 bg-white">Confirmed</TableHead>
            <TableHead className="border text-center font-bold border-gray-300 bg-white">{previousMonthName}</TableHead>
            <TableHead className="border text-center font-bold border-gray-300 bg-white">{currentMonthName}</TableHead>
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
              <TableCell className="border text-right border-gray-300">{formatCurrency(row.postPrev)}</TableCell>
              <TableCell className="border text-right border-gray-300">{formatCurrency(row.postCurr)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
            <TableCell className="border text-center border-gray-300" colSpan={2}>Total</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.completed)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.confirmed)}</TableCell>
            <TableCell className="border text-right bg-white border-gray-300">{formatCurrency(totals.totalCurr)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.upcoming)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.cancelled)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.postPrev)}</TableCell>
            <TableCell className="border text-right border-gray-300">{formatCurrency(totals.postCurr)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
