import { supabase } from "@/integrations/supabase/client";

/**
 * Synchronizes Sales Bus Models (Yutong, Sinotruk, Light Vehicle) into the Financial Inventory System 
 * to ensure that PO grids and GRNs can select vehicles out-of-the-box without manual entry.
 */
export const syncBusCategoriesToItems = async (companyId: string) => {
  try {
    if (!companyId) throw new Error("Company ID is required to sync inventory.");

    // 1. Fetch current company name to isolate syncs
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();
    
    const companyName = (company?.name || "").toLowerCase();

    // 2. Fetch active bus models ONLY for the relevant company
    let allModels: any[] = [];

    // Temporary cleanup: Remove wrongly synced models from the wrong companies 
    // to free up the global unique constraint for the correct company.
    if (companyName.includes("yutong")) {
      const { data } = await supabase.from("yutong_bus_models").select("*").eq("is_active", true);
      allModels = (data || []).map(m => ({ ...m, prefix: 'YUT' }));
      // Cleanup SNT/LV from Yutong
      await supabase.from("items").delete().eq("company_id", companyId).like("item_code", "SNT-%");
      await supabase.from("items").delete().eq("company_id", companyId).like("item_code", "LV-%");
    } else if (companyName.includes("sinotruk") || companyName.includes("sinotruck")) {
      const { data } = await supabase.from("sinotruck_truck_models").select("*").eq("is_active", true);
      allModels = (data || []).map(m => ({ ...m, prefix: 'SNT' }));
      // Cleanup YUT/LV from Sinotruk
      await supabase.from("items").delete().eq("company_id", companyId).like("item_code", "YUT-%");
      await supabase.from("items").delete().eq("company_id", companyId).like("item_code", "LV-%");
      // Also delete any SNT models that were wrongly inserted into Yutong previously to free the global constraint
      await supabase.from("items").delete().neq("company_id", companyId).like("item_code", "SNT-%");
    } else if (companyName.includes("light") || companyName.includes("lv")) {
      const { data } = await supabase.from("lightvehicle_models").select("*").eq("is_active", true);
      allModels = (data || []).map(m => ({ ...m, prefix: 'LV' }));
      await supabase.from("items").delete().eq("company_id", companyId).like("item_code", "YUT-%");
      await supabase.from("items").delete().eq("company_id", companyId).like("item_code", "SNT-%");
      await supabase.from("items").delete().neq("company_id", companyId).like("item_code", "LV-%");
    } else {
      // If it's a master company, sync everything
      const yutongPromise = supabase.from("yutong_bus_models").select("*").eq("is_active", true);
      const sinotrukPromise = supabase.from("sinotruck_truck_models").select("*").eq("is_active", true);
      const lightVehiclePromise = supabase.from("lightvehicle_models").select("*").eq("is_active", true);
      const [yutongRes, sinotrukRes, lvRes] = await Promise.all([yutongPromise, sinotrukPromise, lightVehiclePromise]);
      allModels = [
        ...(yutongRes.data || []).map(m => ({ ...m, prefix: 'YUT' })),
        ...(sinotrukRes.data || []).map(m => ({ ...m, prefix: 'SNT' })),
        ...(lvRes.data || []).map(m => ({ ...m, prefix: 'LV' }))
      ];
    }

    if (allModels.length === 0) {
      return { success: true, count: 0, message: "No active vehicle models found for this specific company brand." };
    }

    // 2. Fetch or Create a Master "Fleet Vehicles" Item Category
    let categoryId = null;
    const { data: existingCat } = await supabase
      .from("item_categories")
      .select("id")
      .eq("company_id", companyId)
      .eq("category_code", "VEH-MAT")
      .single();

    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      const { data: newCat, error: insertCatError } = await supabase
        .from("item_categories")
        .insert([{
          company_id: companyId,
          category_code: "VEH-MAT",
          category_name: "Fleet Vehicles & Buses",
          valuation_method: "fifo", // default tracking
          is_active: true
        }])
        .select("id")
        .single();

      if (!insertCatError && newCat) {
        categoryId = newCat.id;
      }
    }

    // 3. Prepare Items Payload
    const itemsToUpsert = allModels.map(model => {
      // Create a deterministic item code like YUT-ZK6129H-A1B2
      // Strip out spaces just in case model name is weird, and append short ID to prevent 
      // deduplication of models that share the exact same model_name but have different specs.
      const cleanModelName = (model.model_name || model.bus_name || "UNKNOWN").replace(/\s+/g, '-').toUpperCase();
      const shortId = model.id ? model.id.toString().substring(0, 4).toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${model.prefix}-${cleanModelName}-${shortId}`;
      
      return {
        company_id: companyId,
        item_code: code,
        item_name: model.bus_name || model.model_name || "Unknown Bus",
        description: `Brand: ${model.prefix} | Capacity: ${model.capacity || 'N/A'} | Engine: ${model.engine || 'N/A'}`,
        item_type: "vehicle", // Classify distinctly from standard 'product'
        category_id: categoryId,
        is_active: true,
        // Carry over base pricing info if available for purchasing defaults
        last_purchase_price: model.base_price || 0,
        selling_price: model.base_price || 0,
        is_batch_tracked: false,
        is_serialized: true, // Vehicles are inherently serialized via chassis/plate
      };
    });

    // 4. Check for existing items GLOBALLY since item_code has a global unique constraint
    const itemCodes = itemsToUpsert.map(i => i.item_code);
    
    // Deduplicate the payload itself in case sales tables have duplicate model names
    const uniqueItemsToUpsert = [];
    const seenCodesInPayload = new Set();
    for (const item of itemsToUpsert) {
      if (!seenCodesInPayload.has(item.item_code)) {
        seenCodesInPayload.add(item.item_code);
        uniqueItemsToUpsert.push(item);
      }
    }

    const { data: existingItems } = await supabase
      .from("items")
      .select("item_code")
      .in("item_code", itemCodes); // Global check, no company_id filter

    const existingCodes = new Set((existingItems || []).map(i => i.item_code));
    
    const newItems = uniqueItemsToUpsert.filter(i => !existingCodes.has(i.item_code));

    if (newItems.length === 0) {
      return { 
        success: true, 
        count: 0, 
        message: "All vehicle models are already synced into inventory." 
      };
    }

    // Insert only the new ones
    const { error: insertError } = await supabase
      .from("items")
      .insert(newItems);

    if (insertError) {
      console.error("Failed to sync items:", insertError);
      throw new Error(`Failed to map items: ${insertError.message}`);
    }

    return { 
      success: true, 
      count: newItems.length, 
      message: `Successfully synchronized ${newItems.length} vehicle models into inventory.` 
    };
  } catch (error: any) {
    console.error("Bus Category Sync Error:", error);
    return { success: false, error: error.message };
  }
};
