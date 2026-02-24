import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const MISSING_GPS_BUSES = [
  { bus_no: "NE 2266", type: "Regular", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NE 2267", type: "Regular", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NE 2097", type: "Regular", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NE 2098", type: "Regular", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NE 2099", type: "Regular", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NE 2100", type: "Regular", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NE 2101", type: "Regular", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NE 2103", type: "Regular", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NE 2270", type: "Regular", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NG 8220", type: "Imported Bus", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NG 8224", type: "Imported Bus", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NG 8225", type: "Imported Bus", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NG 8226", type: "Imported Bus", model: "Unknown", capacity: 50, year: 2020 },
  { bus_no: "NG 8229", type: "Imported Bus", model: "Unknown", capacity: 50, year: 2020 },
];

export async function seedMissingGPSBuses() {
  try {
    console.log("🚌 Starting to seed missing GPS buses...");

    const { data, error } = await supabase
      .from("buses")
      .upsert(
        MISSING_GPS_BUSES.map((bus) => ({
          bus_no: bus.bus_no,
          type: bus.type,
          model: bus.model,
          capacity: bus.capacity,
          year: bus.year,
          status: "active" as const,
        })),
        {
          onConflict: "bus_no",
          ignoreDuplicates: true,
        }
      )
      .select();

    if (error) {
      console.error("❌ Error seeding GPS buses:", error);
      toast.error("Failed to add GPS buses to database");
      return { success: false, error };
    }

    console.log(`✅ Successfully seeded ${data?.length || 0} GPS buses`);
    toast.success(`Added ${data?.length || 0} GPS buses to database`);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Exception seeding GPS buses:", error);
    toast.error("Failed to add GPS buses");
    return { success: false, error };
  }
}
