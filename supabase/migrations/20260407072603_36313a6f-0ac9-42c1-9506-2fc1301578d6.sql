
DO $$
DECLARE
  fake_ids uuid[] := ARRAY[
    '8783665c-a3f8-4ba4-9131-7c5ccc2cbb1c',
    '642d3220-2c67-4871-a54f-5cdecfac2c13',
    '75ddc8c5-a553-4492-8b0e-b02548628076',
    '0ca11720-9b14-4655-9fc4-171d1c7b937e',
    '17e9f61b-67b0-4224-a445-3c92fdc9435e',
    'b45b224a-d4ff-4669-a8e0-998aa9beb0c6',
    '05de94ae-ad6b-4c51-8f49-1849b3eed345',
    '44c4283b-7aa8-414e-a769-499792eeaea0'
  ];
BEGIN
  DELETE FROM daily_trips WHERE bus_id = ANY(fake_ids);
  DELETE FROM daily_bus_expenses WHERE bus_id = ANY(fake_ids);
  DELETE FROM daily_cash_settlements WHERE bus_id = ANY(fake_ids);
  DELETE FROM fleet_master_roster WHERE bus_id = ANY(fake_ids);
  DELETE FROM bus_service_alerts WHERE bus_id = ANY(fake_ids);
  DELETE FROM maintenance_records WHERE bus_id = ANY(fake_ids);
  DELETE FROM route_permits WHERE bus_id = ANY(fake_ids);
  DELETE FROM insurance_records WHERE bus_id = ANY(fake_ids);
  DELETE FROM special_hire_projects WHERE bus_id = ANY(fake_ids);
  DELETE FROM real_time_tracking WHERE bus_id = ANY(fake_ids);
  DELETE FROM driver_allocations WHERE bus_id = ANY(fake_ids);
  DELETE FROM route_expenses WHERE bus_id = ANY(fake_ids);
  DELETE FROM bus_loans WHERE bus_id = ANY(fake_ids);
  DELETE FROM journal_entry_lines WHERE bus_id = ANY(fake_ids);
  DELETE FROM bus_tyres WHERE bus_id = ANY(fake_ids);
  DELETE FROM tyre_rotation_history WHERE bus_id = ANY(fake_ids);
  DELETE FROM tyre_inspection_records WHERE bus_id = ANY(fake_ids);
  DELETE FROM fuel_consumption_logs WHERE bus_id = ANY(fake_ids);
  DELETE FROM fuel_alerts WHERE bus_id = ANY(fake_ids);
  DELETE FROM bus_fuel_readings WHERE bus_id = ANY(fake_ids);
  DELETE FROM driver_behavior_events WHERE bus_id = ANY(fake_ids);
  DELETE FROM safety_alerts WHERE bus_id = ANY(fake_ids);
  DELETE FROM gps_location_history WHERE bus_id = ANY(fake_ids);
  DELETE FROM completed_trips WHERE bus_id = ANY(fake_ids);
  DELETE FROM fleet_analytics_daily WHERE bus_id = ANY(fake_ids);
  DELETE FROM bus_daily_mileage WHERE bus_id = ANY(fake_ids);
  DELETE FROM bus_api_connections WHERE bus_id = ANY(fake_ids);
  DELETE FROM ar_invoices WHERE bus_id = ANY(fake_ids);
  DELETE FROM ap_invoices WHERE bus_id = ANY(fake_ids);
  DELETE FROM expense_requests WHERE bus_id = ANY(fake_ids);

  DELETE FROM buses WHERE id = ANY(fake_ids);
END $$;
