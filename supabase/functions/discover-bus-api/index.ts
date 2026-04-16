import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common field patterns for GPS/Fleet APIs
const FIELD_PATTERNS = {
  latitude: ['lat', 'latitude', 'pos.y', 'position.lat', 'gps_lat', 'y', 'location.lat'],
  longitude: ['lng', 'lon', 'longitude', 'pos.x', 'position.lng', 'gps_lng', 'x', 'location.lng'],
  speed: ['speed', 'spd', 'velocity', 'speed_kmh', 'speed_kph', 'current_speed', 'pos.s'],
  odometer: ['odometer', 'mileage', 'odo', 'total_km', 'km', 'distance', 'total_distance', 'can_odometer'],
  fuel: ['fuel', 'fuel_level', 'fuel_liters', 'fuel_percent', 'tank_level', 'fuel_remaining'],
  heading: ['heading', 'course', 'direction', 'bearing', 'pos.c', 'azimuth'],
  timestamp: ['timestamp', 'time', 'last_update', 'updated_at', 'pos.t', 'datetime', 'gps_time'],
  status: ['status', 'state', 'vehicle_status', 'engine_status', 'ignition'],
  battery: ['battery', 'battery_voltage', 'voltage', 'pwr_ext', 'external_power'],
  altitude: ['altitude', 'alt', 'elevation', 'pos.z', 'height'],
  satellites: ['satellites', 'sat_count', 'gps_satellites', 'pos.sc', 'sats'],
};

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  transform?: string;
}

interface DiscoveryResult {
  success: boolean;
  schema?: any;
  suggestedMappings?: FieldMapping[];
  sampleData?: any;
  error?: string;
}

// Extract value from nested object using dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Flatten nested object to dot notation keys
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj || {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  
  return result;
}

// Analyze field and suggest mapping
function analyzeField(fieldName: string, value: any): FieldMapping | null {
  const lowerFieldName = fieldName.toLowerCase();
  
  for (const [targetField, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerFieldName === pattern.toLowerCase() || 
          lowerFieldName.includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(lowerFieldName)) {
        
        // Validate value type matches expected
        let confidence = 0.7;
        
        if (targetField === 'latitude' && typeof value === 'number' && value >= -90 && value <= 90) {
          confidence = 0.95;
        } else if (targetField === 'longitude' && typeof value === 'number' && value >= -180 && value <= 180) {
          confidence = 0.95;
        } else if (targetField === 'speed' && typeof value === 'number' && value >= 0 && value <= 300) {
          confidence = 0.9;
        } else if (targetField === 'odometer' && typeof value === 'number' && value >= 0) {
          confidence = 0.85;
        } else if (targetField === 'fuel' && typeof value === 'number') {
          confidence = 0.8;
        } else if (targetField === 'timestamp' && (typeof value === 'number' || typeof value === 'string')) {
          confidence = 0.85;
        }
        
        return {
          sourceField: fieldName,
          targetField,
          confidence,
          transform: targetField === 'timestamp' && typeof value === 'number' ? 'unix_to_iso' : undefined
        };
      }
    }
  }
  
  return null;
}

// Discover API schema and suggest field mappings
function discoverSchema(data: any): { schema: any; mappings: FieldMapping[] } {
  const mappings: FieldMapping[] = [];
  let dataToAnalyze = data;
  
  // Handle array responses - get first item
  if (Array.isArray(data)) {
    dataToAnalyze = data[0];
  } else if (data.items && Array.isArray(data.items)) {
    dataToAnalyze = data.items[0];
  } else if (data.vehicles && Array.isArray(data.vehicles)) {
    dataToAnalyze = data.vehicles[0];
  } else if (data.data && Array.isArray(data.data)) {
    dataToAnalyze = data.data[0];
  } else if (data.result && Array.isArray(data.result)) {
    dataToAnalyze = data.result[0];
  }
  
  if (!dataToAnalyze) {
    return { schema: {}, mappings: [] };
  }
  
  // Flatten the object for analysis
  const flattened = flattenObject(dataToAnalyze);
  
  // Analyze each field
  for (const [fieldName, value] of Object.entries(flattened)) {
    const mapping = analyzeField(fieldName, value);
    if (mapping) {
      // Check if we already have a mapping for this target field with higher confidence
      const existingIdx = mappings.findIndex(m => m.targetField === mapping.targetField);
      if (existingIdx >= 0) {
        if (mappings[existingIdx].confidence < mapping.confidence) {
          mappings[existingIdx] = mapping;
        }
      } else {
        mappings.push(mapping);
      }
    }
  }
  
  return {
    schema: {
      type: Array.isArray(data) ? 'array' : 'object',
      sampleKeys: Object.keys(flattened),
      structure: dataToAnalyze
    },
    mappings
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiEndpoint, apiKey, authType, deviceIdentifier, testOnly } = await req.json();

    if (!apiEndpoint) {
      return new Response(
        JSON.stringify({ success: false, error: 'API endpoint is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[Discover] Testing API: ${apiEndpoint}`);

    // Build request headers based on auth type
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authType === 'bearer' && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (authType === 'api_key' && apiKey) {
      headers['X-API-Key'] = apiKey;
    } else if (authType === 'basic' && apiKey) {
      headers['Authorization'] = `Basic ${btoa(apiKey)}`;
    }

    // Build URL with device identifier if provided
    let url = apiEndpoint;
    if (deviceIdentifier) {
      url = url.includes('?') 
        ? `${url}&device_id=${deviceIdentifier}` 
        : `${url}?device_id=${deviceIdentifier}`;
    }

    // Make test request
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `API returned status ${response.status}: ${response.statusText}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const data = await response.json();
    console.log('[Discover] API response received:', JSON.stringify(data).substring(0, 500));

    // If just testing connection, return success
    if (testOnly) {
      return new Response(
        JSON.stringify({ success: true, message: 'API connection successful' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Discover schema and suggest mappings
    const { schema, mappings } = discoverSchema(data);

    const result: DiscoveryResult = {
      success: true,
      schema,
      suggestedMappings: mappings,
      sampleData: JSON.stringify(data).substring(0, 2000)
    };

    console.log(`[Discover] Found ${mappings.length} field mappings`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Discover] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
