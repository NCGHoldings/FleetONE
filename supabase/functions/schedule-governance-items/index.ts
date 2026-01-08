import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { addMonths, format, parse } from 'https://esm.sh/date-fns@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FrequencyParams {
  weekday?: string;
  day?: number;
  weekNumber?: number;
  window?: string;
  fallbackWeekday?: string;
  includeWeekends?: boolean;
  intervalDays?: number;
  startAnchor?: string;
}

interface GovernanceItem {
  id: string;
  frequency_rule_id: string;
  submission_rule_id?: string;
}

interface FrequencyRule {
  id: string;
  rule_type: string;
  params: FrequencyParams;
  description: string;
}

interface Holiday {
  holiday_date: string;
  holiday_name: string;
  type: string;
  is_mercantile: boolean;
}

const WEEKDAY_MAP: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHolidayOrWeekend(date: Date, holidayDates: string[]): boolean {
  if (isWeekend(date)) return true;
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidayDates.includes(dateStr);
}

function rollBackToWorkingDay(
  date: Date, 
  holidayDates: string[], 
  holidayData: Holiday[]
): { date: Date; adjusted: boolean; reason?: string; originalDate?: Date } {
  const originalDate = new Date(date);
  let adjustedDate = new Date(date);
  let wasAdjusted = false;
  let reason = '';

  while (isHolidayOrWeekend(adjustedDate, holidayDates)) {
    const dateStr = format(adjustedDate, 'yyyy-MM-dd');
    const holiday = holidayData.find(h => h.holiday_date === dateStr);
    
    if (holiday) {
      reason = `Moved from ${format(originalDate, 'MMM dd')} due to ${holiday.holiday_name}${holiday.is_mercantile ? ' (Mercantile Holiday)' : ''}`;
    } else if (isWeekend(adjustedDate)) {
      reason = `Moved from ${format(originalDate, 'MMM dd')} (weekend)`;
    }
    
    adjustedDate.setDate(adjustedDate.getDate() - 1);
    wasAdjusted = true;
  }

  return { date: adjustedDate, adjusted: wasAdjusted, reason: wasAdjusted ? reason : undefined, originalDate: wasAdjusted ? originalDate : undefined };
}

function generateOccurrences(
  rule: FrequencyRule,
  startDate: Date,
  endDate: Date,
  holidayDates: string[],
  holidayData: Holiday[]
): Array<{ date: Date; adjusted: boolean; reason?: string; originalDate?: Date }> {
  const occurrences: Array<{ date: Date; adjusted: boolean; reason?: string; originalDate?: Date }> = [];
  const { rule_type, params } = rule;

  switch (rule_type) {
    case 'DAILY': {
      const includeWeekends = params.includeWeekends ?? false;
      let current = new Date(startDate);
      while (current <= endDate) {
        if (includeWeekends || !isWeekend(current)) {
          occurrences.push(rollBackToWorkingDay(new Date(current), holidayDates, holidayData));
        }
        current.setDate(current.getDate() + 1);
      }
      break;
    }

    case 'WEEKLY_BY_WEEKDAY': {
      if (!params.weekday) break;
      const targetDay = WEEKDAY_MAP[params.weekday];
      let current = new Date(startDate);
      while (current.getDay() !== targetDay && current <= endDate) {
        current.setDate(current.getDate() + 1);
      }
      while (current <= endDate) {
        occurrences.push(rollBackToWorkingDay(new Date(current), holidayDates, holidayData));
        current.setDate(current.getDate() + 7);
      }
      break;
    }

    case 'BIWEEKLY_BY_WEEKDAY': {
      if (!params.weekday || !params.startAnchor) break;
      const targetDay = WEEKDAY_MAP[params.weekday];
      let current = parse(params.startAnchor, 'yyyy-MM-dd', new Date());
      while (current < startDate) {
        current.setDate(current.getDate() + 14);
      }
      while (current <= endDate) {
        if (current.getDay() === targetDay) {
          occurrences.push(rollBackToWorkingDay(new Date(current), holidayDates, holidayData));
        }
        current.setDate(current.getDate() + 14);
      }
      break;
    }

    case 'MONTHLY_BY_DAY': {
      if (!params.day) break;
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (current <= endDate) {
        const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(params.day, lastDay);
        const targetDate = new Date(current.getFullYear(), current.getMonth(), targetDay);
        if (targetDate >= startDate && targetDate <= endDate) {
          occurrences.push(rollBackToWorkingDay(targetDate, holidayDates, holidayData));
        }
        current = addMonths(current, 1);
      }
      break;
    }

    case 'MONTH_END': {
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (current <= endDate) {
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        if (monthEnd >= startDate && monthEnd <= endDate) {
          occurrences.push(rollBackToWorkingDay(monthEnd, holidayDates, holidayData));
        }
        current = addMonths(current, 1);
      }
      break;
    }

    case 'MONTHLY_NTH_WEEKDAY': {
      if (!params.weekNumber || !params.weekday) break;
      const targetDay = WEEKDAY_MAP[params.weekday];
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (current <= endDate) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        const weekdayOccurrences: Date[] = [];
        for (let d = monthStart; d <= monthEnd; d.setDate(d.getDate() + 1)) {
          if (d.getDay() === targetDay) {
            weekdayOccurrences.push(new Date(d));
          }
        }
        if (weekdayOccurrences.length >= params.weekNumber) {
          const targetDate = weekdayOccurrences[params.weekNumber - 1];
          if (targetDate >= startDate && targetDate <= endDate) {
            occurrences.push(rollBackToWorkingDay(targetDate, holidayDates, holidayData));
          }
        }
        current = addMonths(current, 1);
      }
      break;
    }

    case 'RELATIVE_WINDOW': {
      if (!params.window) break;
      const [startDay, endDay] = params.window.split('-').map(Number);
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (current <= endDate) {
        const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        const windowStart = Math.min(startDay, lastDay);
        const windowEnd = Math.min(endDay, lastDay);
        let found = false;
        for (let day = windowStart; day <= windowEnd; day++) {
          const candidateDate = new Date(current.getFullYear(), current.getMonth(), day);
          if (candidateDate >= startDate && candidateDate <= endDate) {
            if (!isHolidayOrWeekend(candidateDate, holidayDates)) {
              occurrences.push({ date: candidateDate, adjusted: false });
              found = true;
              break;
            }
          }
        }
        if (!found) {
          const windowEndDate = new Date(current.getFullYear(), current.getMonth(), windowEnd);
          if (windowEndDate >= startDate && windowEndDate <= endDate) {
            occurrences.push(rollBackToWorkingDay(windowEndDate, holidayDates, holidayData));
          }
        }
        current = addMonths(current, 1);
      }
      break;
    }
  }

  return occurrences;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting governance scheduling engine...');

    // Calculate date range: today to 12 months from now
    const startDate = new Date();
    const endDate = addMonths(startDate, 12);
    console.log(`📅 Generating occurrences from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    // Load holidays
    const { data: holidaysData, error: holidaysError } = await supabase
      .from('holidays')
      .select('holiday_date, holiday_name, type, is_mercantile')
      .gte('holiday_date', format(startDate, 'yyyy-MM-dd'))
      .lte('holiday_date', format(endDate, 'yyyy-MM-dd'));

    if (holidaysError) throw holidaysError;

    const holidayData = (holidaysData || []) as Holiday[];
    const holidayDates = holidayData.map((h: Holiday) => h.holiday_date);
    console.log(`🏖️ Loaded ${holidayData.length} holidays`);

    // Load active governance items with their frequency rules
    const { data: items, error: itemsError } = await supabase
      .from('governance_items')
      .select(`
        id, 
        frequency_rule_id,
        submission_rule_id,
        frequency_rules!inner(id, rule_type, params, description)
      `)
      .eq('is_active', true);

    if (itemsError) throw itemsError;

    console.log(`📋 Processing ${items?.length || 0} governance items`);

    let totalGenerated = 0;

    // Process each item
    for (const item of items || []) {
      const rule = (item as any).frequency_rules;
      
      if (!rule || rule.rule_type === 'ADHOC') {
        console.log(`⏭️ Skipping ADHOC item: ${item.id}`);
        continue;
      }

      console.log(`🔧 Generating occurrences for item ${item.id} with rule ${rule.rule_type}`);

      // Generate occurrences
      const occurrences = generateOccurrences(rule, startDate, endDate, holidayDates, holidayData);

      console.log(`✅ Generated ${occurrences.length} occurrences for item ${item.id}`);

      // Upsert occurrences (don't override manual edits)
      for (const { date, adjusted, reason, originalDate } of occurrences) {
        const scheduledDate = format(date, 'yyyy-MM-dd');
        
        // Check if already exists with manual override
        const { data: existing } = await supabase
          .from('governance_occurrences')
          .select('id, manual_override')
          .eq('item_id', item.id)
          .eq('scheduled_date', scheduledDate)
          .single();

        // Skip if manually overridden
        if (existing?.manual_override) {
          console.log(`⚠️ Skipping manually overridden occurrence: ${item.id} on ${scheduledDate}`);
          continue;
        }

        // Upsert occurrence
        const { error: upsertError } = await supabase
          .from('governance_occurrences')
          .upsert({
            item_id: item.id,
            scheduled_date: scheduledDate,
            original_rule_text: `${rule.description} (${rule.rule_type})`,
            is_holiday_adjusted: adjusted,
            adjusted_reason: reason || null,
            original_scheduled_date: originalDate ? format(originalDate, 'yyyy-MM-dd') : null,
            status: 'Planned',
            created_by_engine_at: new Date().toISOString(),
          }, {
            onConflict: 'item_id,scheduled_date'
          });

        if (upsertError) {
          console.error(`❌ Error upserting occurrence:`, upsertError);
        } else {
          totalGenerated++;
        }
      }
    }

    console.log(`🎉 Scheduling complete! Generated ${totalGenerated} total occurrences`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully generated ${totalGenerated} occurrences for ${items?.length || 0} items`,
        itemsProcessed: items?.length || 0,
        occurrencesGenerated: totalGenerated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in scheduling engine:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
