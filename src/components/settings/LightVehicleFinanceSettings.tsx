import React from 'react';
import { VehicleFinanceSettingsBase } from './VehicleFinanceSettingsBase';

export function LightVehicleFinanceSettings() {
  return (
    <VehicleFinanceSettingsBase
      module="lightvehicle"
      title="Light Vehicle Sales Finance Settings"
      description="Configure GL account mappings and automation settings for Light Vehicle sales finance integration"
    />
  );
}
