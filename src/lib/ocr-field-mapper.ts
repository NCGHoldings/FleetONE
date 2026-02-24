import { calculateSimilarity } from './ocr-processor';

/**
 * Comprehensive mapping between Sinhala/English field names and Quick Entry field names
 */
export const fieldMappings: Record<string, string> = {
  // Income fields - Sinhala
  'බස්රථ': 'bus_collection',
  'බස් රථ': 'bus_collection',
  'බස් එකතුව': 'bus_collection',
  'බස්': 'bus_collection',
  'ඇවිලා': 'call_booking',
  'ඇමතුම්': 'call_booking',
  'කෝල්': 'call_booking',
  'ඒජන්ට්': 'agent_booking',
  'නියෝජිත': 'agent_booking',
  'ගමන් මල්': 'luggage_income',
  'මල්': 'luggage_income',
  'විශේෂ': 'special_income',
  'අමතර': 'special_income',
  'වෙනත්': 'other_income',
  
  // Income fields - English
  'bus collection': 'bus_collection',
  'bus': 'bus_collection',
  'collection': 'bus_collection',
  'call booking': 'call_booking',
  'call': 'call_booking',
  'booking': 'call_booking',
  'agent booking': 'agent_booking',
  'agent': 'agent_booking',
  'luggage income': 'luggage_income',
  'luggage': 'luggage_income',
  'special income': 'special_income',
  'special': 'special_income',
  'other income': 'other_income',
  'other': 'other_income',
  
  // Expense fields - Sinhala
  'ඩීසල්': 'fuel_cost',
  'ඩීසල් මිල': 'fuel_cost',
  'ඩීසල් වියදම': 'fuel_cost',
  'ඉන්ධන': 'fuel_cost',
  'ඩිසල්': 'fuel_cost',
  'රියදුරු': 'driver_salary',
  'රියදුරු වැටුප': 'driver_salary',
  'ඩ්‍රයිවර්': 'driver_salary',
  'රියදුරා': 'driver_salary',
  'ඩ්රයිවර්': 'driver_salary',
  'කොන්දොස්තර': 'conductor_salary',
  'කොන්': 'conductor_salary',
  'හෙල්පර්': 'conductor_salary',
  'කොන්ඩක්ටර්': 'conductor_salary',
  'රනර්': 'runner',
  'කෑම': 'food',
  'ආහාර': 'food',
  'ආහර': 'food',
  'කෑම වියදම': 'food',
  'භෝජන': 'food',
  'යාත්රා': 'parking',
  'වාහන නැවැත්වීම': 'parking',
  'පාර්කින්': 'parking',
  'පාකින්': 'parking',
  'විදවණ': 'body_wash',
  'සෝදනය': 'body_wash',
  'වොෂ්': 'body_wash',
  'වෝෂ්': 'body_wash',
  'සෝදා': 'body_wash',
  'පොලීසිය': 'police',
  'පොලිස්': 'police',
  'දඩ': 'police',
  'දඩයම': 'police',
  'අළුත්වැඩියා': 'repair',
  'අළුත්වැඩියාව': 'repair',
  'අලුත්වැඩියා': 'repair',
  'අළුත්වැඩ': 'repair',
  'රිපෙයාර්': 'repair',
  'ග්‍රීස් ගැසීම': 'repair',      // Greasing service
  'ග්රීස් ගැසීම': 'repair',       // Alternative spelling
  'කම්මැලි': 'labour',
  'කම්කරු': 'labour',
  'කම්හල': 'labour',
  'වැඩ': 'labour',
  'තෙල්': 'oil',
  'ඔයිල්': 'oil',
  'එන්ජින් තෙල්': 'oil',
  'මෝටර් තෙල්': 'oil',
  'ග්‍රීස්': 'grease',
  'ග්රීස්': 'grease',
  'ග්‍රීස් මැද': 'grease',
  'ග්රීස් මැද': 'grease',
  'ලුබ්‍රිකන්ට්': 'grease',
  'අධිවේගී': 'highway_toll',
  'හයිවේ': 'highway_toll',
  'හයිවේ මාර්ගය': 'highway_toll',
  'හයිවේ ගාස්තු': 'highway_toll',
  'හයිවෙ': 'highway_toll',
  'අධිවේගී මාර්ග': 'highway_toll',
  'ටෝල්': 'highway_toll',
  'ටයර්': 'tyre_tube',
  'ටයර': 'tyre_tube',
  'ටියුබ්': 'tyre_tube',
  'ටයුබ්': 'tyre_tube',
  'ටයර් ටියුබ්': 'tyre_tube',
  'අමතර කොටස්': 'spare_parts',
  'පාර්ට්ස්': 'spare_parts',
  'කොටස්': 'spare_parts',
  'රක්ෂණ': 'insurance',
  'ඉන්ෂුවරන්ස්': 'insurance',
  'බලපත්‍ර': 'permit',
  'බලපත්‍රය': 'permit',
  'පර්මිට්': 'permit',
  'දුරකථන': 'phone',
  'ෆෝන්': 'phone',
  'එයාර්ටයිම්': 'phone',
  'කාර්මික': 'workshop',
  'වැඩමුළුව': 'workshop',
  'ගරාජය': 'workshop',
  
  // Expense fields - English
  'diesel': 'fuel_cost',
  'fuel': 'fuel_cost',
  'fuel cost': 'fuel_cost',
  'disel': 'fuel_cost',
  'deisel': 'fuel_cost',
  'driver': 'driver_salary',
  'driver salary': 'driver_salary',
  'dryvr': 'driver_salary',
  'conductor': 'conductor_salary',
  'conductor salary': 'conductor_salary',
  'helper': 'conductor_salary',
  'conducter': 'conductor_salary',
  'runner': 'runner',
  'food': 'food',
  'meals': 'food',
  'meal': 'food',
  'foods': 'food',
  'staff meals': 'food',
  'staff meal': 'food',
  'staff welfare': 'food',
  'meals & welfare': 'food',
  'welfare': 'food',
  'parking': 'parking',
  'park': 'parking',
  'body wash': 'body_wash',
  'wash': 'body_wash',
  'cleaning': 'body_wash',
  'vehicle wash': 'body_wash',
  'police': 'police',
  'fine': 'police',
  'penalty': 'police',
  'fines': 'police',
  'repair': 'repair',
  'repairs': 'repair',
  'maintenance': 'repair',
  'repare': 'repair',
  'labour': 'labour',
  'labor': 'labour',
  'worker': 'labour',
  'workers': 'labour',
  'oil': 'oil',
  'engine oil': 'oil',
  'motor oil': 'oil',
  'grease': 'grease',
  'gris': 'grease',
  'lubricant': 'grease',
  'highway': 'highway_toll',
  'highway toll': 'highway_toll',
  'toll': 'highway_toll',
  'hiywe': 'highway_toll',
  'expressway': 'highway_toll',
  'tyre': 'tyre_tube',
  'tire': 'tyre_tube',
  'tube': 'tyre_tube',
  'tyer': 'tyre_tube',
  'tyre tube': 'tyre_tube',
  'spare parts': 'spare_parts',
  'parts': 'spare_parts',
  'spares': 'spare_parts',
  'insurance': 'insurance',
  'insurence': 'insurance',
  'permit': 'permit',
  'permits': 'permit',
  'license': 'permit',
  'licence': 'permit',
  'phone': 'phone',
  'mobile': 'phone',
  'airtime': 'phone',
  'communication': 'phone',
  'workshop': 'workshop',
  'garage': 'workshop',
};

/**
 * Map OCR field name to Quick Entry field name
 * Uses exact match first, then fuzzy matching
 */
export function mapOCRFieldToQuickEntry(ocrFieldName: string): string | null {
  const normalized = ocrFieldName.toLowerCase().trim();
  
  // Direct exact match
  if (fieldMappings[normalized]) {
    return fieldMappings[normalized];
  }
  
  // Fuzzy match with similarity threshold of 0.65 (lower for handwritten text)
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  for (const [key, value] of Object.entries(fieldMappings)) {
    const score = calculateSimilarity(normalized, key);
    if (score > 0.65 && score > bestScore) {
      bestScore = score;
      bestMatch = value;
    }
  }
  
  return bestMatch;
}

/**
 * Map all extracted fields to Quick Entry format
 */
export function mapExtractedFields(
  incomeFields: Record<string, number>,
  expenseFields: Record<string, number>
): {
  income: Record<string, number>;
  expenses: Record<string, number>;
  unmapped: { field: string; value: number; section: 'income' | 'expense' }[];
} {
  const income: Record<string, number> = {};
  const expenses: Record<string, number> = {};
  const unmapped: { field: string; value: number; section: 'income' | 'expense' }[] = [];
  
  // Map income fields
  for (const [field, value] of Object.entries(incomeFields)) {
    const mappedField = mapOCRFieldToQuickEntry(field);
    if (mappedField) {
      income[mappedField] = value;
    } else {
      unmapped.push({ field, value, section: 'income' });
    }
  }
  
  // Map expense fields
  for (const [field, value] of Object.entries(expenseFields)) {
    const mappedField = mapOCRFieldToQuickEntry(field);
    if (mappedField) {
      expenses[mappedField] = value;
    } else {
      unmapped.push({ field, value, section: 'expense' });
    }
  }
  
  return { income, expenses, unmapped };
}

/**
 * Get all possible field names for a given Quick Entry field
 * Useful for displaying hints to users
 */
export function getFieldVariations(quickEntryField: string): string[] {
  const variations: string[] = [];
  
  for (const [key, value] of Object.entries(fieldMappings)) {
    if (value === quickEntryField) {
      variations.push(key);
    }
  }
  
  return variations;
}
