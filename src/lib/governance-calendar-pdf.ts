import jsPDF from 'jspdf';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import type { GovernanceOccurrence } from '@/hooks/useGovernanceOccurrences';

interface Holiday {
  holiday_date: string;
  holiday_name: string;
  type: string;
  is_mercantile: boolean;
}

interface PDFGeneratorOptions {
  occurrences: GovernanceOccurrence[];
  holidays: Holiday[];
  months: Date[];
  includeHolidays: boolean;
  showCompanyNames: boolean;
  includeLegend: boolean;
  filterInfo?: string;
}

const statusColors: Record<string, { r: number; g: number; b: number }> = {
  Planned: { r: 59, g: 130, b: 246 },    // Blue
  Due: { r: 234, g: 179, b: 8 },          // Yellow
  Submitted: { r: 34, g: 197, b: 94 },    // Green
  Completed: { r: 156, g: 163, b: 175 },  // Gray
  Skipped: { r: 239, g: 68, b: 68 },      // Red
  'N/A': { r: 209, g: 213, b: 219 },      // Light Gray
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// A4 dimensions in mm
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const CONTENT_HEIGHT = PAGE_HEIGHT - 2 * MARGIN;

export const generateGovernanceCalendarPDF = (options: PDFGeneratorOptions): void => {
  const { occurrences, holidays, months, includeHolidays, showCompanyNames, includeLegend, filterInfo } = options;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  months.forEach((monthDate, monthIndex) => {
    if (monthIndex > 0) {
      pdf.addPage();
    }
    
    renderMonthPage(pdf, monthDate, occurrences, holidays, {
      includeHolidays,
      showCompanyNames,
      includeLegend,
      filterInfo,
    });
  });

  // Generate filename with date range
  const startMonth = format(months[0], 'MMM-yyyy');
  const endMonth = months.length > 1 ? format(months[months.length - 1], 'MMM-yyyy') : '';
  const filename = endMonth 
    ? `governance-calendar-${startMonth}-to-${endMonth}.pdf`
    : `governance-calendar-${startMonth}.pdf`;

  pdf.save(filename);
};

const renderMonthPage = (
  pdf: jsPDF,
  monthDate: Date,
  allOccurrences: GovernanceOccurrence[],
  allHolidays: Holiday[],
  options: {
    includeHolidays: boolean;
    showCompanyNames: boolean;
    includeLegend: boolean;
    filterInfo?: string;
  }
) => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  
  // Filter occurrences and holidays for this month
  const monthOccurrences = allOccurrences.filter(occ => {
    const occDate = new Date(occ.scheduled_date);
    return occDate >= monthStart && occDate <= monthEnd;
  });
  
  const monthHolidays = allHolidays.filter(h => {
    const hDate = new Date(h.holiday_date);
    return hDate >= monthStart && hDate <= monthEnd;
  });

  // Header
  let y = MARGIN;
  pdf.setFillColor(30, 41, 59); // Slate-800
  pdf.rect(MARGIN, y, CONTENT_WIDTH, 16, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`GOVERNANCE CALENDAR - ${format(monthDate, 'MMMM yyyy').toUpperCase()}`, PAGE_WIDTH / 2, y + 10, { align: 'center' });
  
  y += 18;
  
  // Filter info and generation date
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  const generatedText = `Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`;
  pdf.text(generatedText, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  
  if (options.filterInfo) {
    pdf.text(options.filterInfo, MARGIN, y);
  }
  
  y += 6;

  // Weekday headers
  const cellWidth = CONTENT_WIDTH / 7;
  const headerHeight = 8;
  
  pdf.setFillColor(241, 245, 249); // Slate-100
  pdf.rect(MARGIN, y, CONTENT_WIDTH, headerHeight, 'F');
  
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105); // Slate-600
  pdf.setFont('helvetica', 'bold');
  
  WEEKDAYS.forEach((day, i) => {
    const x = MARGIN + i * cellWidth + cellWidth / 2;
    pdf.text(day, x, y + 5.5, { align: 'center' });
  });
  
  y += headerHeight + 1;

  // Calculate available height for calendar
  const legendHeight = options.includeLegend ? 15 : 0;
  const availableHeight = PAGE_HEIGHT - y - MARGIN - legendHeight - 5;
  const totalRows = Math.ceil((startDayOfWeek + daysInMonth.length) / 7);
  const cellHeight = Math.min(availableHeight / totalRows, 38);

  // Draw calendar grid
  let dayIndex = 0;
  let currentRow = 0;

  while (dayIndex < daysInMonth.length) {
    const rowY = y + currentRow * cellHeight;
    
    for (let col = 0; col < 7; col++) {
      const cellX = MARGIN + col * cellWidth;
      const isBeforeStart = currentRow === 0 && col < startDayOfWeek;
      
      if (isBeforeStart) {
        // Empty cell
        pdf.setFillColor(248, 250, 252);
        pdf.rect(cellX, rowY, cellWidth, cellHeight, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(cellX, rowY, cellWidth, cellHeight, 'S');
      } else if (dayIndex < daysInMonth.length) {
        const currentDate = daysInMonth[dayIndex];
        const dayOccurrences = monthOccurrences.filter(occ => 
          isSameDay(new Date(occ.scheduled_date), currentDate)
        );
        const dayHolidays = options.includeHolidays 
          ? monthHolidays.filter(h => isSameDay(new Date(h.holiday_date), currentDate))
          : [];
        
        renderDayCell(pdf, cellX, rowY, cellWidth, cellHeight, currentDate, dayOccurrences, dayHolidays, options.showCompanyNames);
        dayIndex++;
      }
    }
    currentRow++;
  }

  // Legend at bottom
  if (options.includeLegend) {
    const legendY = PAGE_HEIGHT - MARGIN - 10;
    renderLegend(pdf, MARGIN, legendY, CONTENT_WIDTH);
  }
};

const renderDayCell = (
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  date: Date,
  occurrences: GovernanceOccurrence[],
  holidays: Holiday[],
  showCompanyNames: boolean
) => {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const hasHoliday = holidays.length > 0;
  
  // Cell background
  if (hasHoliday) {
    pdf.setFillColor(254, 242, 242); // Red-50
  } else if (isWeekend) {
    pdf.setFillColor(248, 250, 252); // Slate-50
  } else {
    pdf.setFillColor(255, 255, 255);
  }
  pdf.rect(x, y, width, height, 'F');
  
  // Cell border
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.2);
  pdf.rect(x, y, width, height, 'S');
  
  // Date number
  const dateNum = format(date, 'd');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hasHoliday ? 220 : 51, hasHoliday ? 38 : 65, hasHoliday ? 38 : 85);
  pdf.text(dateNum, x + 2, y + 5);
  
  // Holiday emoji
  if (hasHoliday) {
    pdf.setFontSize(6);
    pdf.text('🏖️', x + width - 6, y + 4);
  }
  
  // Occurrence count badge
  if (occurrences.length > 0) {
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(x + width - 8, y + 1, 6, 4, 1, 1, 'F');
    pdf.setFontSize(5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(occurrences.length), x + width - 5, y + 3.8, { align: 'center' });
  }
  
  let contentY = y + 8;
  const maxContentY = y + height - 2;
  const lineHeight = 3.2;
  
  // Show holiday name (abbreviated)
  if (hasHoliday && holidays[0]) {
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(220, 38, 38);
    const holidayText = truncateText(holidays[0].holiday_name, width - 4, pdf);
    pdf.text(holidayText, x + 2, contentY);
    contentY += lineHeight;
  }
  
  // Render occurrences
  pdf.setFont('helvetica', 'normal');
  const maxItems = Math.floor((maxContentY - contentY) / lineHeight);
  
  occurrences.slice(0, maxItems).forEach((occ, idx) => {
    if (contentY + lineHeight > maxContentY) return;
    
    // Status color dot
    const statusColor = statusColors[occ.status] || statusColors['N/A'];
    pdf.setFillColor(statusColor.r, statusColor.g, statusColor.b);
    pdf.circle(x + 3, contentY - 0.8, 0.8, 'F');
    
    // Occurrence text
    pdf.setFontSize(5);
    pdf.setTextColor(51, 65, 85);
    
    let text = '';
    if (showCompanyNames) {
      const company = occ.governance_item.companies?.name?.substring(0, 8) || '';
      const sbu = occ.governance_item.sbus?.name?.substring(0, 5) || '';
      const prefix = sbu ? `${company}-${sbu}` : company;
      text = `${prefix}: ${occ.governance_item.title}`;
    } else {
      text = occ.governance_item.title;
    }
    
    text = truncateText(text, width - 8, pdf);
    pdf.text(text, x + 5, contentY);
    contentY += lineHeight;
  });
  
  // "More items" indicator
  if (occurrences.length > maxItems) {
    pdf.setFontSize(4.5);
    pdf.setTextColor(59, 130, 246);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`+${occurrences.length - maxItems} more`, x + 2, maxContentY);
  }
};

const renderLegend = (pdf: jsPDF, x: number, y: number, width: number) => {
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(x, y, width, 12, 2, 2, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(x, y, width, 12, 2, 2, 'S');
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);
  pdf.text('STATUS LEGEND:', x + 4, y + 5);
  
  const statuses = ['Planned', 'Due', 'Submitted', 'Completed', 'Skipped'];
  const startX = x + 35;
  const spacing = (width - 40) / statuses.length;
  
  statuses.forEach((status, i) => {
    const statusX = startX + i * spacing;
    const color = statusColors[status];
    
    pdf.setFillColor(color.r, color.g, color.b);
    pdf.circle(statusX, y + 5, 1.5, 'F');
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(71, 85, 105);
    pdf.text(status, statusX + 3, y + 5.8);
  });
  
  // Holiday indicator
  pdf.setFontSize(5);
  pdf.text('🏖️ Holiday', x + width - 20, y + 5.5);
};

const truncateText = (text: string, maxWidth: number, pdf: jsPDF): string => {
  if (pdf.getTextWidth(text) <= maxWidth) return text;
  
  let truncated = text;
  while (pdf.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
};
